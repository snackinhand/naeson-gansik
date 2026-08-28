import path from "path";
import { sendTelegramAlert } from "../lib/notify";

try {
  process.loadEnvFile(path.join(process.cwd(), ".env.local"));
} catch {
  // .env.local이 없으면 무시 (실제 환경변수가 이미 주입된 CI 등의 상황 대비)
}

/**
 * 매시간 클라우드 헬스체크 루틴이 이 워크플로를 호출해서 상태 요약을 텔레그램으로 보낸다.
 * 알림이 안 오는 것 자체가 "뭔가 이상하다"는 신호가 되도록 항상 메시지를 보낸다.
 */
async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error("TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID가 설정되어 있지 않습니다.");
    process.exit(1);
  }

  const summary = process.env.STATUS_SUMMARY?.trim() || "특이사항 없음";
  const ok = process.env.STATUS_OK !== "false";

  const sent = await sendTelegramAlert({
    title: ok ? "✅ 모니터링 정상 동작 중" : "⚠️ 모니터링 문제 감지",
    message: summary,
    url: "https://github.com/snackinhand/naeson-gansik/actions",
  });

  if (!sent) {
    console.error("텔레그램 하트비트 메시지 전송 실패");
    process.exit(1);
  }
}

main();
