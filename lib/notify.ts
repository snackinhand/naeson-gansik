/** GitHub Actions 러너 IP에서 발행한 ntfy.sh 알림이 앱까지 전달되지 않는 문제가 있어 Telegram으로 전환. */
export async function sendTelegramAlert(params: {
  title: string;
  message: string;
  url: string;
}): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn("TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID가 설정되어 있지 않아 알림을 보내지 않습니다.");
    return false;
  }

  const text = `${params.title}\n${params.message}\n${params.url}`;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  if (!res.ok) {
    console.warn(`Telegram 알림 전송 실패 (${res.status}): ${await res.text()}`);
    return false;
  }
  return true;
}
