export type Category = "과자" | "초콜릿" | "음료" | "견과류" | "기타";

export const CATEGORIES: Category[] = ["과자", "초콜릿", "음료", "견과류", "기타"];

export interface Deal {
  id: string;
  title: string;
  image: string;
  category: Category;
  price: number;
  originalPrice: number;
  discountRate: number;
  isAllTimeLow: boolean;
  url: string;
  updatedAt: string;
}

export interface PriceSnapshot {
  date: string;
  price: number;
}

export type PriceHistory = Record<string, PriceSnapshot[]>;

export interface ReferencePriceEntry {
  title: string;
  referencePrice: number;
}

export type ReferencePrices = Record<string, ReferencePriceEntry>;

export type Overrides = Record<string, Partial<Deal>>;
