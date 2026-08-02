import crypto from "crypto";
import { assertWithinRateLimit, recordCooldownViolation } from "./rateLimit";

const DOMAIN = "https://api-gateway.coupang.com";

function getSignedDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const yy = String(d.getUTCFullYear()).slice(2);
  const MM = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const HH = pad(d.getUTCHours());
  const mm = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  return `${yy}${MM}${dd}T${HH}${mm}${ss}Z`;
}

function buildAuthHeader(method: string, pathWithQuery: string): string {
  const accessKey = process.env.COUPANG_ACCESS_KEY;
  const secretKey = process.env.COUPANG_SECRET_KEY;
  if (!accessKey || !secretKey) {
    throw new Error(
      "COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY가 설정되어 있지 않습니다. .env.local을 확인하세요."
    );
  }

  const [path, query = ""] = pathWithQuery.split("?");
  const signedDate = getSignedDate();
  const message = `${signedDate}${method}${path}${query}`;
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(message)
    .digest("hex");

  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${signedDate}, signature=${signature}`;
}

async function request<T>(method: string, pathWithQuery: string, body?: unknown): Promise<T> {
  // 쿠팡 검색 API 실제 운영 제한(시간당 10회, 3회 초과 시 계정 자체 제한)에
  // 절대 닿지 않도록 모든 API 호출은 여기를 반드시 통과한다.
  assertWithinRateLimit();

  const authorization = buildAuthHeader(method, pathWithQuery);

  const res = await fetch(`${DOMAIN}${pathWithQuery}`, {
    method,
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json;charset=UTF-8",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`쿠팡 API 요청 실패 (${res.status}): ${text}`);
  }

  let json: { rCode?: string; rMessage?: string };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`쿠팡 API 응답 파싱 실패: ${text}`);
  }

  // 쿠팡은 호출 제한 초과 같은 실제 오류도 HTTP 200으로 감싸서 rCode에만 담아 보낸다.
  // rCode가 성공("0")이 아니면 res.ok와 무관하게 반드시 여기서 걸러야 한다.
  if (json.rCode && json.rCode !== "0") {
    const message = json.rMessage ?? "";
    if (message.includes("시간당") || message.includes("초과")) {
      const timeMatch = message.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
      const until = timeMatch
        ? new Date(`${timeMatch[1]}Z`)
        : new Date(Date.now() + 2 * 60 * 60 * 1000);
      recordCooldownViolation(until, message);
    }
    throw new Error(`쿠팡 API 오류 (rCode ${json.rCode}): ${message}`);
  }

  return json as T;
}

export interface CoupangProduct {
  productId: number;
  productName: string;
  productImage: string;
  productPrice: number;
  productUrl: string;
  isRocket: boolean;
  isFreeShipping: boolean;
  /** productUrl에서 추출한 옵션(구성/용량) 단위 식별자. 같은 productId라도 itemId가 다르면 다른 구성이다. */
  itemId: string;
}

interface RawCoupangProduct {
  productId: number;
  productName: string;
  productImage: string;
  productPrice: number;
  productUrl: string;
  isRocket: boolean;
  isFreeShipping: boolean;
}

interface ProductSearchResponse {
  rCode: string;
  rMessage: string;
  data: {
    landingUrl: string;
    productData: RawCoupangProduct[];
  };
}

function extractItemId(productUrl: string): string {
  const match = productUrl.match(/[?&]itemId=([^&]+)/);
  return match ? match[1] : "0";
}

/** productId만으로는 같은 상품 페이지 안의 다른 구성(용량/수량)을 구분할 수 없어 itemId까지 합쳐 고유키로 쓴다. */
export function itemKey(product: Pick<CoupangProduct, "productId" | "itemId">): string {
  return `${product.productId}-${product.itemId}`;
}

/**
 * 상품명에서 구성 개수를 추정한다 (예: "밀키스 340ml, 24개" -> 24).
 * 표준화된 필드가 없어 텍스트 휴리스틱이므로 오검출 가능성이 있다 —
 * 잘못 파싱되면 data/overrides.json으로 quantity/unitPrice/marginRate를 직접 고정할 수 있다.
 */
export function parseQuantity(productName: string): number {
  const matches = [...productName.matchAll(/(\d+)\s*(개입|개|캔|병|봉|입)/g)];
  if (matches.length === 0) return 1;
  const n = parseInt(matches[matches.length - 1][1], 10);
  return n > 0 ? n : 1;
}

export async function searchProducts(
  keyword: string,
  limit = 20
): Promise<CoupangProduct[]> {
  const query = `keyword=${encodeURIComponent(keyword)}&limit=${limit}`;
  const path = `/v2/providers/affiliate_open_api/apis/openapi/products/search?${query}`;
  const res = await request<ProductSearchResponse>("GET", path);
  return res.data.productData.map((p) => ({
    ...p,
    itemId: extractItemId(p.productUrl),
  }));
}

interface DeeplinkResponse {
  rCode: string;
  rMessage: string;
  data: { originalUrl: string; shortenUrl: string; landingUrl: string }[];
}

/**
 * 이미 만들어진 쿠팡 상품/카테고리 URL(예: coupang.com 링크를 직접 복사해온 경우)을
 * 파트너스 추적 링크로 변환할 때만 사용. `searchProducts`가 반환하는 `productUrl`은
 * 이미 추적 링크(link.coupang.com/...)이므로 이 함수에 다시 넣으면 안 된다.
 */
export async function createDeeplinks(urls: string[]): Promise<string[]> {
  const path = `/v2/providers/affiliate_open_api/apis/openapi/deeplink`;
  const res = await request<DeeplinkResponse>("POST", path, { coupangUrls: urls });
  return res.data.map((d) => d.landingUrl);
}
