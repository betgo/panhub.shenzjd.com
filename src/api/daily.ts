import { API_BASE } from "../config";

/** 今日更新 / 网友转存条目（只展示有效 shareUrl） */
export interface DailyResourceItem {
  id: number | string;
  name: string;
  platform: string;
  shareUrl: string;
  passcode?: string;
  category?: string;
  channel?: string;
  messageId?: string;
  publishedAt?: number;
  createdAt?: number;
  pinned?: boolean;
  cover?: string;
  summary?: string;
  hot?: number;
}

export interface DailyDayBucket {
  date: string;
  items: DailyResourceItem[];
}

export interface DailyGroup {
  key: string;
  items: DailyResourceItem[];
}

interface Envelope<T> {
  code: number;
  message?: string;
  data?: T;
}

function hasShareUrl(item: unknown): item is DailyResourceItem {
  return (
    !!item &&
    typeof (item as DailyResourceItem).shareUrl === "string" &&
    (item as DailyResourceItem).shareUrl.length > 0
  );
}

export function groupDailyItems(items: DailyResourceItem[]): DailyGroup[] {
  const groups: DailyGroup[] = [];
  const map = new Map<string, DailyGroup>();
  for (const item of items) {
    const key = item.messageId
      ? `${item.channel}:${item.messageId}`
      : `row:${item.id}`;
    let g = map.get(key);
    if (!g) {
      g = { key, items: [] };
      map.set(key, g);
      groups.push(g);
    }
    g.items.push(item);
  }
  return groups;
}

async function getJson<T>(url: string): Promise<Envelope<T>> {
  const resp = await fetch(url, {
    method: "GET",
    credentials: "omit",
    headers: { accept: "application/json" },
  });
  return (await resp.json()) as Envelope<T>;
}

/** 首页「今日更新」：按天分组，offset 为已加载的天数 */
export async function fetchDailyResourcesByDay(
  offset: number,
  days = 3,
): Promise<{ days: DailyDayBucket[]; hasMore: boolean }> {
  const url = `${API_BASE}/daily-resources?groupBy=day&days=${days}&offset=${offset}`;
  const body = await getJson<{ days?: DailyDayBucket[]; hasMore?: boolean }>(url);
  const daysList = (
    body?.code === 0 && Array.isArray(body.data?.days) ? body.data.days : []
  )
    .filter((d) => d && typeof d.date === "string" && Array.isArray(d.items))
    .map((d) => ({
      date: d.date,
      items: d.items.filter(hasShareUrl),
    }))
    .filter((d) => d.items.length > 0);
  return { days: daysList, hasMore: !!body?.data?.hasMore };
}

/** /daily 页「今日更新」：扁平列表（官网同款 limit/offset） */
export async function fetchDailyResourceItems(
  offset: number,
  limit = 200,
): Promise<{ items: DailyResourceItem[]; hasMore: boolean }> {
  const url = `${API_BASE}/daily-resources?limit=${limit}&offset=${offset}`;
  const body = await getJson<{ items?: DailyResourceItem[]; hasMore?: boolean }>(url);
  const list = body?.code === 0 ? body.data?.items : [];
  const items = Array.isArray(list) ? list.filter(hasShareUrl) : [];
  return { items, hasMore: !!body?.data?.hasMore };
}

/** 网友转存 */
export async function fetchCommunityShares(
  offset: number,
  limit = 20,
): Promise<{ items: DailyResourceItem[]; hasMore: boolean }> {
  const url = `${API_BASE}/community-shares?limit=${limit}&offset=${offset}`;
  const body = await getJson<{ items?: DailyResourceItem[]; hasMore?: boolean }>(url);
  const list = body?.code === 0 ? body.data?.items : [];
  const items = Array.isArray(list) ? list.filter(hasShareUrl) : [];
  return { items, hasMore: !!body?.data?.hasMore };
}

export function dailyCoverUrl(cover?: string | null): string {
  if (!cover) return "";
  return `${API_BASE}/cover?u=${encodeURIComponent(cover)}`;
}
