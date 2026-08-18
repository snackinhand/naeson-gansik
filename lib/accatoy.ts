const BASE_URL = "https://accatoy.com";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
/** 무한 루프 방지용 안전장치. 키워드 하나가 이보다 많은 페이지를 가진 적은 없었다. */
const MAX_PAGES = 5;

export type AccatoyProduct = {
  id: string;
  name: string;
  price: number | null;
  soldOut: boolean;
  url: string;
};

function extractProducts(html: string): AccatoyProduct[] {
  const products: AccatoyProduct[] = [];

  // 상품 목록 구간만 잘라낸다. 이 구간 안에는 상품 li마다 가격을 표시하는
  // 내부 <ul>(spec)도 있어서, li 경계를 "</li>...(다음 li 또는 </ul>)"로 잡으면
  // 그 내부 </ul>에서 먼저 멈춰버려 품절 아이콘(icon div)이 잘려나간다.
  // 그래서 목록 구간을 "다음 상품 anchor 시작 지점" 기준으로만 자른다.
  const listStart = html.indexOf('class="prdList');
  if (listStart === -1) return products;
  const pagingStart = html.indexOf("xans-search-paging", listStart);
  const listSection = html.slice(listStart, pagingStart === -1 ? undefined : pagingStart);

  const anchorRegex = /<li id="anchorBoxId_(\d+)" class="xans-record-">/g;
  const anchors: { id: string; start: number }[] = [];
  let anchorMatch: RegExpExecArray | null;
  while ((anchorMatch = anchorRegex.exec(listSection))) {
    anchors.push({ id: anchorMatch[1], start: anchorMatch.index });
  }

  for (let i = 0; i < anchors.length; i++) {
    const { id, start } = anchors[i];
    const end = i + 1 < anchors.length ? anchors[i + 1].start : listSection.length;
    const block = listSection.slice(start, end);

    const nameMatch = block.match(
      /<strong class="name">[\s\S]*?<a[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span><\/a>/
    );
    const name = nameMatch ? nameMatch[1].trim() : "(상품명 파싱 실패)";

    // 소비자가, 판매가 순으로 나오므로 마지막 "N원"이 실제 판매가다.
    const priceMatches = [...block.matchAll(/([\d,]+)원/g)];
    const price =
      priceMatches.length > 0
        ? parseInt(priceMatches[priceMatches.length - 1][1].replace(/,/g, ""), 10)
        : null;

    const soldOut = block.includes("ico_product_soldout.gif");

    products.push({
      id,
      name,
      price,
      soldOut,
      url: `${BASE_URL}/product/detail.html?product_no=${id}`,
    });
  }

  return products;
}

/** 키워드로 아카토이 상품을 검색한다 (전 페이지 순회, 중복 id 제거). */
export async function searchAccatoy(keyword: string): Promise<AccatoyProduct[]> {
  const all: AccatoyProduct[] = [];
  const seenIds = new Set<string>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${BASE_URL}/product/search.html?keyword=${encodeURIComponent(keyword)}&page=${page}`;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });

    if (!res.ok) {
      throw new Error(`아카토이 검색 실패 (${res.status}): ${keyword}`);
    }

    const html = await res.text();
    const products = extractProducts(html);
    if (products.length === 0) break;

    for (const p of products) {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        all.push(p);
      }
    }
  }

  return all;
}
