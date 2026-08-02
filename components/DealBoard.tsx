"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, type Category, type Deal } from "@/lib/types";
import { DealCard } from "./DealCard";

type Tab = Category | "전체";

export function DealBoard({ deals }: { deals: Deal[] }) {
  const [selected, setSelected] = useState<Tab>("전체");

  const filtered = useMemo(
    () =>
      selected === "전체" ? deals : deals.filter((d) => d.category === selected),
    [deals, selected]
  );

  const tabs: Tab[] = ["전체", ...CATEGORIES];

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setSelected(tab)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              selected === tab
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-20 text-center text-zinc-400">
          아직 등록된 핫딜이 없습니다. data/reference-prices.json에 개당 소비자가를
          등록하면 `npm run auto-publish` 실행 시 마진율이 기준을 넘는 상품만 자동으로
          채워집니다.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </div>
  );
}
