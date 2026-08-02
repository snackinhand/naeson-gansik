import fs from "fs";
import path from "path";

const STATE_PATH = path.join(process.cwd(), ".coupang-rate-limit.json");
const WINDOW_MS = 60 * 60 * 1000;

/**
 * 쿠팡 검색 API의 실제 운영 제한은 "시간당 10회, 3회 초과 시 파트너스 계정 자체가
 * API 사용 정지"다. 공식 문서(분당 50회)와 실제 운영 정책이 달라 절대 그 숫자를
 * 믿지 말고, 여기서 한 단계 낮춘 안전 한도로 물리적으로 호출을 막는다.
 */
export const SAFE_CALLS_PER_HOUR = 9;

function loadTimestamps(): number[] {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function saveTimestamps(timestamps: number[]) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(timestamps));
}

/**
 * 호출 직전에 반드시 실행. 최근 1시간 내 호출 수가 안전 한도 이상이면
 * 예외를 던져서 실제 쿠팡 API 요청 자체가 나가지 않게 막는다(대기/재시도 없음 —
 * 안전 한도에 닿으면 스크립트를 그냥 멈추는 쪽이 몇 시간 동안 잠자기보다 안전하다).
 */
export function assertWithinRateLimit(): void {
  const now = Date.now();
  const recent = loadTimestamps().filter((t) => now - t < WINDOW_MS);

  if (recent.length >= SAFE_CALLS_PER_HOUR) {
    const resumeAt = new Date(recent[0] + WINDOW_MS);
    throw new Error(
      `쿠팡 검색 API 안전 호출 한도(시간당 ${SAFE_CALLS_PER_HOUR}회)에 도달해 호출을 막았습니다. ` +
        `${resumeAt.toISOString()} 이후 다시 시도하세요. ` +
        `(실제 쿠팡 제한은 시간당 10회이며, 3회 초과 시 파트너스 계정 자체가 제한될 수 있습니다.)`
    );
  }

  recent.push(now);
  saveTimestamps(recent);
}
