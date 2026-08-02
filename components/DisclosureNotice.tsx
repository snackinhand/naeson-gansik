const DISCLOSURE_TEXT =
  "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";

export function DisclosureNotice({
  variant = "full",
}: {
  variant?: "full" | "compact";
}) {
  if (variant === "compact") {
    return (
      <p className="text-[11px] leading-tight text-zinc-400">
        {DISCLOSURE_TEXT}
      </p>
    );
  }

  return (
    <p className="px-4 text-center text-xs text-zinc-500">{DISCLOSURE_TEXT}</p>
  );
}
