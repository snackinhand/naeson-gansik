import readline from "readline/promises";
import fs from "fs";
import path from "path";
import { CATEGORIES, type Category, type Deal } from "../lib/types";

const DEALS_PATH = path.join(process.cwd(), "data", "deals.json");

function loadDeals(): Deal[] {
  return JSON.parse(fs.readFileSync(DEALS_PATH, "utf-8"));
}

function saveDeals(deals: Deal[]) {
  fs.writeFileSync(DEALS_PATH, JSON.stringify(deals, null, 2) + "\n");
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function toNumber(input: string): number {
  return Number(input.replace(/[^0-9.]/g, ""));
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log("쿠팡 API를 전혀 호출하지 않는 완전 수동 등록입니다.");
  console.log("쿠팡 앱/사이트에서 직접 확인한 정보와, 파트너스 사이트(partners.coupang.com)에서");
  console.log("직접 만든 링크를 입력해주세요. 종료하려면 상품명에 'q'를 입력하세요.\n");

  while (true) {
    const title = (await rl.question("상품명: ")).trim();
    if (title.toLowerCase() === "q") break;
    if (!title) continue;

    const id = (await rl.question("고유 ID (바코드 등, 비워두면 자동생성): ")).trim() ||
      `manual-${Date.now()}`;

    const image = (await rl.question("이미지 URL: ")).trim();

    console.log(`카테고리: ${CATEGORIES.map((c, i) => `${i + 1}.${c}`).join(" ")}`);
    let category: Category = CATEGORIES[0];
    while (true) {
      const pick = (await rl.question("카테고리 번호: ")).trim();
      const idx = parseInt(pick, 10) - 1;
      if (idx >= 0 && idx < CATEGORIES.length) {
        category = CATEGORIES[idx];
        break;
      }
      console.log("올바른 번호를 입력하세요.");
    }

    const price = toNumber(await rl.question("쿠팡 판매가(총액, 원): "));
    const quantityInput = (await rl.question("구성 개수 (비워두면 1): ")).trim();
    const quantity = quantityInput ? toNumber(quantityInput) : 1;
    const consumerPrice = toNumber(
      await rl.question("개당 소비자가(마진 계산 기준, 원): ")
    );
    const isRocketInput = (await rl.question("로켓프레시 상품인가요? (y/N): ")).trim().toLowerCase();
    const isRocket = isRocketInput === "y";
    const url = (await rl.question("쿠팡 파트너스 링크(link.coupang.com/...): ")).trim();

    if (!price || !quantity || !consumerPrice || !url) {
      console.log("가격/구성개수/소비자가/링크는 필수입니다. 이 항목은 건너뜁니다.\n");
      continue;
    }

    const unitPrice = Math.round(price / quantity);
    const marginRate = Math.round(((consumerPrice - unitPrice) / consumerPrice) * 100);

    console.log(
      `\n계산 결과: 개당 ${unitPrice.toLocaleString()}원 / 마진 ${marginRate}%` +
        (marginRate <= 0 ? " (마진 없음 또는 마이너스)" : "")
    );
    const confirm = (await rl.question("이대로 등록할까요? (Y/n): ")).trim().toLowerCase();
    if (confirm === "n") {
      console.log("취소했습니다.\n");
      continue;
    }

    const deal: Deal = {
      id,
      title,
      image,
      category,
      price,
      quantity,
      unitPrice,
      marginRate,
      isRocket,
      url,
      updatedAt: today(),
    };

    const deals = loadDeals().filter((d) => d.id !== id);
    deals.push(deal);
    deals.sort((a, b) => b.marginRate - a.marginRate);
    saveDeals(deals);

    console.log(`저장했습니다: ${id}\n`);
  }

  rl.close();
  console.log("종료합니다. git add/commit/push까지 해야 사이트에 반영됩니다.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
