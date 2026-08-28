import path from "path";
import { sendTelegramAlert } from "../lib/notify";

try {
  process.loadEnvFile(path.join(process.cwd(), ".env.local"));
} catch {
  // .env.local이 없으면 무시 (실제 환경변수가 이미 주입된 CI 등의 상황 대비)
}

/**
 * 실제로 메시지를 보내지 않고 봇 토큰/채팅방 유효성만 조용히 검사한다.
 * 평소엔 텔레그램으로 아무 알림도 가지 않고, 문제가 있을 때만 경고 메시지를 보낸다.
 */
async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error("TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID가 설정되어 있지 않습니다.");
    process.exit(1);
  }

  const getMeRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const getChatRes = await fetch(
    `https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(chatId)}`
  );

  if (getMeRes.ok && getChatRes.ok) {
    console.log("텔레그램 봇 토큰/채팅방 정상. 알림 없이 종료합니다.");
    return;
  }

  const detail = [
    !getMeRes.ok ? `getMe ${getMeRes.status}: ${await getMeRes.text()}` : null,
    !getChatRes.ok ? `getChat ${getChatRes.status}: ${await getChatRes.text()}` : null,
  ]
    .filter(Boolean)
    .join(" / ");

  console.error(`텔레그램 하트비트 실패: ${detail}`);

  await sendTelegramAlert({
    title: "⚠️ 텔레그램 하트비트 실패",
    message: `봇 토큰 또는 채팅방 확인이 필요합니다.\n${detail}`,
    url: "https://github.com/snackinhand/naeson-gansik/actions/workflows/telegram-heartbeat.yml",
  });

  process.exit(1);
}

main();
