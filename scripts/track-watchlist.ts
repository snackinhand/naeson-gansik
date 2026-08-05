import fs from "fs";
import path from "path";
import { searchProducts, itemKey, parseQuantity, type CoupangProduct } from "../lib/coupang";
import { appendPriceSnapshot } from "../lib/priceHistory";
import type { Watchlist, MarginAlerts } from "../lib/types";

try {
  process.loadEnvFile(path.join(process.cwd(), ".env.local"));
} catch {
  // .env.local이 없으면 무시 (실제 환경변수가 이미 주입된 CI 등의 상황 대비)
}

const WATCHLIST_PATH = path.join(process.cwd(), "data", "watchlist.json");
const ALERTS_PATH = path.join(process.cwd(), "data", "margin-alerts.json");

/** 이 마진율(%) 이상으로 올라가면 알림을 보낸다. */
const ALERT_MARGIN_THRESHOLD = 30;
/** 같은 상품으로 반복 스팸이 안 되도록, 마지막 알림 이후 이 시간(ms) 동안은 다시 보내지 않는다. */
const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000;

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJson(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

function isRateLimitGuard(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message.includes("안전 호출 한도") || err.message.includes("쿨다운"))
  );
}

async function sendNtfyAlert(params: {
  title: string;
  message: string;
  url: string;
}): Promise<boolean> {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) {
    console.warn("NTFY_TOPIC이 설정되어 있지 않아 알림을 보내지 않습니다.");
    return false;
  }

  const res = await fetch("https://ntfy.sh/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic,
      title: params.title,
      message: params.message,
      priority: 4,
      tags: ["moneybag"],
      click: params.url,
    }),
  });

  if (!res.ok) {
    console.warn(`ntfy 알림 전송 실패 (${res.status}): ${await res.text()}`);
    return false;
  }
  return true;
}

async function main() {
  const watchlist = readJson<Watchlist>(WATCHLIST_PATH);
  const alerts = readJson<MarginAlerts>(ALERTS_PATH);

  if (watchlist.length === 0) {
    console.log("워치리스트가 비어 있습니다. scripts/add-watchlist.ts로 먼저 등록하세요.");
    return;
  }

  console.log(`워치리스트 ${watchlist.length}개 추적 시작\n`);

  for (const entry of watchlist) {
    let products: CoupangProduct[];
    try {
      products = await searchProducts(entry.keyword, 10);
    } catch (err) {
      if (isRateLimitGuard(err)) {
        console.log(`\n안전 한도/쿨다운에 걸려 중단합니다: ${(err as Error).message}`);
        break;
      }
      console.error(`[${entry.title}] 검색 실패: ${(err as Error).message}`);
      continue;
    }

    const product = products.find((p) => itemKey(p) === entry.id);
    if (!product) {
      console.log(`[${entry.title}] 검색 결과에서 동일 상품(${entry.id})을 찾지 못했습니다.`);
      continue;
    }

    appendPriceSnapshot(entry.id, product.productPrice);

    const quantity = entry.quantityOverride ?? parseQuantity(product.productName);
    const unitPrice = Math.round(product.productPrice / quantity);
    const marginRate = Math.round(
      ((entry.consumerPrice - unitPrice) / entry.consumerPrice) * 100
    );

    console.log(
      `[${entry.title}] 현재가 ${product.productPrice.toLocaleString()}원 / ` +
        `개당 ${unitPrice.toLocaleString()}원 / 마진 ${marginRate}%`
    );

    if (marginRate < ALERT_MARGIN_THRESHOLD) continue;

    const lastAlert = alerts[entry.id];
    const withinCooldown =
      lastAlert && Date.now() - new Date(lastAlert.lastAlertAt).getTime() < ALERT_COOLDOWN_MS;
    if (withinCooldown) {
      console.log(`  -> 마진 ${marginRate}%로 기준 이상이지만 쿨다운 중이라 알림 생략`);
      continue;
    }

    const sent = await sendNtfyAlert({
      title: `마진 급등: ${entry.title}`,
      message:
        `${entry.title}\n` +
        `현재가 ${product.productPrice.toLocaleString()}원 (개당 ${unitPrice.toLocaleString()}원)\n` +
        `마진율 ${marginRate}% (기준 ${ALERT_MARGIN_THRESHOLD}% 이상)`,
      url: entry.url,
    });

    if (sent) {
      alerts[entry.id] = { lastAlertAt: new Date().toISOString(), lastMarginRate: marginRate };
      console.log(`  -> 마진 ${marginRate}% 알림 전송`);
    } else {
      console.log(`  -> 마진 ${marginRate}%로 알림 기준 충족했지만 전송 실패 (쿨다운 미기록)`);
    }
  }

  writeJson(ALERTS_PATH, alerts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
