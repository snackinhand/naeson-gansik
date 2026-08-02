import Image from "next/image";
import type { Deal } from "@/lib/types";

function isNew(updatedAt: string): boolean {
  return updatedAt === new Date().toISOString().slice(0, 10);
}

export function DealCard({ deal }: { deal: Deal }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="relative aspect-square bg-zinc-100 dark:bg-zinc-800">
        <Image
          src={deal.image}
          alt={deal.title}
          fill
          sizes="(max-width: 640px) 50vw, 25vw"
          className="object-cover"
        />
        {isNew(deal.updatedAt) && (
          <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white">
            NEW
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {deal.title}
        </h3>
        {deal.isRocket && (
          <span className="flex items-center gap-1 text-xs font-semibold text-blue-600">
            🚀 로켓프레시
          </span>
        )}
        <div className="mt-auto flex items-center gap-2">
          <span className="text-lg font-bold text-zinc-900 dark:text-white">
            개당 {deal.unitPrice.toLocaleString()}원
          </span>
          <span className="rounded-md bg-emerald-500 px-2 py-1 text-sm font-bold text-white">
            Margin {deal.marginRate}%
          </span>
        </div>
        <span className="text-xs text-zinc-400">
          {deal.quantity}개 {deal.price.toLocaleString()}원
        </span>
        <a
          href={deal.url}
          target="_blank"
          rel="nofollow sponsored noopener"
          className="mt-2 block rounded-full bg-zinc-900 px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
        >
          구매하러 가기
        </a>
      </div>
    </div>
  );
}
