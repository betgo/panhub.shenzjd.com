/**
 * 品牌 / 广告 / 推广位占位，后续直接改这里即可。
 * 原先来自官方 site-navbar（神族九帝、流量卡等）和 /api/notice-popup（微信群）。
 */
export const BRAND_NAME = "星盘搜";
/** 品牌链接占位，例如以后改成 https://betgo.github.io/ */
export const BRAND_URL = "#";

/** 推广弹窗占位（不再拉官方微信群接口） */
export const PROMO_POPUP = {
  /** 先关掉，避免一进页就弹；要预览时改成 true */
  enabled: false,
  version: 1,
  title: "xxx",
  text: "xxx",
  imageUrl: "",
  imageHint: "xxx",
  link: "xxx",
  buttonText: "xxx",
} as const;
