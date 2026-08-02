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
          진짜 저렴할 때만 소개하는 간식 특가 모음
        </p>
      </header>
      <DealBoard deals={deals} />
    </main>
  );
}
