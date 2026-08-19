import fs from "fs";
import path from "path";
import { searchAccatoy } from "../lib/accatoy";
import { sendTelegramAlert } from "../lib/notify";

try {
  process.loadEnvFile(path.join(process.cwd(), ".env.local"));
} catch {
  // .env.local이 없으면 무시 (실제 환경변수가 이미 주입된 CI 등의 상황 대비)
}

const KEYWORDS = ["포켓몬카드", "원피스", "왁뿌"];
const STATE_PATH = path.join(process.cwd(), "data", "accatoy-watch.json");

/** 키워드별로, 직전 실행 시점에 "품절 아님" 상태였던 상품 id 목록. */
type WatchState = Record<string, string[]>;

function readState(): WatchState {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function writeState(state: WatchState) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n");
}

async function main() {
  const state = readState();

  for (const keyword of KEYWORDS) {
    let products;
    try {
      products = await searchAccatoy(keyword);
    } catch (err) {
      console.error(`[${keyword}] 검색 실패: ${(err as Error).message}`);
      continue;
    }

    // 품절 상품은 애초에 감시 대상에서 제외한다.
    const active = products.filter((p) => !p.soldOut);
    const knownIds = new Set(state[keyword] ?? []);
    const newOnes = active.filter((p) => !knownIds.has(p.id));

    console.log(`[${keyword}] 판매중 ${active.length}개 / 신규 ${newOnes.length}개`);

    for (const p of newOnes) {
      const priceText = p.price ? `\n${p.price.toLocaleString()}원` : "";
      const sent = await sendTelegramAlert({
        title: `아카토이 신규 등록: ${keyword}`,
        message: `${p.name}${priceText}`,
        url: p.url,
      });
      console.log(`  -> ${p.name} ${sent ? "알림 전송" : "알림 전송 실패"}`);
    }

    // 다음 실행 시 비교 기준이 되므로, 현재 판매중인 상품 목록으로 갱신한다.
    // (품절된 상품은 여기서 자연히 빠지고, 재입고되면 다시 "신규"로 감지된다.)
    state[keyword] = active.map((p) => p.id);
  }

  writeState(state);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
