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

  const text =
    `*${escapeMarkdown(params.title)}*\n${escapeMarkdown(params.message)}\n${params.url}`;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "MarkdownV2",
      disable_web_page_preview: false,
    }),
  });

  if (!res.ok) {
    console.warn(`Telegram 알림 전송 실패 (${res.status}): ${await res.text()}`);
    return false;
  }
  return true;
}

/** MarkdownV2에서 특수문자로 취급되는 문자를 이스케이프한다. */
function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}
