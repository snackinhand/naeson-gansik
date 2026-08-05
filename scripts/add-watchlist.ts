import readline from "readline/promises";
import fs from "fs";
import path from "path";
import { searchProducts, itemKey, parseQuantity } from "../lib/coupang";
import type { Watchlist } from "../lib/types";

try {
  process.loadEnvFile(path.join(process.cwd(), ".env.local"));
} catch {
  // .env.local이 없으면 무시
}

const WATCHLIST_PATH = path.join(process.cwd(), "data", "watchlist.json");
const MAX_WATCHLIST_SIZE = 6;

function loadWatchlist(): Watchlist {
  return JSON.parse(fs.readFileSync(WATCHLIST_PATH, "utf-8"));
}

function saveWatchlist(watchlist: Watchlist) {
  fs.writeFileSync(WATCHLIST_PATH, JSON.stringify(watchlist, null, 2) + "\n");
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const watchlist = loadWatchlist();

  console.log(
    `마진 급등 감시 워치리스트에 상품을 등록합니다. (현재 ${watchlist.length}/${MAX_WATCHLIST_SIZE}개)\n` +
      `쿠팡 검색 API 시간당 안전 호출 한도를 지키기 위해 최대 ${MAX_WATCHLIST_SIZE}개까지만 등록할 수 있습니다.\n` +
      `검색어에 'q'를 입력하면 종료합니다.\n`
  );

  while (true) {
    if (watchlist.length >= MAX_WATCHLIST_SIZE) {
      console.log(
        `이미 ${MAX_WATCHLIST_SIZE}개가 등록되어 있습니다. 새로 추가하려면 기존 항목을 먼저 지워주세요.\n`
      );
      break;
    }

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
      const registered = watchlist.some((w) => w.id === itemKey(p)) ? " [등록됨]" : "";
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
    const id = itemKey(product);

    const priceInput = (
      await rl.question(`"${product.productName}"의 개당 소비자가(마진 계산 기준, 원): `)
    ).trim();
    const consumerPrice = parseInt(priceInput.replace(/[^0-9]/g, ""), 10);
    if (!consumerPrice || consumerPrice <= 0) {
      console.log("올바른 가격이 아닙니다.\n");
      continue;
    }

    const quantity = parseQuantity(product.productName);
    const unitPrice = Math.round(product.productPrice / quantity);
    const marginRate = Math.round(((consumerPrice - unitPrice) / consumerPrice) * 100);
    console.log(`현재 마진율: ${marginRate}% (개당 ${unitPrice.toLocaleString()}원 기준)\n`);

    const next = watchlist.filter((w) => w.id !== id);
    next.push({
      id,
      title: product.productName,
      keyword,
      consumerPrice,
      url: product.productUrl,
      registeredAt: today(),
    });
    saveWatchlist(next);
    watchlist.length = 0;
    watchlist.push(...next);

    console.log(`저장했습니다: ${id} (${watchlist.length}/${MAX_WATCHLIST_SIZE})\n`);
  }

  rl.close();
  console.log("종료합니다. git add/commit/push까지 해야 GitHub Actions 추적에 반영됩니다.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
