import fs from "fs";
import path from "path";
import { searchProducts, itemKey, type CoupangProduct } from "./coupang";
import type { PriceHistory } from "./types";

const HISTORY_PATH = path.join(process.cwd(), "data", "price-history.json");
const KEYWORDS_PATH = path.join(process.cwd(), "data", "tracked-keywords.json");

export interface TrackedKeyword {
  keyword: string;
  category: string;
}

export interface PriceSnapshotResult {
  keyword: string;
  category: string;
  product: CoupangProduct;
  allTimeLow: number;
  avg30d: number;
  discountVsAvg: number;
  isAllTimeLow: boolean;
}

function loadHistory(): PriceHistory {
  return JSON.parse(fs.readFileSync(HISTORY_PATH, "utf-8"));
}

function saveHistory(history: PriceHistory) {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2) + "\n");
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 추적 키워드 목록으로 쿠팡 상품을 검색하고 price-history.json에 오늘자 스냅샷을 append한다.
 * fetch-prices.ts(사람이 훑어보는 후보 출력)와 auto-publish.ts(자동 발행)가 공유하는 데이터 수집 단계.
 */
export async function collectPriceSnapshots(): Promise<PriceSnapshotResult[]> {
  const keywords: TrackedKeyword[] = JSON.parse(
    fs.readFileSync(KEYWORDS_PATH, "utf-8")
  );
  const history = loadHistory();
  const results: PriceSnapshotResult[] = [];

  for (const { keyword, category } of keywords) {
    console.log(`\n조회 중: ${keyword}`);
    let products: CoupangProduct[];
    try {
      products = await searchProducts(keyword, 10);
    } catch (err) {
      console.error(`  실패: ${(err as Error).message}`);
      continue;
    }

    products.forEach((product) => {
      const id = itemKey(product);
      const snapshots = history[id] ?? [];
      snapshots.push({ date: today(), price: product.productPrice });
      history[id] = snapshots;

      const prices = snapshots.map((s) => s.price);
      const allTimeLow = Math.min(...prices);
      const last30 = snapshots.slice(-30);
      const avg30d = Math.round(
        last30.reduce((sum, s) => sum + s.price, 0) / last30.length
      );
      const isAllTimeLow = product.productPrice <= allTimeLow;
      const discountVsAvg = Math.round(
        ((avg30d - product.productPrice) / avg30d) * 100
      );

      results.push({
        keyword,
        category,
        product,
        allTimeLow,
        avg30d,
        discountVsAvg,
        isAllTimeLow,
      });
    });
  }

  saveHistory(history);
  return results;
}
