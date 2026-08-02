import fs from "fs";
import path from "path";
import { collectPriceSnapshots, today } from "../lib/priceHistory";
import { itemKey, parseQuantity } from "../lib/coupang";
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
/** 이 마진율(%) 이상인 상품만 리스팅한다. */
const MIN_MARGIN_RATE = 20;

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

async function main() {
  const results = await collectPriceSnapshots();

  const referencePrices = readJson<ReferencePrices>(REFERENCE_PATH);
  const excludedIds = new Set(readJson<string[]>(EXCLUDED_PATH));
  const overrides = readJson<Overrides>(OVERRIDES_PATH);

  const candidates = new Map<string, Deal>();
  const unregistered = new Map<string, { title: string; unitPrice: number; quantity: number }>();

  for (const { category, product } of results) {
    const id = itemKey(product);
    if (excludedIds.has(id)) continue;

    const reference = referencePrices[id];
    if (!reference) {
      const quantity = parseQuantity(product.productName);
      unregistered.set(id, {
        title: product.productName,
        unitPrice: Math.round(product.productPrice / quantity),
        quantity,
      });
      continue;
    }

    const quantity = parseQuantity(product.productName);
    const unitPrice = Math.round(product.productPrice / quantity);
    const marginRate = Math.round(
      ((reference.referencePrice - unitPrice) / reference.referencePrice) * 100
    );
    if (marginRate < MIN_MARGIN_RATE) continue;

    const deal: Deal = {
      id,
      title: product.productName,
      image: product.productImage,
      category: category as Deal["category"],
      price: product.productPrice,
      quantity,
      unitPrice,
      marginRate,
      isRocket: product.isRocket,
      url: product.productUrl,
      updatedAt: today(),
    };

    candidates.set(id, { ...deal, ...overrides[id] });
  }

  const published = Array.from(candidates.values())
    .sort((a, b) => b.marginRate - a.marginRate)
    .slice(0, MAX_PUBLISHED);

  fs.writeFileSync(DEALS_PATH, JSON.stringify(published, null, 2) + "\n");

  console.log(`\n${published.length}개 상품을 data/deals.json에 자동 발행했습니다. (최소 마진율 ${MIN_MARGIN_RATE}%)`);

  if (unregistered.size > 0) {
    console.log(
      `\n소비자가(개당)가 없어 제외된 상품 ${unregistered.size}건. ` +
        `마진 계산에 포함시키려면 data/reference-prices.json에 "개당 소비자가"를 아래 형식으로 추가하세요:\n`
    );
    unregistered.forEach(({ title, unitPrice, quantity }, id) => {
      console.log(
        `"${id}": { "title": "${title}", "referencePrice": 0 }, // 쿠팡 개당가 ${unitPrice.toLocaleString()}원 (${quantity}개 구성)`
      );
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
