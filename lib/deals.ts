import fs from "fs";
import path from "path";
import type { Deal } from "./types";

const DEALS_PATH = path.join(process.cwd(), "data", "deals.json");

export function getDeals(): Deal[] {
  const raw = fs.readFileSync(DEALS_PATH, "utf-8");
  return JSON.parse(raw) as Deal[];
}
