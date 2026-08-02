import fs from "fs";
import path from "path";
import { searchProducts, itemKey, parseQuantity, type CoupangProduct } from "../lib/coupang";

try {
  process.loadEnvFile(path.join(process.cwd(), ".env.local"));
} catch {
  // ignore
}

const STORE_PATH = path.join(process.cwd(), "data", "store-prices.json");
const PROGRESS_PATH = path.join(process.cwd(), "data", ".match-progress.json");
const MIN_REPORT_MARGIN = 15;

interface StoreItem {
  category: string;
  name: string;
  price: number;
}

interface Candidate {
  barcode: string;
  storeName: string;
  storePrice: number;
  product: CoupangProduct;
  quantity: number;
  unitPrice: number;
  marginRate: number;
  score: number;
}

interface Progress {
  processedBarcodes: string[];
  candidates: Candidate[];
  noMatch: string[];
}

function normalize(s: string): string {
  return s.replace(/[0-9]/g, "").replace(/[^가-힣a-zA-Z]/g, "").toLowerCase();
}

function tokenOverlapScore(storeName: string, productName: string): number {
  const tokens = storeName.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;
  const normalizedProduct = normalize(productName);
  const matched = tokens.filter((t) => normalizedProduct.includes(normalize(t)));
  return matched.length / tokens.length;
}

function loadProgress(): Progress {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_PATH, "utf-8"));
  } catch {
    return { processedBarcodes: [], candidates: [], noMatch: [] };
  }
}

function saveProgress(p: Progress) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(p, null, 2));
}

function isRateLimitGuard(err: unknown): boolean {
  return err instanceof Error && err.message.includes("안전 호출 한도");
}

async function main() {
  const store: Record<string, StoreItem> = JSON.parse(
    fs.readFileSync(STORE_PATH, "utf-8")
  );
  const progress = loadProgress();
  const processedSet = new Set(progress.processedBarcodes);
  const remaining = Object.entries(store).filter(([barcode]) => !processedSet.has(barcode));

  if (remaining.length === 0) {
    console.log(
      "모든 상품을 이미 처리했습니다. 다시 처음부터 돌리려면 data/.match-progress.json을 삭제하세요.\n"
    );
    printReport(progress.candidates, progress.noMatch.length);
    return;
  }

  console.log(
    `쿠팡 검색 API는 시간당 안전 한도(9회)가 있어 한 번 실행에 최대 9개까지만 처리합니다.\n` +
      `남은 상품: ${remaining.length}개. 한도에 도달하면 자동으로 멈추고, 다음에 다시 실행하면 이어서 처리됩니다.\n`
  );

  let processedThisRun = 0;

  for (const [barcode, item] of remaining) {
    let products: CoupangProduct[];
    try {
      products = await searchProducts(item.name, 5);
    } catch (err) {
      if (isRateLimitGuard(err)) {
        console.log(
          `\n안전 한도에 도달해 중단합니다. 이번 실행에서 ${processedThisRun}개 처리했습니다.`
        );
        break;
      }
      progress.noMatch.push(`${item.name} (검색 실패: ${(err as Error).message})`);
      progress.processedBarcodes.push(barcode);
      saveProgress(progress);
      processedThisRun++;
      continue;
    }

    let best: { product: CoupangProduct; score: number; quantity: number; unitPrice: number } | null = null;
    for (const p of products) {
      const score = tokenOverlapScore(item.name, p.productName);
      const quantity = parseQuantity(p.productName);
      const unitPrice = Math.round(p.productPrice / quantity);
      if (!best || score > best.score) {
        best = { product: p, score, quantity, unitPrice };
      }
    }

    if (best && best.score >= 0.5) {
      const marginRate = Math.round(
        ((item.price - best.unitPrice) / item.price) * 100
      );
      if (marginRate >= MIN_REPORT_MARGIN) {
        progress.candidates.push({
          barcode,
          storeName: item.name,
          storePrice: item.price,
          product: best.product,
          quantity: best.quantity,
          unitPrice: best.unitPrice,
          marginRate,
          score: best.score,
        });
      }
    } else {
      progress.noMatch.push(`${item.name} (매칭 실패)`);
    }

    progress.processedBarcodes.push(barcode);
    saveProgress(progress);
    processedThisRun++;
  }

  console.log(
    `\n전체 진행: ${progress.processedBarcodes.length}/${Object.keys(store).length}\n`
  );
  printReport(progress.candidates, progress.noMatch.length);
}

function printReport(candidates: Candidate[], noMatchCount: number) {
  const sorted = [...candidates].sort((a, b) => b.marginRate - a.marginRate);
  console.log(`=== 매칭 후보 (마진율 ${MIN_REPORT_MARGIN}% 이상, 누적 ${sorted.length}건) ===\n`);
  sorted.forEach((c, i) => {
    console.log(
      `${i + 1}. [매장가 ${c.storePrice.toLocaleString()}원] ${c.storeName}\n` +
        `   -> 쿠팡: ${c.product.productName} (${c.quantity}개, 개당 ${c.unitPrice.toLocaleString()}원) | 마진 ${c.marginRate}% | 일치도 ${(c.score * 100).toFixed(0)}%\n` +
        `   id: ${itemKey(c.product)}\n`
    );
  });
  console.log(`\n누적 매칭 실패/검색 실패: ${noMatchCount}건`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
