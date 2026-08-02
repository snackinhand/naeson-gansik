import { getDeals } from "@/lib/deals";
import { DealBoard } from "@/components/DealBoard";

export default function Home() {
  const deals = getDeals();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          내손의간식
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          무인매장 도매 매입가보다 쿠팡이 더 쌀 때만 올라오는 실시간 매입 특가
        </p>
      </header>
      <DealBoard deals={deals} />
    </main>
  );
}
