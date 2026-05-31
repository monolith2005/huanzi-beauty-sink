const REAL_PRODUCT_SIZES = {
  "卸妆膏": { heightCm: 6.4, widthCm: 8.2, sizeClass: "small" },
  "卸妆油": { heightCm: 13.8, widthCm: 4.9, sizeClass: "medium" },
  "卸妆水": { heightCm: 17.2, widthCm: 5.4, sizeClass: "medium" },
  "假睫毛": { heightCm: 4.2, widthCm: 11.5, sizeClass: "small" },
  "口红": { heightCm: 8.6, widthCm: 2.2, sizeClass: "small" },
  "遮瑕": { heightCm: 6.8, widthCm: 2.6, sizeClass: "small" },
  "睫毛膏": { heightCm: 12.0, widthCm: 2.0, sizeClass: "small" },
  "眼霜": { heightCm: 5.0, widthCm: 4.8, sizeClass: "small" },
  "护手霜2": { heightCm: 11.5, widthCm: 4.0, sizeClass: "small" },
  "护手霜": { heightCm: 14.0, widthCm: 4.8, sizeClass: "medium" },
  "散粉": { heightCm: 5.2, widthCm: 7.5, sizeClass: "small" },
  "气垫": { heightCm: 4.8, widthCm: 8.8, sizeClass: "small", displayScale: 1.35 },
  "腮红": { heightCm: 2.5, widthCm: 7.2, sizeClass: "small" },
  "综合盘": { heightCm: 3.2, widthCm: 16.0, sizeClass: "medium" },
  "牙膏": { heightCm: 18.2, widthCm: 5.2, sizeClass: "medium" },
  "防晒霜": { heightCm: 15.4, widthCm: 5.3, sizeClass: "medium" },
  "洗面奶": { heightCm: 16.2, widthCm: 5.6, sizeClass: "medium" },
  "去角质啫喱": { heightCm: 16.5, widthCm: 5.5, sizeClass: "medium" },
  "粉底液": { heightCm: 16.4, widthCm: 5.0, sizeClass: "medium" },
  "精华液": { heightCm: 12.0, widthCm: 3.6, sizeClass: "small" },
  "面霜": { heightCm: 6.8, widthCm: 7.4, sizeClass: "small" },
  "香水": { heightCm: 10.0, widthCm: 5.4, sizeClass: "small" },
  "香皂": { heightCm: 3.8, widthCm: 8.5, sizeClass: "small" },
  "泡澡球": { heightCm: 6.8, widthCm: 6.8, sizeClass: "small" },
  "香薰蜡烛": { heightCm: 10.0, widthCm: 8.5, sizeClass: "medium" },
  "止汗露": { heightCm: 13.2, widthCm: 4.8, sizeClass: "medium" },
  "身体油": { heightCm: 16.0, widthCm: 5.7, sizeClass: "medium" },
  "补水喷雾": { heightCm: 18.6, widthCm: 5.0, sizeClass: "medium" },
  "乳液": { heightCm: 18.8, widthCm: 5.8, sizeClass: "large" },
  "爽肤水": { heightCm: 19.8, widthCm: 5.4, sizeClass: "large" },
  "面膜": { heightCm: 19.8, widthCm: 13.2, sizeClass: "large" },
  "身体乳": { heightCm: 21.0, widthCm: 6.5, sizeClass: "large" },
  "磨砂膏": { heightCm: 9.6, widthCm: 9.8, sizeClass: "medium" },
  "洁面慕斯": { heightCm: 19.4, widthCm: 5.9, sizeClass: "large" },
  "护发素": { heightCm: 22.0, widthCm: 6.3, sizeClass: "large" },
  "发膜": { heightCm: 11.0, widthCm: 10.8, sizeClass: "medium" },
  "梳子": { heightCm: 22.2, widthCm: 5.6, sizeClass: "large" },
  "沐浴露": { heightCm: 23.5, widthCm: 7.4, sizeClass: "large" },
  "洗发水": { heightCm: 24.5, widthCm: 7.4, sizeClass: "large" }
};

const SIZE_CLASS_LABELS = {
  tiny:   "迷你",
  small:  "小号",
  medium: "中号",
  large:  "大号",
  xlarge: "超大号",
  xxlarge: "巨大号"
};

function sizeClassFromHeight(h) {
  if (h <  4)  return "tiny";
  if (h <  9)  return "small";
  if (h < 15)  return "medium";
  if (h < 20)  return "large";
  if (h < 24)  return "xlarge";
  return "xxlarge";
}

function widthClassFromCm(w) {
  if (w <  2)  return "w1";
  if (w <  4)  return "w2";
  if (w <  6)  return "w3";
  if (w <  8)  return "w4";
  if (w < 10)  return "w5";
  return "w6";
}

function beautyToolSize(item) {
  const aspect = item.heightPx / Math.max(item.widthPx, 1);
  if (aspect >= 2.25) {
    return { heightCm: 19.0, widthCm: 2.8, sizeClass: "medium" };
  }
  if (aspect >= 1.55) {
    return { heightCm: 16.5, widthCm: 3.2, sizeClass: "medium" };
  }
  if (aspect <= 0.95) {
    return { heightCm: 6.6, widthCm: 8.0, sizeClass: "small" };
  }
  return { heightCm: 7.4, widthCm: 6.6, sizeClass: "small" };
}

function productSizeFor(item) {
  const base = item.product === "美妆工具"
    ? beautyToolSize(item)
    : REAL_PRODUCT_SIZES[item.product] || { heightCm: 14, widthCm: 5, sizeClass: "medium" };
  const aspect = item.heightPx / Math.max(item.widthPx, 1);
  const shapeOffset = Math.max(-0.08, Math.min(0.1, (aspect - 1.35) * 0.04));
  const variantOffset = ((item.variant || 1) % 5 - 2) * 0.035;
  const heightCm = +(base.heightCm * (1 + variantOffset + shapeOffset)).toFixed(2);
  const widthCm = +(base.widthCm * (1 - variantOffset * 0.45 - shapeOffset * 0.2)).toFixed(2);
  const sizeClass = item.category === "唇妆" ? "small" : sizeClassFromHeight(heightCm);
  return { ...base, heightCm, widthCm, sizeClass };
}

function displayMeasureCm(item) {
  const wideObjectMeasure = item.worldWidthCm * 0.78;
  return Math.max(item.worldHeightCm, wideObjectMeasure) * (item.realDisplayScale || 1);
}

function applyProductScales() {
  const products = window.PRODUCTS || [];
  let maxArea = 1;

  products.forEach((item) => {
    const size = productSizeFor(item);
    item.worldHeightCm = size.heightCm;
    item.worldWidthCm = size.widthCm;
    item.realSizeClass = size.sizeClass;
    item.realDisplayScale = size.displayScale || 1;
    item.visualHeight = size.heightCm;
    item.heightLabel = size.heightCm < 4 ? "迷你" : size.heightCm < 9 ? "矮" : size.heightCm < 15 ? "中" : size.heightCm < 20 ? "高" : size.heightCm < 24 ? "超高" : "巨高";
    item.sizeScore = +(size.heightCm * size.widthCm).toFixed(1);
    item.heightScore = size.heightCm;
    item.widthScore = size.widthCm;
    item.ruleHeightScore = size.heightCm;
    item.ruleWidthScore = size.widthCm;
    item.widthSizeClass = widthClassFromCm(size.widthCm);
    item.ruleSizeScore = item.sizeScore;
    item.flatnessScore = +(Math.max(0, Math.min(10, 10 - size.heightCm / Math.max(size.widthCm, 0.1) * 2.1))).toFixed(2);
    item.sizeLabel = SIZE_CLASS_LABELS[size.sizeClass] || "中号";
    maxArea = Math.max(maxArea, item.sizeScore);
  });

  products.forEach((item) => {
    const displayCm = displayMeasureCm(item);
    item.relativeSize = +(item.sizeScore / maxArea).toFixed(3);
    item.displayMeasureCm = +displayCm.toFixed(2);
    item.displayHeightPx = Math.round(34 + displayCm * 3.15);
    item.displayWidthPx = Math.round(34 + item.worldWidthCm * 3.15);
    item.sinkHeightPx = item.displayHeightPx;
  });
}

applyProductScales();
