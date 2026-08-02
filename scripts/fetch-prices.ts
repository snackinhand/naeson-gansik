import path from "path";
import { collectPriceSnapshots, today } from "../lib/priceHistory";
import { itemKey, parseQuantity } from "../lib/coupang";

try {
  process.loadEnvFile(path.join(process.cwd(), ".env.local"));
} catch {
  // .env.local이 없으면 무시 (실제 환경변수가 이미 주입된 CI 등의 상황 대비)
}

async function main() {
  const results = await collectPriceSnapshots();

  const hot = results
    .filter((c) => c.discountVsAvg >= 10 || c.isAllTimeLow)
    .sort((a, b) => b.discountVsAvg - a.discountVsAvg);

  console.log("\n=== 특가 후보 (30일 평균가 대비 할인율 높은 순) ===\n");
  if (hot.length === 0) {
    console.log("이번 조회에서는 눈에 띄는 특가 후보가 없습니다.");
  }
  hot.forEach((c) => {
    console.log(
      `- [${c.category}] ${c.product.productName}\n` +
        `  현재가: ${c.product.productPrice.toLocaleString()}원 | 30일 평균 대비 ${c.discountVsAvg}%${
          c.isAllTimeLow ? " | 역대최저가" : ""
        }\n` +
        `  링크: ${c.product.productUrl}\n`
    );
  });

  if (hot.length > 0) {
    console.log(
      "\n실제로 발행할 상품은 아래 JSON을 골라 data/deals.json 배열에 추가하세요:\n"
    );
    hot.forEach((c) => {
      const quantity = parseQuantity(c.product.productName);
      const unitPrice = Math.round(c.product.productPrice / quantity);
      const snippet = {
        id: itemKey(c.product),
        title: c.product.productName,
        image: c.product.productImage,
        category: c.category,
        price: c.product.productPrice,
        quantity,
        unitPrice,
        marginRate: 0,
        isRocket: c.product.isRocket,
        url: c.product.productUrl,
        updatedAt: today(),
      };
      console.log(
        `// 개당가 ${unitPrice.toLocaleString()}원 - 소비자가를 알고 있다면 reference-prices.json에 등록하거나 marginRate를 직접 계산해서 채우세요`
      );
      console.log(JSON.stringify(snippet, null, 2) + ",");
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
