import readline from "readline/promises";
import fs from "fs";
import path from "path";
import { searchProducts, itemKey, parseQuantity } from "../lib/coupang";
import type { ReferencePrices } from "../lib/types";

try {
  process.loadEnvFile(path.join(process.cwd(), ".env.local"));
} catch {
  // .env.local이 없으면 무시
}

const REFERENCE_PATH = path.join(process.cwd(), "data", "reference-prices.json");

function loadReferences(): ReferencePrices {
  return JSON.parse(fs.readFileSync(REFERENCE_PATH, "utf-8"));
}

function saveReferences(data: ReferencePrices) {
  fs.writeFileSync(REFERENCE_PATH, JSON.stringify(data, null, 2) + "\n");
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const references = loadReferences();

  console.log("쿠팡 상품을 검색해서 개당 소비자가를 등록합니다.");
  console.log("검색어에 'q'를 입력하면 종료합니다.\n");

  while (true) {
    const keyword = (await rl.question("검색어: ")).trim();
    if (keyword.toLowerCase() === "q") break;
    if (!keyword) continue;

    let products;
    try {
      products = await searchProducts(keyword, 10);
    } catch (err) {
      console.error(`검색 실패: ${(err as Error).message}\n`);
      continue;
    }

    if (products.length === 0) {
      console.log("검색 결과가 없습니다.\n");
      continue;
    }

    products.forEach((p, i) => {
      const qty = parseQuantity(p.productName);
      const unitPrice = Math.round(p.productPrice / qty);
      const registered = references[itemKey(p)] ? " [등록됨]" : "";
      console.log(
        `${i + 1}. ${p.productName}${registered}\n` +
          `   ${p.productPrice.toLocaleString()}원 / ${qty}개 구성 = 개당 ${unitPrice.toLocaleString()}원`
      );
    });

    const pick = (await rl.question("\n등록할 번호 (건너뛰려면 엔터): ")).trim();
    if (!pick) {
      console.log();
      continue;
    }
    const idx = parseInt(pick, 10) - 1;
    if (Number.isNaN(idx) || idx < 0 || idx >= products.length) {
      console.log("잘못된 번호입니다.\n");
      continue;
    }
    const product = products[idx];

    const priceInput = (
      await rl.question(`"${product.productName}"의 개당 소비자가(원): `)
    ).trim();
    const referencePrice = parseInt(priceInput.replace(/[^0-9]/g, ""), 10);
    if (!referencePrice || referencePrice <= 0) {
      console.log("올바른 가격이 아닙니다.\n");
      continue;
    }

    const id = itemKey(product);
    references[id] = { title: product.productName, referencePrice };
    saveReferences(references);
    console.log(`저장했습니다: ${id} -> 개당 ${referencePrice.toLocaleString()}원\n`);
  }

  rl.close();
  console.log("종료합니다.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
