import Image from "next/image";
import type { Deal } from "@/lib/types";
import { DisclosureNotice } from "./DisclosureNotice";

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
        {deal.isAllTimeLow && (
          <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-1 text-xs font-semibold text-white">
            역대 최저가
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="text-xs font-medium text-orange-600">
          {deal.category}
        </span>
        <h3 className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {deal.title}
        </h3>
        <div className="mt-auto flex items-baseline gap-2">
          <span className="text-lg font-bold text-zinc-900 dark:text-white">
            {deal.price.toLocaleString()}원
          </span>
          {deal.discountRate > 0 && (
            <span className="text-sm font-semibold text-red-500">
              -{deal.discountRate}%
            </span>
          )}
        </div>
        {deal.originalPrice > deal.price && (
          <span className="text-xs text-zinc-400">
            도매 매입가{" "}
            <span className="line-through">
              {deal.originalPrice.toLocaleString()}원
            </span>
          </span>
        )}
        <a
          href={deal.url}
          target="_blank"
          rel="nofollow sponsored noopener"
          className="mt-2 block rounded-full bg-zinc-900 px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
        >
          쿠팡에서 보기
        </a>
        <DisclosureNotice variant="compact" />
      </div>
    </div>
  );
}
