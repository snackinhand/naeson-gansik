import { chromium } from "playwright";

export type OwnerspickCategory = {
  name: string;
  url: string;
};

export const OWNERSPICK_CATEGORIES: OwnerspickCategory[] = [
  { name: "과자", url: "https://ownerspick.com/hotdeal/%EA%B3%BC%EC%9E%90-%ED%95%AB%EB%94%9C" },
  { name: "음료수", url: "https://ownerspick.com/hotdeal/%EC%9D%8C%EB%A3%8C%EC%88%98-%ED%95%AB%EB%94%9C" },
];

const REFRESH_LABEL_PATTERN = /실시간\s*갱신\s*\(\s*(\d{1,2}:\d{2})\s*기준\)/;

/** 해당 카테고리 핫딜 페이지의 "실시간 갱신 (HH:MM 기준)" 라벨에서 시각 문자열을 읽어온다. */
export async function fetchRefreshLabel(url: string): Promise<string> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    // 라벨 문구는 먼저 뜨고 시각 값("HH:MM 기준")은 뒤늦게 비동기로 채워지므로,
    // 숫자가 채워질 때까지 기다려야 한다.
    await page.waitForFunction(() => /실시간\s*갱신\s*\(\s*\d{1,2}:\d{2}/.test(document.body.innerText), {
      timeout: 20000,
    });
    const text = await page.evaluate(() => document.body.innerText);
    const match = text.match(REFRESH_LABEL_PATTERN);
    if (!match) {
      throw new Error("실시간 갱신 라벨을 찾지 못함");
    }
    return match[1].trim();
  } finally {
    await browser.close();
  }
}
