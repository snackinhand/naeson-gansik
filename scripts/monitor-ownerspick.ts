import fs from "fs";
import path from "path";
import { OWNERSPICK_CATEGORIES, fetchRefreshLabel } from "../lib/ownerspick";
import { sendTelegramAlert } from "../lib/notify";

try {
  process.loadEnvFile(path.join(process.cwd(), ".env.local"));
} catch {
  // .env.local이 없으면 무시 (실제 환경변수가 이미 주입된 CI 등의 상황 대비)
}

const STATE_PATH = path.join(process.cwd(), "data", "ownerspick-watch.json");

/** 카테고리별로, 직전 실행 시점에 확인한 "실시간 갱신" 라벨. */
type WatchState = Record<string, string>;

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

  for (const category of OWNERSPICK_CATEGORIES) {
    let label: string;
    try {
      label = await fetchRefreshLabel(category.url);
    } catch (err) {
      console.error(`[${category.name}] 확인 실패: ${(err as Error).message}`);
      continue;
    }

    const previous = state[category.name];
    console.log(`[${category.name}] 이전 ${previous ?? "(없음)"} / 현재 ${label}`);

    // 최초 실행이면 기준값만 기록하고 알림은 보내지 않는다.
    if (previous !== undefined && previous !== label) {
      const sent = await sendTelegramAlert({
        title: `오너스픽 ${category.name} 핫딜 갱신`,
        message: `${previous} -> ${label}`,
        url: category.url,
      });
      console.log(`  -> 알림 ${sent ? "전송" : "전송 실패"}`);
    }

    state[category.name] = label;
  }

  writeState(state);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
