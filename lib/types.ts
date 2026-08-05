export type Category = "과자" | "초콜릿" | "음료" | "견과류" | "기타";

export const CATEGORIES: Category[] = ["과자", "초콜릿", "음료", "견과류", "기타"];

export interface Deal {
  id: string;
  title: string;
  image: string;
  category: Category;
  /** 쿠팡 판매가 (구성 전체 총액) */
  price: number;
  /** 상품명에서 파싱한 구성 개수 */
  quantity: number;
  /** 개당가 = price / quantity (반올림) */
  unitPrice: number;
  /** 사용자가 입력한 개당 소비자가 대비 마진율(%) */
  marginRate: number;
  isRocket: boolean;
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
  /** 사용자가 직접 조사해서 입력하는 "개당" 소비자가 */
  referencePrice: number;
}

export type ReferencePrices = Record<string, ReferencePriceEntry>;

export type Overrides = Record<string, Partial<Deal>>;

/** 마진 급등 감시 대상 (최대 6개, scripts/add-watchlist.ts로 등록) */
export interface WatchlistEntry {
  /** itemKey(productId-itemId) */
  id: string;
  title: string;
  /** 재검색에 사용할 검색어 (상품 단건 조회 API가 없어 검색으로 재매칭한다) */
  keyword: string;
  /** 개당 소비자가 (마진율 계산 기준) */
  consumerPrice: number;
  /** 쿠팡 파트너스 추적 링크 */
  url: string;
  registeredAt: string;
}

export type Watchlist = WatchlistEntry[];

export interface MarginAlertState {
  lastAlertAt: string;
  lastMarginRate: number;
}

export type MarginAlerts = Record<string, MarginAlertState>;
