import crypto from "crypto";

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
  const authorization = buildAuthHeader(method, pathWithQuery);

  const res = await fetch(`${DOMAIN}${pathWithQuery}`, {
    method,
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json;charset=UTF-8",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`쿠팡 API 요청 실패 (${res.status}): ${text}`);
  }

  return res.json() as Promise<T>;
}

export interface CoupangProduct {
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
    productData: CoupangProduct[];
  };
}

export async function searchProducts(
  keyword: string,
  limit = 20
): Promise<CoupangProduct[]> {
  const query = `keyword=${encodeURIComponent(keyword)}&limit=${limit}`;
  const path = `/v2/providers/affiliate_open_api/apis/openapi/products/search?${query}`;
  const res = await request<ProductSearchResponse>("GET", path);
  return res.data.productData;
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
