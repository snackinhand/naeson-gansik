import fs from "fs";
import path from "path";
import { collectPriceSnapshots, today } from "../lib/priceHistory";
import { itemKey } from "../lib/coupang";
import type { Deal, ReferencePrices, Overrides } from "../lib/types";

try {
  process.loadEnvFile(path.join(process.cwd(), ".env.local"));
} catch {
  // .env.local이 없으면 무시 (실제 환경변수가 이미 주입된 CI 등의 상황 대비)
}

const REFERENCE_PATH = path.join(process.cwd(), "data", "reference-prices.json");
const EXCLUDED_PATH = path.join(process.cwd(), "data", "excluded-ids.json");
const OVERRIDES_PATH = path.join(process.cwd(), "data", "overrides.json");
const DEALS_PATH = path.join(process.cwd(), "data", "deals.json");

const MAX_PUBLISHED = 30;

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

async function main() {
  const results = await collectPriceSnapshots();

  const referencePrices = readJson<ReferencePrices>(REFERENCE_PATH);
  const excludedIds = new Set(readJson<string[]>(EXCLUDED_PATH));
  const overrides = readJson<Overrides>(OVERRIDES_PATH);

  const candidates = new Map<string, Deal>();
  const unregistered = new Map<string, { title: string; price: number }>();

  for (const { category, product } of results) {
    const id = itemKey(product);
    if (excludedIds.has(id)) continue;

    const reference = referencePrices[id];
    if (!reference) {
      unregistered.set(id, { title: product.productName, price: product.productPrice });
      continue;
    }

    const marginRate = Math.round(
      ((reference.referencePrice - product.productPrice) / reference.referencePrice) * 100
    );
    if (marginRate <= 0) continue;

    const deal: Deal = {
      id,
      title: product.productName,
      image: product.productImage,
      category: category as Deal["category"],
      price: product.productPrice,
      originalPrice: reference.referencePrice,
      discountRate: marginRate,
      isAllTimeLow: false,
      url: product.productUrl,
      updatedAt: today(),
    };

    candidates.set(id, { ...deal, ...overrides[id] });
  }

  const published = Array.from(candidates.values())
    .sort((a, b) => b.discountRate - a.discountRate)
    .slice(0, MAX_PUBLISHED);

  fs.writeFileSync(DEALS_PATH, JSON.stringify(published, null, 2) + "\n");

  console.log(`\n${published.length}개 상품을 data/deals.json에 자동 발행했습니다.`);

  if (unregistered.size > 0) {
    console.log(
      `\n레퍼런스 가격(오프라인 소비자가)이 없어 제외된 상품 ${unregistered.size}건. ` +
        `마진 계산에 포함시키려면 data/reference-prices.json에 아래 형식으로 추가하세요:\n`
    );
    unregistered.forEach(({ title, price }, id) => {
      console.log(
        `"${id}": { "title": "${title}", "referencePrice": 0 }, // 현재 쿠팡가 ${price.toLocaleString()}원`
      );
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
