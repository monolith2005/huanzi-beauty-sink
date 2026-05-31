const productAdvice = {
  面部清洁: "洁面类产品一般放在护肤流程开头，先把皮肤清洁干净。",
  基础护肤: "基础护肤负责补水、护理和锁水，适合按使用顺序观察。",
  防护: "防晒通常是白天护肤最后一步。",
  底妆: "底妆用于均匀肤色，通常在彩妆流程前段。",
  定妆: "定妆用于固定底妆、减少油光。",
  眼妆: "眼妆产品常在底妆后使用，用于强化眼部轮廓。",
  眉眼彩妆: "眉眼产品用于修饰眉形和眼部细节。",
  面部彩妆: "腮红等面部彩妆用于提升气色。",
  唇妆: "口红用于唇部上色，通常在妆容后段点缀。",
  香氛: "香氛适合最后使用，作为整体整理的收尾。",
  头发护理: "头发护理一般按洗发、护发、深层护理来理解。",
  身体护理: "身体护理通常从清洁到滋润，再到局部护理。",
  手部护理: "护手霜适合随身补涂，用于滋润手部。",
  口腔护理: "口腔护理属于洗漱流程。",
  工具: "工具类用于辅助梳理、上妆、收纳或清洁。",
};

function colorDepthScore(item) {
  const hex = String(item.colorHex || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return item.colorRank || 99;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return +(255 - (r * 0.299 + g * 0.587 + b * 0.114)).toFixed(1);
}

const products = (window.PRODUCTS || []).map((item) => ({
  ...item,
  display: {
    advice: productAdvice[item.category] || `${item.product}属于${item.category || "美妆洗护"}，可用于产品识别和整理规则。`,
  },
  sort: {
    tone: colorDepthScore(item),
    height: item.ruleHeightScore ?? item.heightScore ?? item.visualHeight,
    width: item.ruleWidthScore ?? item.widthScore,
    displayHeight: item.displayHeightPx ?? item.heightScore ?? item.visualHeight,
    size: item.ruleSizeScore ?? item.sizeScore,
    flatness: item.flatnessScore ?? 0,
    shapeOrder: item.shapeOrder ?? shapeScore(item),
    capacity: item.capacityMl,
    shape: item.shapeOrder ?? shapeScore(item),
    category: categoryScore(item),
    brand: brandScore(item),
    usage: item.usageStageOrder ?? item.usageOrder,
    symmetry: item.symmetryScore ?? symmetryScore(item),
    colorCategory: categoryScore(item) * 100 + item.colorRank,
  },
}));

const VISUAL_GAPS = {
  height: 150,
  width: 100,
  size: 80000,
};

const HEIGHT_CLASS_BOUNDS = {
  tiny:    [null, 4],
  small:   [4,    9],
  medium:  [9,   15],
  large:   [15,  20],
  xlarge:  [20,  24],
  xxlarge: [24, null],
};
const WIDTH_CLASS_BOUNDS = {
  w1: [null, 2],
  w2: [2,    4],
  w3: [4,    6],
  w4: [6,    8],
  w5: [8,   10],
  w6: [10, null],
};

function pickCoreItem(bucket, getValue, bounds, margin = 0.5) {
  const [lo, hi] = bounds;
  const core = bucket.filter((p) => {
    const v = getValue(p);
    if (lo !== null && v < lo + margin) return false;
    if (hi !== null && v > hi - margin) return false;
    return true;
  });
  return (core.length ? core : bucket)[0] || null;
}

const TALL_SHAPE_TYPES = new Set(["长管", "泵瓶", "高瓶", "软管", "异形瓶"]);
const FLAT_SHAPE_TYPES = new Set(["扁盒", "球形/皂"]);

function pickFromHeightClass(cls, items) {
  const all = items.filter((p) => p.realSizeClass === cls);
  // 优先：竖向形态（瓶管泵），其次：高>宽，最后：全档兜底
  const vertical = all.filter((p) => TALL_SHAPE_TYPES.has(p.shapeType) && p.worldHeightCm > p.worldWidthCm * 0.9);
  const tallish  = all.filter((p) => !FLAT_SHAPE_TYPES.has(p.shapeType) && p.worldHeightCm > p.worldWidthCm * 0.7);
  const bucket = shuffle(vertical.length >= 1 ? vertical : tallish.length >= 1 ? tallish : all);
  return pickCoreItem(bucket, (p) => p.worldHeightCm, HEIGHT_CLASS_BOUNDS[cls]);
}

function pickFromWidthClass(cls, items) {
  const all = items.filter((p) => p.widthSizeClass === cls);
  // 窄档：优先选宽度远小于高度的细长物（管/瓶）；宽档：优先选宽度远大于高度的扁平物
  const isNarrow = ["w1", "w2", "w3"].includes(cls);
  const preferred = isNarrow
    ? all.filter((p) => p.worldHeightCm > p.worldWidthCm * 2)   // 高度≥2×宽度，非常细
    : all.filter((p) => p.worldWidthCm > p.worldHeightCm * 0.9); // 宽度接近或大于高度，明显宽
  const bucket = shuffle(preferred.length >= 2 ? preferred : all);
  return pickCoreItem(bucket, (p) => p.worldWidthCm, WIDTH_CLASS_BOUNDS[cls]);
}

const rules = {
  level01Height: {
    type: "sort",
    title: "高度从低到高",
    hint: ["观察瓶身或物件整体高度。", "只比较肉眼差别明显的高矮。", "矮瓶在前，高瓶在后。"],
    pool: () => {
      const classes = ["tiny", "small", "medium", "large", "xlarge", "xxlarge"];
      return classes.map((cls) => pickFromHeightClass(cls, products)).filter(Boolean);
    },
    compare: (item) => item.sort.height,
    distractors: 0,
  },
  level01HeightDesc: {
    type: "sort",
    title: "高度从高到低",
    hint: ["观察瓶身或物件整体高度。", "只比较肉眼差别明显的高矮。", "高瓶在前，矮瓶在后。"],
    pool: () => {
      const classes = ["xxlarge", "xlarge", "large", "medium", "small", "tiny"];
      return classes.map((cls) => pickFromHeightClass(cls, products)).filter(Boolean);
    },
    compare: (item) => -item.sort.height,
    distractors: 0,
  },
  level02Size: {
    type: "sort",
    title: "整体大小从小到大",
    hint: ["观察物件占画面的整体体量。", "细高但很窄的物体不一定大。", "大瓶、大盒靠后。"],
    pool: () => distinctScalarPool(products, "size", VISUAL_GAPS.size),
    compare: (item) => item.sort.size,
    distractors: 0,
  },
  level03Width: {
    type: "sort",
    title: "横向宽度从窄到宽",
    hint: ["观察物体左右跨度。", "细管靠前，宽盒和大盘靠后。", "不要被高度干扰。"],
    pool: () => {
      const classes = ["w1", "w2", "w3", "w4", "w5", "w6"];
      return classes.map((cls) => pickFromWidthClass(cls, products)).filter(Boolean);
    },
    compare: (item) => item.sort.width,
    distractors: 0,
  },
  level07WidthDesc: {
    type: "sort",
    title: "横向宽度从宽到窄",
    hint: ["观察物体左右跨度。", "宽盒和大盘靠前，细管靠后。", "不要被高度干扰。"],
    pool: () => {
      const classes = ["w6", "w5", "w4", "w3", "w2", "w1"];
      return classes.map((cls) => pickFromWidthClass(cls, products)).filter(Boolean);
    },
    compare: (item) => -item.sort.width,
    distractors: 0,
  },
  level04Color: {
    type: "sort",
    title: "颜色由浅到深",
    hint: ["先看主体颜色。", "白色、浅肤色通常靠前。", "粉色、蓝紫、深色更靠后。"],
    pool: () => distinctScalarPool(products, "tone", 34),
    compare: (item) => item.sort.tone,
    distractors: 0,
  },
  level05PinkSize: {
    type: "sort",
    title: "同色系从小到大",
    hint: ["先找同一色系。", "再比较整体大小。", "颜色不一致的是干扰项。"],
    pool: () => rankedWithDistractors(
      products.filter((item) => item.colorFamily === "粉红"),
      (item) => item.sort.size,
      products.filter((item) => item.colorFamily !== "粉红"),
      VISUAL_GAPS.size
    ),
    compare: (item) => item.sort.size,
    distractors: 0,
  },
  level06RoundJar: {
    type: "sort",
    title: "圆罐从小到大",
    hint: ["先筛选圆罐。", "再按整体大小排列。", "瓶子和软管是干扰项。"],
    pool: () => rankedWithDistractors(
      products.filter((item) => item.shapeType === "圆罐"),
      (item) => item.sort.size,
      products.filter((item) => item.shapeType !== "圆罐"),
      VISUAL_GAPS.size
    ),
    compare: (item) => item.sort.size,
    distractors: 0,
  },
  level07FlatBox: {
    type: "sort",
    title: "扁盒从小到大",
    hint: ["先找扁盒、粉盒、盘状物。", "再按整体大小排列。", "长管和圆罐不要混入。"],
    pool: () => rankedWithDistractors(
      products.filter((item) => item.shapeType === "扁盒"),
      (item) => item.sort.size,
      products.filter((item) => item.shapeType !== "扁盒"),
      6
    ),
    compare: (item) => item.sort.size,
    distractors: 0,
  },
  level08Tube: {
    type: "sort",
    title: "软管从短到长",
    hint: ["先找软管。", "再按长度从短到长。", "口红很长但不是软管。"],
    pool: () => rankedWithDistractors(
      products.filter((item) => item.shapeType === "软管"),
      (item) => item.sort.height,
      products.filter((item) => item.shapeType !== "软管"),
      6
    ),
    compare: (item) => item.sort.height,
    distractors: 0,
  },
  level09LongTube: {
    type: "sort",
    title: "长管从短到长",
    hint: ["先找口红、遮瑕、睫毛膏这类长管。", "再比较高矮。", "细瓶和软管是干扰项。"],
    pool: () => rankedWithDistractors(
      products.filter((item) => item.shapeType === "长管"),
      (item) => item.sort.height,
      products.filter((item) => item.shapeType !== "长管"),
      6
    ),
    compare: (item) => item.sort.height,
    distractors: 0,
  },
  level10ShapeOrder: {
    type: "sort",
    title: "包装形态序列",
    hint: ["观察包装形态。", "扁盒、圆罐、长管、软管、泵瓶、高瓶依次整理。", "不是看颜色。"],
    pool: () => onePerShape(["扁盒", "圆罐", "长管", "软管", "泵瓶", "高瓶"]),
    compare: (item) => item.sort.shapeOrder,
    distractors: 0,
  },
  level11Symmetry: {
    type: "sort",
    title: "对称到不对称",
    hint: ["观察轮廓是否规整。", "规则瓶盒更对称。", "工具或异形更不规则。"],
    pool: () => onePerShape(["扁盒", "圆罐", "长管", "泵瓶", "异形瓶", "工具"]),
    compare: (item) => item.sort.symmetry,
    distractors: 0,
  },
  level12Flatness: {
    type: "sort",
    title: "扁平到立体",
    hint: ["看物体是扁盒还是立体瓶罐。", "扁平物靠前。", "高瓶和泵瓶更靠后。"],
    pool: () => onePerShape(["扁盒", "球形/皂", "圆罐", "长管", "异形瓶", "泵瓶"]),
    compare: (item) => item.sort.flatness * -1,
    distractors: 0,
  },
  level13SameProductSize: {
    type: "sort",
    title: "同类产品大小整理",
    hint: ["这些物体属于同一种产品。", "观察同类内部的大小差异。", "从小到大补全。"],
    pool: () => sameProductScalarPool(["香水", "腮红", "综合盘", "卸妆膏", "假睫毛", "泡澡球"], "size", 2.8),
    compare: (item) => item.sort.size,
    distractors: 0,
  },
  level14ShapeColor: {
    type: "sort",
    title: "同形状颜色深浅",
    hint: ["先找同一种形状。", "再按颜色由浅到深。", "形状不对的是干扰项。"],
    pool: () => sameShapeColorPool(["长管", "扁盒", "圆罐", "泵瓶"]),
    compare: (item) => item.sort.tone,
    distractors: 0,
  },
  level15ColorShape: {
    type: "sort",
    title: "同色系形状变化",
    hint: ["先找同一色系。", "再按包装形态整理。", "颜色不对的是干扰项。"],
    pool: () => sameColorShapePool(["粉红", "暖色", "蓝", "白灰"]),
    compare: (item) => item.sort.shapeOrder,
    distractors: 0,
  },
  level16MorningSkincare: {
    type: "process",
    title: "晨间护肤流程",
    scene: "早上出门前。",
    hint: ["晨间护肤流程"],
    pool: () => onePerStage(["清洁", "水类", "精华", "保湿", "保湿", "防晒"]),
    compare: (item) => item.sort.usage,
    distractors: 3,
  },
  level17NightSkincare: {
    type: "process",
    title: "夜间护肤流程",
    scene: "晚上回家后。",
    hint: ["先卸妆清洁。", "再补水、精华、保湿。", "晚上不需要防晒。"],
    pool: () => onePerStage(["卸妆清洁", "清洁", "水类", "精华", "眼部护理", "保湿"]),
    compare: (item) => item.sort.usage,
    distractors: 3,
  },
  level18WashCare: {
    type: "process",
    title: "洗护护理整理",
    scene: "洗完头或洗完澡后的整理。",
    hint: ["先清洁。", "再护理或滋润。", "工具和局部护理靠后。"],
    pool: () => onePerStage(["头发清洁", "头发护理", "头发加强护理", "身体清洁", "身体滋润", "局部护理"]),
    compare: (item) => item.sort.usage,
    distractors: 3,
  },
  level19MakeupArea: {
    type: "process",
    title: "彩妆区域整理",
    scene: "完成妆容。",
    hint: ["底妆在前。", "定妆和面部彩妆在中间。", "眼妆与唇妆靠后。"],
    pool: () => onePerStage(["底妆", "遮瑕", "定妆", "面部彩妆", "睫毛产品", "唇妆"]),
    compare: (item) => item.sort.usage,
    distractors: 3,
  },
  level21SkinBodyRoutine: {
    type: "process",
    title: "护肤身体全流程",
    scene: "洗澡后的完整护理。",
    hint: ["身体清洁在最前。", "再滋润身体、局部护理。", "香氛作为收尾。"],
    pool: () => onePerStage(["身体清洁", "身体去角质", "身体滋润", "局部护理", "家居香氛", "香氛"]),
    compare: (item) => item.sort.usage,
    distractors: 3,
  },
  level22FullMakeup: {
    type: "process",
    title: "完整上妆流程",
    scene: "从护肤底子到完成彩妆。",
    hint: ["护肤打底最先。", "底妆遮瑕在中间。", "眼妆和唇妆压轴。"],
    pool: () => onePerStage(["保湿", "防晒", "底妆", "遮瑕", "眼部护理", "唇妆"]),
    compare: (item) => item.sort.usage,
    distractors: 3,
  },
  level20Compound: {
    type: "sort",
    title: "复合规则挑战",
    hint: ["先找共同特征。", "再按隐藏规律排序。", "这是前面规则的组合。"],
    pool: () => sampleCompoundPool(),
    compare: (item) => item.__compoundScore ?? item.sort.size,
    distractors: 0,
  },
};

Object.assign(rules.level06RoundJar, {
  pool: () => scalarPoolAllowRepeats(
    products.filter((item) => item.shapeType === "圆罐" && item.product !== "眼霜" && item.productType !== "眼霜"),
    "size",
    VISUAL_GAPS.size
  ),
});

function buildExcludePool(criterion, strictCriterion) {
  const strict = strictCriterion || criterion;
  const matching = shuffle(products.filter(strict));
  const nonMatching = shuffle(products.filter((p) => !criterion(p)));
  return { matchingPool: matching, nonMatchingPool: nonMatching };
}

Object.assign(rules, {
  excludePink: {
    type: "exclude",
    title: "找出粉紫色物品",
    hint: ["提示区里都是粉色或紫色物品。", "找出所有粉紫色物品。"],
    criterion: (item) => ["粉红", "紫"].includes(item.colorFamily),
    pool: () => buildExcludePool(
      (item) => ["粉红", "紫"].includes(item.colorFamily),
      (item) => ["粉红", "紫"].includes(item.colorFamily) && item.colorName && (item.colorName.includes("粉") || item.colorName.includes("紫"))
    ),
  },
  excludeRoundJar: {
    type: "exclude",
    title: "找出圆罐",
    hint: ["提示区里都是圆罐。", "从下方找出三件圆罐放上去。"],
    criterion: (item) => item.shapeType === "圆罐" && item.product !== "眼霜",
    pool: () => buildExcludePool(
      (item) => item.shapeType === "圆罐" && item.product !== "眼霜",
      (item) => item.shapeType === "圆罐" && item.product !== "眼霜" && ["面霜","卸妆膏","磨砂膏","发膜","香薰蜡烛"].includes(item.product)
    ),
  },
  excludeHairCare: {
    type: "exclude",
    title: "找出头发护理产品",
    hint: ["提示区里都是头发护理产品。", "从下方找出三件头发护理产品放上去。"],
    criterion: (item) => item.category === "头发护理",
    pool: () => buildExcludePool((item) => item.category === "头发护理"),
  },
  excludeBodyCare: {
    type: "exclude",
    title: "找出身体护理产品",
    hint: ["提示区里都是身体护理产品。", "从下方找出三件身体护理产品放上去。"],
    criterion: (item) => item.category === "身体护理",
    pool: () => buildExcludePool((item) => item.category === "身体护理"),
  },
  excludeSmall: {
    type: "exclude",
    title: "找出小号物品",
    hint: ["提示区里都是小号物品。", "从下方找出三件小号的放上去。"],
    criterion: (item) => item.realSizeClass === "small",
    pool: () => buildExcludePool(
      (item) => item.realSizeClass === "small",
      (item) => item.realSizeClass === "small" && item.worldHeightCm < 8.5 && item.worldWidthCm < 8
    ),
  },
  excludeLarge: {
    type: "exclude",
    title: "找出大瓶物品",
    hint: ["提示区里都是大瓶物品。", "从下方找出三件大号或更大的放上去。"],
    criterion: (item) => ["large", "xlarge", "xxlarge"].includes(item.realSizeClass),
    pool: () => buildExcludePool(
      (item) => ["large", "xlarge", "xxlarge"].includes(item.realSizeClass),
      (item) => ["xlarge", "xxlarge"].includes(item.realSizeClass)
    ),
  },
  excludeFlatBox: {
    type: "exclude",
    title: "找出扁盒",
    hint: ["提示区里都是扁盒。", "找出所有扁盒物品。"],
    criterion: (item) => item.shapeType === "扁盒",
    pool: () => buildExcludePool(
      (item) => item.shapeType === "扁盒",
      (item) => item.shapeType === "扁盒" && item.worldWidthCm > item.worldHeightCm * 1.5
    ),
  },
  excludeSkincare: {
    type: "exclude",
    title: "找出护肤品",
    hint: ["提示区里都是护肤品。", "找出所有护肤类产品。"],
    criterion: (item) => item.bigCategory === "护肤",
    pool: () => buildExcludePool((item) => item.bigCategory === "护肤"),
  },
  excludeMakeup: {
    type: "exclude",
    title: "找出彩妆品",
    hint: ["提示区里都是彩妆品。", "找出所有彩妆类产品。"],
    criterion: (item) => item.bigCategory === "美妆",
    pool: () => buildExcludePool((item) => item.bigCategory === "美妆"),
  },
  excludePump: {
    type: "exclude",
    title: "找出泵瓶",
    hint: ["提示区里都是泵瓶。", "找出所有泵瓶装产品。"],
    criterion: (item) => item.shapeType === "泵瓶",
    pool: () => buildExcludePool(
      (item) => item.shapeType === "泵瓶",
      (item) => item.shapeType === "泵瓶" && item.worldHeightCm > 15
    ),
  },
  level23ExfoliateRoutine: {
    type: "process",
    title: "深层清洁护理",
    scene: "周末深层护理日。",
    hint: ["去角质在清洁后。", "再做保湿滋润。", "香氛放松收尾。"],
    pool: () => onePerStage(["身体去角质", "身体清洁", "身体滋润", "局部护理", "香氛", "家居香氛"]),
    compare: (item) => item.sort.usage,
    distractors: 3,
  },
  level24EyeCareRoutine: {
    type: "process",
    title: "眼部精细护理",
    scene: "注重眼部细节护理。",
    hint: ["卸妆清洁打底。", "眼部精华轻拍。", "日间记得防晒。"],
    pool: () => onePerStage(["卸妆清洁", "清洁", "水类", "眼部护理", "保湿", "防晒"]),
    compare: (item) => item.sort.usage,
    distractors: 3,
  },
  level25MorningFullRoutine: {
    type: "process",
    title: "早间出门全流程",
    scene: "完整的早间出门准备。",
    hint: ["护肤打底最先。", "底妆轻薄上色。", "遮瑕定妆收尾。"],
    pool: () => onePerStage(["清洁", "水类", "保湿", "防晒", "底妆", "遮瑕"]),
    compare: (item) => item.sort.usage,
    distractors: 3,
  },
  level26ScalpCare: {
    type: "process",
    title: "头皮深层护理",
    scene: "头发深层滋养护理。",
    hint: ["洗发先行。", "护发素或发膜加强。", "局部护理最后。"],
    pool: () => onePerStage(["头发清洁", "头发护理", "头发加强护理", "身体清洁", "身体去角质", "局部护理"]),
    compare: (item) => item.sort.usage,
    distractors: 3,
  },
});

const CAMPAIGN_RULE_KEYS = [
  // 组1  (第1-3关)
  "level01Height",       "level16MorningSkincare",   "excludePink",
  // 组2  (第4-6关)
  "level03Width",        "level17NightSkincare",     "excludeRoundJar",
  // 组3  (第7-9关)
  "level01HeightDesc",   "level18WashCare",          "excludeHairCare",
  // 组4  (第10-12关)
  "level07WidthDesc",    "level19MakeupArea",        "excludeBodyCare",
  // 组5  (第13-15关)
  "level01Height",       "level21SkinBodyRoutine",   "excludeSmall",
  // 组6  (第16-18关)
  "level03Width",        "level22FullMakeup",        "excludeLarge",
  // 组7  (第19-21关)
  "level01HeightDesc",   "level23ExfoliateRoutine",  "excludeFlatBox",
  // 组8  (第22-24关)
  "level07WidthDesc",    "level24EyeCareRoutine",    "excludeSkincare",
  // 组9  (第25-27关)
  "level01Height",       "level25MorningFullRoutine","excludeMakeup",
  // 组10 (第28-30关)
  "level03Width",        "level26ScalpCare",         "excludePump",
];

function categoryScore(item) {
  return { 护肤: 1, 洗护: 2, 美妆: 3, 香氛: 4, 工具: 5, 产品: 6 }[item.bigCategory] || 9;
}

function brandScore(item) {
  return { 护肤品牌: 1, 洗护品牌: 2, 彩妆品牌: 3, 香氛品牌: 4, 工具品牌: 5, 综合品牌: 6 }[item.brandClass] || 9;
}

function flowOrder(item) {
  const index = FLOW_PRODUCTS.indexOf(item.product);
  return index === -1 ? item.sort.usage : index + 1;
}

function shapeScore(item) {
  const rank = { 小罐: 1, 圆罐: 2, 圆盒: 3, 圆皂: 4, 圆球: 5, 粉盒: 6, 袋装: 7, 软管: 8, "软管/瓶": 9, 喷雾瓶: 10, 高瓶: 11, 泵瓶: 12, 滴管瓶: 13, "方瓶/滴管瓶": 14, 瓶装: 15, 香水瓶: 16, 细管: 17, "细管/小盘": 18, 弧形片: 19, "方盘/圆盘": 20, 口红管: 21, 工具: 22 };
  return rank[item.shape] || 99;
}

function symmetryScore(item) {
  if (item.bigCategory === "工具") return 1;
  if (item.shape?.includes("弧形")) return 2;
  if (item.shape?.includes("软管")) return 3;
  if (item.shape?.includes("瓶")) return 4;
  if (item.shape?.includes("方")) return 5;
  if (item.shape?.includes("圆") || item.shape?.includes("罐") || item.shape?.includes("盒")) return 6;
  return 4;
}

const sinkBounds = {
  xMin: 18,
  xMax: 82,
  yMin: 16,
  yMax: 64,
};

const faucetBlock = {
  xMin: 42,
  xMax: 58,
  yMin: 14,
  yMax: 32,
};

const sinkPileSlots = [
  { x: 28, y: 30, rotate: -18, scale: 1.0, z: 3, tilt: -3, shadow: 0.24 },
  { x: 72, y: 32, rotate: 18, scale: 1.0, z: 4, tilt: 4, shadow: 0.26 },
  { x: 50, y: 54, rotate: 6, scale: 1.0, z: 5, tilt: 2, shadow: 0.3 },
];

const MAX_LEVEL = 30;
const ROUND_SECONDS = 60;
const SEQUENCE_LENGTH = 6;
const EXAMPLE_COUNT = 3;
const ANSWER_COUNT = 3;
const MAX_HINTS = 3;
const PLACE_SOUND_SRC = "assets/sounds/ka-da-lock.wav";
const URGENT_SECONDS = 5;
const MAX_FREE_ITEMS = 10;
const PK_API = (typeof window !== "undefined" && window.HUANZI_PK_API) || "";
const PK_SECONDS_PER_LEVEL = 20;
const PK_POLL_MS = 1000;
const FLOW_PRODUCTS = ["洗面奶", "爽肤水", "精华液", "乳液", "面霜", "防晒霜"];
const PROFILE_KEY = "huanzi_lipstick_profile_v1";
const LEADERBOARD_KEY = "huanzi_lipstick_leaderboard_v1";
const CAMPAIGN_PROGRESS_KEY = "huanzi_lipstick_campaign_progress_v1";
const CATALOG_SEEN_KEY = "huanzi_lipstick_catalog_seen_v1";
const MEMORIES_KEY = "huanzi_lipstick_memories_v1";
const PK_HISTORY_KEY = "huanzi_lipstick_pk_history_v1";

const SCENES = [
  {
    id: "bathroom_sink",
    name: "梳妆盥洗台",
    desc: "默认场景，洗手与基础梳妆",
    image: "assets/backgrounds/final_bg.png",
    unlockLevel: 1,
  },
  {
    id: "dressing_room",
    name: "明星化妆间",
    desc: "好莱坞灯泡环绕的化妆台",
    image: "assets/backgrounds/dressing_room.png",
    unlockLevel: 1,
  },
  {
    id: "seaside_resort",
    name: "海边度假酒店露台",
    desc: "蓝海白云的露台收纳台",
    image: "assets/backgrounds/seaside_resort.png",
    unlockLevel: 1,
  },
];

const CURRENT_SCENE_KEY = "huanzi_lipstick_current_scene_v1";

const CATEGORY_UNLOCK = {
  "洗护": 1,
  "工具": 1,
  "护肤": 5,
  "美妆": 10,
  "香氛": 15,
};
const LEADERBOARD_API = window.HUANZI_LEADERBOARD_API || "";
const AVATARS = ["粉", "金", "星", "花", "月", "心"];

const state = {
  mode: "home",
  round: 0,
  ruleKey: "level01Height",
  rule: rules.level01Height,
  sequenceIds: [],
  exampleIds: [],
  answerIds: [],
  pool: [],
  slots: [null, null, null],
  sinkLayouts: {},
  selectedId: null,
  draggedId: null,
  lastClickKey: null,
  lastClickIds: [],
  lastClickIndex: 0,
  mistakes: 0,
  hints: 0,
  startedAt: Date.now(),
  timerId: null,
  timeLeft: ROUND_SECONDS,
  selectedTimeSeconds: 60,
  endlessDurationSeconds: 60,
  endlessScore: 0,
  profile: null,
  selectedAvatar: AVATARS[0],
  roundCleared: false,
  bgmVolume: 0.8,
  sfxVolume: 0.8,
  sfxMasterGain: null,
  bgmTrack: null,
  audioContext: null,
  placeSound: new Audio(PLACE_SOUND_SRC),
  buzzNodes: null,
  lastUrgentBeepSecond: null,
  campaignProgress: [],
  catalogSeen: new Set(),
  selectedCampaignLevel: 1,
  collectionTab: "catalog",
  currentSceneId: "bathroom_sink",
  freeSceneId: null,
  freePickedIds: [],
  freeLayouts: {},
  photoMode: false,
  photoFrameRect: null,
  pendingPhotoUrl: null,
  pendingDeleteMemoryId: null,
  selectedPkLevels: 5,
  pk: null,
  pkPollTimer: null,
};

const els = {
  splash: document.querySelector("#splash"),
  splashStartBtn: document.querySelector("#splashStartBtn"),
  homepage: document.querySelector("#homepage"),
  game: document.querySelector("#game"),
  stage: document.querySelector("#stage"),
  roundLabel: document.querySelector("#roundLabel"),
  timer: document.querySelector("#timer"),
  feedback: document.querySelector("#feedback"),
  sequence: document.querySelector("#sequence"),
  pool: document.querySelector("#pool"),
  detailName: document.querySelector("#detailName"),
  detailAdvice: document.querySelector("#detailAdvice"),
  hintBtn: document.querySelector("#hintBtn"),
  checkBtn: document.querySelector("#checkBtn"),
  giveUpBtn: document.querySelector("#giveUpBtn"),
  homeBtn: document.querySelector("#homeBtn"),
  modal: document.querySelector("#modal"),
  modalKicker: document.querySelector("#modalKicker"),
  modalTitle: document.querySelector("#modalTitle"),
  summary: document.querySelector("#summary"),
  modalNext: document.querySelector("#modalNext"),
  modalHome: document.querySelector("#modalHome"),
  profileBadge: document.querySelector("#profileBadge"),
  profileAvatar: document.querySelector("#profileAvatar"),
  leaderboardBtn: document.querySelector("#leaderboardBtn"),
  endlessPanel: document.querySelector("#endlessPanel"),
  customTimeWrap: document.querySelector("#customTimeWrap"),
  customMinuteWheel: document.querySelector("#customMinuteWheel"),
  startEndlessBtn: document.querySelector("#startEndlessBtn"),
  levelSelectPanel: document.querySelector("#levelSelectPanel"),
  levelGrid: document.querySelector("#levelGrid"),
  levelSelectHint: document.querySelector("#levelSelectHint"),
  startCampaignBtn: document.querySelector("#startCampaignBtn"),
  registerModal: document.querySelector("#registerModal"),
  registerTitle: document.querySelector("#registerTitle"),
  avatarChoices: document.querySelector("#avatarChoices"),
  playerNameInput: document.querySelector("#playerNameInput"),
  registerError: document.querySelector("#registerError"),
  saveProfileBtn: document.querySelector("#saveProfileBtn"),
  leaderboardModal: document.querySelector("#leaderboardModal"),
  leaderboardKicker: document.querySelector("#leaderboardKicker"),
  leaderboardList: document.querySelector("#leaderboardList"),
  closeLeaderboardBtn: document.querySelector("#closeLeaderboardBtn"),
  confirmHomeModal: document.querySelector("#confirmHomeModal"),
  confirmHomeCancel: document.querySelector("#confirmHomeCancel"),
  confirmHomeOk: document.querySelector("#confirmHomeOk"),
  collectionBtn: document.querySelector("#collectionBtn"),
  collectionModal: document.querySelector("#collectionModal"),
  collectionBody: document.querySelector("#collectionBody"),
  closeCollectionBtn: document.querySelector("#closeCollectionBtn"),
  freePanel: document.querySelector("#freePanel"),
  sceneGrid: document.querySelector("#sceneGrid"),
  freeSceneNextBtn: document.querySelector("#freeSceneNextBtn"),
  freeItemPanel: document.querySelector("#freeItemPanel"),
  freeItemGrid: document.querySelector("#freeItemGrid"),
  freeItemHint: document.querySelector("#freeItemHint"),
  freeItemBackBtn: document.querySelector("#freeItemBackBtn"),
  freeStartBtn: document.querySelector("#freeStartBtn"),
  freePlayZone: document.querySelector("#freePlayZone"),
  freeItemsLayer: document.querySelector("#freeItemsLayer"),
  freeActions: document.querySelector("#freeActions"),
  freeResetBtn: document.querySelector("#freeResetBtn"),
  freePhotoBtn: document.querySelector("#freePhotoBtn"),
  freeHomeBtn: document.querySelector("#freeHomeBtn"),
  freeMemoriesBtn: document.querySelector("#freeMemoriesBtn"),
  actionsFooter: document.querySelector(".actions"),
  photoFrame: document.querySelector("#photoFrame"),
  photoControls: document.querySelector("#photoControls"),
  shutterBtn: document.querySelector("#shutterBtn"),
  exitPhotoBtn: document.querySelector("#exitPhotoBtn"),
  savePhotoModal: document.querySelector("#savePhotoModal"),
  savePhotoPreview: document.querySelector("#savePhotoPreview"),
  savePhotoName: document.querySelector("#savePhotoName"),
  savePhotoBtn: document.querySelector("#savePhotoBtn"),
  discardPhotoBtn: document.querySelector("#discardPhotoBtn"),
  deleteConfirmModal: document.querySelector("#deleteConfirmModal"),
  cancelDeleteBtn: document.querySelector("#cancelDeleteBtn"),
  confirmDeleteBtn: document.querySelector("#confirmDeleteBtn"),
  pkPanel: document.querySelector("#pkPanel"),
  pkStatusText: document.querySelector("#pkStatusText"),
  createRoomBtn: document.querySelector("#createRoomBtn"),
  joinRoomBtn: document.querySelector("#joinRoomBtn"),
  roomCodeInput: document.querySelector("#roomCodeInput"),
  pkSetupError: document.querySelector("#pkSetupError"),
  pkStatus: document.querySelector("#pkStatus"),
  pkSelfName: document.querySelector("#pkSelfName"),
  pkSelfCount: document.querySelector("#pkSelfCount"),
  pkSelfBar: document.querySelector("#pkSelfBar"),
  pkOpponentName: document.querySelector("#pkOpponentName"),
  pkOpponentCount: document.querySelector("#pkOpponentCount"),
  pkOpponentBar: document.querySelector("#pkOpponentBar"),
  pkLobby: document.querySelector("#pkLobby"),
  pkLobbyCode: document.querySelector("#pkLobbyCode"),
  pkLobbySelfName: document.querySelector("#pkLobbySelfName"),
  pkLobbySelfStatus: document.querySelector("#pkLobbySelfStatus"),
  pkLobbyOppName: document.querySelector("#pkLobbyOppName"),
  pkLobbyOppStatus: document.querySelector("#pkLobbyOppStatus"),
  pkLobbyHint: document.querySelector("#pkLobbyHint"),
  pkLobbyReadyBtn: document.querySelector("#pkLobbyReadyBtn"),
  pkLobbyLeaveBtn: document.querySelector("#pkLobbyLeaveBtn"),
  roundHintBadge: document.querySelector("#roundHintBadge"),
  roundIntroOverlay: document.querySelector("#roundIntroOverlay"),
  roundIntroTitle: document.querySelector("#roundIntroTitle"),
  roundIntroScene: document.querySelector("#roundIntroScene"),
  roundIntroHints: document.querySelector("#roundIntroHints"),
  roundIntroBtn: document.querySelector("#roundIntroBtn"),
  pkCountdownOverlay: document.querySelector("#pkCountdownOverlay"),
  pkCountSelfName: document.querySelector("#pkCountSelfName"),
  pkCountOppName: document.querySelector("#pkCountOppName"),
  pkCountTarget: document.querySelector("#pkCountTarget"),
  pkCountTimer: document.querySelector("#pkCountTimer"),
  pkCountNumber: document.querySelector("#pkCountNumber"),
  sceneBtn: document.querySelector("#sceneBtn"),
  sceneModal: document.querySelector("#sceneModal"),
  sceneModalGrid: document.querySelector("#sceneModalGrid"),
  closeSceneModalBtn: document.querySelector("#closeSceneModalBtn"),
  homeCard: document.querySelector(".home-card"),
  confirmModeBtn: document.querySelector("#confirmModeBtn"),
  campaignBackBtn: document.querySelector("#campaignBackBtn"),
  endlessBackBtn: document.querySelector("#endlessBackBtn"),
  pkBackBtn: document.querySelector("#pkBackBtn"),
  bgmMenu: document.getElementById("bgmMenu"),
  bgmGame: document.getElementById("bgmGame"),
  soundBtn: document.getElementById("soundBtn"),
  soundBtnIcon: document.getElementById("soundBtnIcon"),
  mixerPopover: document.getElementById("mixerPopover"),
  bgmSlider: document.getElementById("bgmSlider"),
  sfxSlider: document.getElementById("sfxSlider"),
  bgmVal: document.getElementById("bgmVal"),
  sfxVal: document.getElementById("sfxVal"),
};

function itemById(id) {
  return products.find((item) => item.id === id);
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function sample(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function onePerProduct(names) {
  return names
    .map((name) => sample(products.filter((item) => item.product === name)))
    .filter(Boolean);
}

function distinctScalarPool(items, key, minGap, options = {}) {
  const { allowSameProduct = false } = options;
  const ordered = shuffle(items).sort((a, b) => a.sort[key] - b.sort[key]);
  const selected = [];
  const seenProducts = new Set();
  ordered.forEach((item) => {
    if (!allowSameProduct && seenProducts.has(item.product)) return;
    if (selected.every((picked) => Math.abs(picked.sort[key] - item.sort[key]) >= minGap)) {
      selected.push(item);
      seenProducts.add(item.product);
    }
  });
  if (selected.length >= SEQUENCE_LENGTH) return selected;
  const selectedProducts = new Set(selected.map((item) => item.product));
  ordered.forEach((item) => {
    if (selected.length >= SEQUENCE_LENGTH) return;
    if (selected.includes(item) || selectedProducts.has(item.product)) return;
    selected.push(item);
    selectedProducts.add(item.product);
  });
  if (selected.length >= SEQUENCE_LENGTH) return selected;
  ordered.forEach((item) => {
    if (selected.includes(item)) return;
    if (selected.every((picked) => Math.abs(picked.sort[key] - item.sort[key]) >= minGap * 0.55)) {
      selected.push(item);
    }
  });
  return selected.length >= SEQUENCE_LENGTH ? selected : ordered.filter((_, index) => index % 3 === 0);
}

function rankedWithDistractors(correctItems, scoreFn, _distractors = [], minGap = 0) {
  const ordered = shuffle(correctItems)
    .filter((item) => Number.isFinite(scoreFn(item)))
    .sort((a, b) => scoreFn(a) - scoreFn(b));
  if (minGap <= 0) return onePerProductFromItems(ordered);
  const selected = [];
  const seenProducts = new Set();
  ordered.forEach((item) => {
    if (seenProducts.has(item.product)) return;
    if (selected.every((picked) => Math.abs(scoreFn(picked) - scoreFn(item)) >= minGap)) {
      selected.push(item);
      seenProducts.add(item.product);
    }
  });
  if (selected.length >= SEQUENCE_LENGTH) return selected;
  const selectedProducts = new Set(selected.map((item) => item.product));
  ordered.forEach((item) => {
    if (selected.length >= SEQUENCE_LENGTH) return;
    if (selected.includes(item) || selectedProducts.has(item.product)) return;
    selected.push(item);
    selectedProducts.add(item.product);
  });
  if (selected.length >= SEQUENCE_LENGTH) return selected;
  ordered.forEach((item) => {
    if (!selected.includes(item) && selected.every((picked) => Math.abs(scoreFn(picked) - scoreFn(item)) >= minGap * 0.55)) {
      selected.push(item);
    }
  });
  return selected.length >= SEQUENCE_LENGTH ? selected : onePerProductFromItems(ordered);
}

function spreadSequenceItems(sorted, total) {
  if (sorted.length <= total) return sorted;
  return Array.from({ length: total }, (_, index) => {
    const sourceIndex = Math.round((index * (sorted.length - 1)) / (total - 1));
    return sorted[sourceIndex];
  });
}

function scalarPoolAllowRepeats(items, key, minGap) {
  const ordered = shuffle(items)
    .filter((item) => Number.isFinite(item.sort[key]))
    .sort((a, b) => a.sort[key] - b.sort[key]);
  const selected = [];
  ordered.forEach((item) => {
    if (selected.every((picked) => Math.abs(picked.sort[key] - item.sort[key]) >= minGap)) {
      selected.push(item);
    }
  });
  if (selected.length >= SEQUENCE_LENGTH) return selected;
  return spreadSequenceItems(ordered, SEQUENCE_LENGTH);
}

function onePerProductFromItems(items) {
  const picked = [];
  const seen = new Set();
  shuffle(items).forEach((item) => {
    if (!seen.has(item.product)) {
      seen.add(item.product);
      picked.push(item);
    }
  });
  if (picked.length >= SEQUENCE_LENGTH) return picked;
  return items;
}

function onePerShape(shapeTypes) {
  return shapeTypes
    .map((shapeType) => sample(products.filter((item) => item.shapeType === shapeType)))
    .filter(Boolean);
}

function onePerStage(stages) {
  const usedProducts = new Set();
  return stages
    .map((stage) => {
      const candidates = products.filter((item) => item.usageStage === stage && !usedProducts.has(item.product));
      const picked = sample(candidates.length ? candidates : products.filter((item) => item.usageStage === stage));
      if (picked) usedProducts.add(picked.product);
      return picked;
    })
    .filter(Boolean);
}

function sameProductScalarPool(productNames, key, minGap) {
  const pools = shuffle(productNames)
    .map((name) => distinctScalarPool(products.filter((item) => item.product === name), key, minGap, { allowSameProduct: true }))
    .filter((items) => items.length >= SEQUENCE_LENGTH);
  return pools[0] || [];
}

function sameShapeColorPool(shapeTypes) {
  const pools = shuffle(shapeTypes)
    .map((shapeType) => distinctScalarPool(products.filter((item) => item.shapeType === shapeType), "tone", 1))
    .filter((items) => items.length >= SEQUENCE_LENGTH);
  return pools[0] || [];
}

function sameColorShapePool(families) {
  const pools = shuffle(families)
    .map((family) => onePerShapeFromItems(products.filter((item) => item.colorFamily === family)))
    .filter((items) => items.length >= SEQUENCE_LENGTH);
  return pools[0] || [];
}

function onePerShapeFromItems(items) {
  const picked = [];
  const seen = new Set();
  shuffle(items)
    .sort((a, b) => a.sort.shapeOrder - b.sort.shapeOrder)
    .forEach((item) => {
      if (!seen.has(item.shapeType)) {
        seen.add(item.shapeType);
        picked.push(item);
      }
    });
  return picked;
}

function sampleCompoundPool() {
  const options = [
    () => {
      const items = rankedWithDistractors(products.filter((item) => item.colorFamily === "蓝" || item.colorFamily === "绿"), (item) => item.sort.height, [], 2);
      items.forEach((item) => { item.__compoundScore = item.sort.height; });
      return items;
    },
    () => {
      const items = rankedWithDistractors(products.filter((item) => item.shapeType === "扁盒"), (item) => item.sort.size, [], 5);
      items.forEach((item) => { item.__compoundScore = item.sort.size; });
      return items;
    },
    () => {
      const items = onePerProduct(["卸妆水", "卸妆油", "卸妆膏", "洗面奶", "爽肤水", "精华液"]);
      items.forEach((item) => { item.__compoundScore = item.sort.usage; });
      return items;
    },
    () => {
      const items = sameShapeColorPool(["长管", "圆罐", "泵瓶", "扁盒"]);
      items.forEach((item) => { item.__compoundScore = item.sort.tone; });
      return items;
    },
  ];
  return (shuffle(options).map((make) => make()).find((items) => items.length >= SEQUENCE_LENGTH) || []);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function applyProductSizeVars(node, item) {
  const h = item.displayHeightPx || 82;
  node.style.setProperty("--product-img-height", `${h}px`);
  node.style.setProperty("--product-sink-height", `${item.sinkHeightPx || 76}px`);
  const aspect = (item.widthPx && item.heightPx) ? (item.widthPx / item.heightPx) : 1;
  const w = Math.max(20, item.displayWidthPx || Math.round(h * aspect));
  node.style.setProperty("--product-img-width", `${w}px`);
}

function overlapsBlock(point, block) {
  return point.x >= block.xMin && point.x <= block.xMax && point.y >= block.yMin && point.y <= block.yMax;
}

function jitterSinkSlot(slot, index) {
  let point = {
    x: clamp(slot.x + (Math.random() - 0.5) * 4, sinkBounds.xMin, sinkBounds.xMax),
    y: clamp(slot.y + (Math.random() - 0.5) * 3, sinkBounds.yMin, sinkBounds.yMax),
  };

  if (overlapsBlock(point, faucetBlock)) {
    point = { ...point, y: faucetBlock.yMax + 6 };
  }

  return {
    x: clamp(point.x, sinkBounds.xMin, sinkBounds.xMax),
    y: clamp(point.y, sinkBounds.yMin, sinkBounds.yMax),
    rotate: slot.rotate + (Math.random() - 0.5) * 8,
    scale: 1.0,
    z: slot.z + index,
    tilt: slot.tilt,
    shadow: slot.shadow,
  };
}

function buildSinkLayouts(ids) {
  const layouts = {};
  const placed = [];
  const minDist = 18;

  for (const id of ids) {
    let best = null;
    let bestScore = -Infinity;

    for (let i = 0; i < 50; i++) {
      const candidate = {
        x: sinkBounds.xMin + Math.random() * (sinkBounds.xMax - sinkBounds.xMin),
        y: sinkBounds.yMin + Math.random() * (sinkBounds.yMax - sinkBounds.yMin),
      };
      if (overlapsBlock(candidate, faucetBlock)) continue;

      let nearest = Infinity;
      for (const o of placed) {
        const d = Math.hypot(candidate.x - o.x, candidate.y - o.y);
        if (d < nearest) nearest = d;
      }
      const score = placed.length === 0 ? 0 : nearest;
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
        if (nearest >= minDist) break;
      }
    }

    if (!best) best = { x: 50, y: 50 };

    const layout = {
      x: clamp(best.x, sinkBounds.xMin, sinkBounds.xMax),
      y: clamp(best.y, sinkBounds.yMin, sinkBounds.yMax),
      rotate: (Math.random() - 0.5) * 60,
      scale: clamp(1 + (Math.random() - 0.5) * 0.1, 0.94, 1.06),
      z: placed.length + 1,
      tilt: (Math.random() - 0.5) * 6,
      shadow: 0.26,
    };
    layouts[id] = layout;
    placed.push(layout);
  }

  return layouts;
}

function nextSinkLayout(id) {
  const occupied = state.pool
    .filter((pid) => pid !== id && state.sinkLayouts[pid])
    .map((pid) => state.sinkLayouts[pid]);

  const minDist = 18;
  let best = null;
  let bestScore = -Infinity;

  for (let i = 0; i < 30; i++) {
    const candidate = {
      x: sinkBounds.xMin + Math.random() * (sinkBounds.xMax - sinkBounds.xMin),
      y: sinkBounds.yMin + Math.random() * (sinkBounds.yMax - sinkBounds.yMin),
    };
    if (overlapsBlock(candidate, faucetBlock)) continue;

    let nearest = Infinity;
    for (const o of occupied) {
      const d = Math.hypot(candidate.x - o.x, candidate.y - o.y);
      if (d < nearest) nearest = d;
    }
    if (nearest > bestScore) {
      bestScore = nearest;
      best = candidate;
      if (nearest >= minDist) break;
    }
  }

  if (!best) {
    best = { x: 50, y: 50 };
  }

  return {
    x: clamp(best.x, sinkBounds.xMin, sinkBounds.xMax),
    y: clamp(best.y, sinkBounds.yMin, sinkBounds.yMax),
    rotate: (Math.random() - 0.5) * 60,
    scale: clamp(1 + (Math.random() - 0.5) * 0.1, 0.94, 1.06),
    z: getMaxSinkZ() + 1,
    tilt: (Math.random() - 0.5) * 6,
    shadow: 0.26,
  };
}

function ensureSinkLayout(id) {
  state.sinkLayouts[id] ||= nextSinkLayout(id);
  return state.sinkLayouts[id];
}

function pickSequence(ruleKey) {
  if (rules[ruleKey]?.type === "exclude") return [];
  const pool = rules[ruleKey].pool();
  if (pool.length < SEQUENCE_LENGTH) return [];
  const sorted = shuffle(pool).sort((a, b) => rules[ruleKey].compare(a) - rules[ruleKey].compare(b));
  const total = SEQUENCE_LENGTH;
  const start = sorted.length > total ? Math.floor(Math.random() * (sorted.length - total + 1)) : 0;
  return sorted.slice(start, start + total).map((item) => item.id);
}

function campaignRuleForNextRound() {
  return CAMPAIGN_RULE_KEYS[Math.min(state.round, CAMPAIGN_RULE_KEYS.length - 1)];
}

function roundFeedbackText(rule) {
  if (rule.type === "exclude") return rule.hint[1] || rule.hint[0];
  if (rule.type === "process") return `${rule.scene || ""} ${rule.hint[0] || ""}`.trim();
  return "观察前三件，把剩下三个物品按规律补全";
}

function pickDistractorIds(rule, sequenceIds, count = 2) {
  const used = new Set(sequenceIds);
  const sequenceItems = sequenceIds.map((id) => itemById(id)).filter(Boolean);
  const answerProducts = new Set(sequenceItems.map((item) => item.product));
  const answerShapes = new Set(sequenceItems.map((item) => item.shapeType));
  const answerCategories = new Set(sequenceItems.map((item) => item.gameCategory));
  const answerStages = new Set(sequenceItems.map((item) => item.usageStage));

  const candidates = products
    .filter((item) => !used.has(item.id))
    .map((item) => {
      let score = Math.random();
      if (answerProducts.has(item.product)) score += 0.35;
      if (answerShapes.has(item.shapeType)) score += 0.25;
      if (answerCategories.has(item.gameCategory)) score += 0.2;
      if (answerStages.has(item.usageStage)) score -= 0.35;
      if (rule?.scene && !answerCategories.has(item.gameCategory)) score += 0.35;
      return { item, score };
    })
    .sort((a, b) => b.score - a.score);

  const picked = [];
  const seenProducts = new Set(answerProducts);
  for (const { item } of candidates) {
    if (picked.length >= count) break;
    if (seenProducts.has(item.product) && picked.length > 0) continue;
    picked.push(item.id);
    seenProducts.add(item.product);
  }
  return picked;
}

function startRound(ruleKey = "random", options = {}) {
  const { resetTimer = true } = options;
  const ruleKeys = ruleKey === "random"
    ? shuffle(Object.keys(rules).filter((k) => rules[k].type !== "exclude"))
    : [ruleKey, ...shuffle(Object.keys(rules).filter((key) => key !== ruleKey && rules[key].type !== "exclude"))];

  const rule = rules[ruleKey];
  if (rule && rule.type === "exclude") {
    const { matchingPool, nonMatchingPool } = rule.pool();
    if (matchingPool.length < 6) {
      els.feedback.textContent = "当前素材不足，无法生成清晰题目";
      return;
    }
    state.ruleKey = ruleKey;
    state.rule = rule;
    state.exampleIds = matchingPool.slice(0, 3).map((p) => p.id);
    const poolMatching = matchingPool.slice(3, 6);
    const poolDistractors = nonMatchingPool.slice(0, 12);
    state.answerIds = poolMatching.map((p) => p.id);
    state.sequenceIds = [...state.exampleIds, ...state.answerIds];
    state.pool = shuffle([...poolMatching, ...poolDistractors]).map((p) => p.id);
    state.slots = Array(ANSWER_COUNT).fill(null);
    state.sinkLayouts = buildSinkLayouts(state.pool);
    state.selectedId = null;
    state.draggedId = null;
    state.roundCleared = false;
    state.mistakes = 0;
    state.hints = 0;
    state.startedAt = Date.now();
    state.round += 1;
    els.feedback.textContent = roundFeedbackText(rule);
    els.modalKicker.textContent = "Level Clear";
    els.modalTitle.textContent = "整理完成";
    els.modal.classList.add("hidden");
    if (resetTimer) restartTimer(ROUND_SECONDS);
    render();
    return;
  }

  const picked = ruleKeys
    .map((key) => ({ key, sequenceIds: pickSequence(key) }))
    .find((entry) => entry.sequenceIds.length === SEQUENCE_LENGTH);
  if (!picked) {
    els.feedback.textContent = "当前素材不足，无法生成清晰题目";
    return;
  }
  state.ruleKey = picked.key;
  state.rule = rules[state.ruleKey];
  state.sequenceIds = picked.sequenceIds;

  state.exampleIds = state.sequenceIds.slice(0, EXAMPLE_COUNT);
  state.answerIds = state.sequenceIds.slice(EXAMPLE_COUNT, SEQUENCE_LENGTH);
  const distractorCount = state.rule.distractors ?? 0;
  state.pool = shuffle([...state.answerIds, ...pickDistractorIds(state.rule, state.sequenceIds, distractorCount)]);
  state.slots = Array(ANSWER_COUNT).fill(null);
  state.sinkLayouts = buildSinkLayouts(state.pool);
  state.selectedId = null;
  state.draggedId = null;
  state.roundCleared = false;
  state.mistakes = 0;
  state.hints = 0;
  state.startedAt = Date.now();
  state.round += 1;
  els.feedback.textContent = roundFeedbackText(state.rule);
  els.modalKicker.textContent = "Level Clear";
  els.modalTitle.textContent = "整理完成";
  els.modal.classList.add("hidden");
  if (resetTimer) {
    restartTimer(ROUND_SECONDS);
  }
  render();
}

function showSplash() {
  switchBgm("menu");
  state.mode = "splash";
  window.clearInterval(state.timerId);
  state.timerId = null;
  stopUrgentEffects();
  els.timer.classList.remove("danger");
  els.modal.classList.add("hidden");
  els.game.classList.add("hidden");
  els.homepage.classList.add("hidden");
  els.splash.classList.remove("hidden");
  els.endlessPanel.classList.add("hidden");
}

function showHomepage() {
  switchBgm("menu");
  state.mode = "home";
  state.round = 0;
  window.clearInterval(state.timerId);
  state.timerId = null;
  stopUrgentEffects();
  els.timer.classList.remove("danger");
  els.modal.classList.add("hidden");
  els.splash.classList.add("hidden");
  els.game.classList.add("hidden");
  els.homepage.classList.remove("hidden");
  els.homeCard.classList.remove("setup-open");
  els.endlessPanel.classList.add("hidden");
  els.levelSelectPanel.classList.add("hidden");
  els.freePanel.classList.add("hidden");
  els.freeItemPanel.classList.add("hidden");
  els.freePlayZone.classList.add("hidden");
  els.actionsFooter.classList.remove("hidden");
  els.freeActions.classList.add("hidden");
  els.stage.classList.remove("free-stage");
  document.querySelector(".sequence-zone")?.classList.remove("hidden");
  document.querySelector(".sink-zone")?.classList.remove("hidden");
  document.querySelector(".hud")?.classList.remove("hidden");
  els.pkPanel.classList.add("hidden");
  els.pkLobby.classList.add("hidden");
  els.pkStatus.classList.add("hidden");
  els.pkCountdownOverlay.classList.add("hidden");
  if (!state.profile) openRegisterModal();
}

function startCampaign() {
  switchBgm("game");
  state.mode = "campaign";
  const target = Math.max(1, Math.min(MAX_LEVEL, Number(state.selectedCampaignLevel) || 1));
  state.round = target - 1;
  state.endlessScore = 0;
  unlockAudio();
  els.splash.classList.add("hidden");
  els.homepage.classList.add("hidden");
  els.levelSelectPanel.classList.add("hidden");
  els.game.classList.remove("hidden");
  startRound(campaignRuleForNextRound());
}

function startEndless() {
  if (!ensureProfile()) return;
  switchBgm("game");
  state.mode = "endless";
  state.round = 0;
  state.endlessScore = 0;
  state.endlessDurationSeconds = state.selectedTimeSeconds;
  unlockAudio();
  els.splash.classList.add("hidden");
  els.homepage.classList.add("hidden");
  els.game.classList.remove("hidden");
  restartTimer(state.endlessDurationSeconds);
  startRound("random", { resetTimer: false });
}

function nextLevel() {
  if (state.round >= MAX_LEVEL) {
    showCampaignComplete();
    return;
  }
  startRound(campaignRuleForNextRound());
}

function restartTimer(seconds = ROUND_SECONDS) {
  window.clearInterval(state.timerId);
  stopUrgentEffects();
  state.timeLeft = seconds;
  state.timerId = window.setInterval(updateTimer, 1000);
  updateTimer();
}

function updateTimer() {
  const seconds = Math.max(0, state.timeLeft);
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const rest = String(seconds % 60).padStart(2, "0");
  els.timer.textContent = `${minutes}:${rest}`;
  els.timer.classList.toggle("danger", seconds <= 10 && seconds > 0);
  handleUrgentCountdown(seconds);
  if (seconds <= 0) {
    window.clearInterval(state.timerId);
    state.timerId = null;
    stopUrgentEffects();
    timeUp();
    return;
  }
  state.timeLeft -= 1;
}

function timeUp() {
  if (state.mode === "endless") {
    endEndlessRun();
    return;
  }
  if (state.mode !== "campaign") return;
  vibrateError();
  playDingDong();
  els.feedback.textContent = "时间到啦！";
  els.modalKicker.textContent = `Level ${state.round} / ${MAX_LEVEL}`;
  els.modalTitle.textContent = "时间到";
  els.modalNext.textContent = state.round >= MAX_LEVEL ? "再来一轮" : "下一关";
  const answerItems = state.answerIds.map((id) => itemById(id));
  const usedItems = state.sequenceIds.map((id) => itemById(id));
  els.summary.innerHTML = `
    <p>规则：${state.rule.title}</p>
    <p>正确补全：${answerItems.map((item) => item.product).join("、")}</p>
    <p>完整序列：${usedItems.map((item) => item.product).join("、")}</p>
    <h3 class="summary-heading">恭喜你获得图鉴</h3>
    ${renderProductIntroCards(usedItems)}
  `;
  els.modalHome.classList.remove("hidden");
  els.modal.classList.remove("hidden");
}

function render() {
  els.roundLabel.textContent =
    state.mode === "endless" ? `无限 ${state.endlessScore} 关` : `第 ${state.round} / ${MAX_LEVEL} 关`;
  const hintText = (state.rule?.type === "process" || state.rule?.type === "exclude")
    ? roundFeedbackText(state.rule) : "";
  els.roundHintBadge.textContent = hintText;
  els.roundHintBadge.classList.toggle("hidden", !hintText || state.mode === "pk-game");

  els.sequence.innerHTML = "";
  state.exampleIds.forEach((id) => {
    const slot = document.createElement("div");
    slot.className = "sequence-slot example-slot";
    slot.appendChild(createLipstick(itemById(id), { interactive: false, selectable: true }));
    els.sequence.appendChild(slot);
  });

  state.slots.forEach((id, index) => {
    const slot = document.createElement("div");
    slot.className = `sequence-slot answer-slot${id ? " filled" : ""}`;
    slot.dataset.index = String(index);
    slot.addEventListener("dragover", (event) => event.preventDefault());
    slot.addEventListener("drop", onDrop);
    slot.addEventListener("click", () => placeSelected(index));
    if (id) slot.appendChild(createLipstick(itemById(id), { interactive: true, placement: "slot" }));
    els.sequence.appendChild(slot);
  });

  els.pool.innerHTML = "";
  state.pool.forEach((id) => {
    els.pool.appendChild(createSinkItem(itemById(id), ensureSinkLayout(id)));
  });

  renderDetail();
  updateHintButton();
}

function hintTargetIndex() {
  const emptyIndex = state.slots.findIndex((id) => !id);
  if (emptyIndex !== -1) return emptyIndex;
  return state.slots.findIndex((id, index) => id !== state.answerIds[index]);
}

function updateHintButton() {
  const remaining = Math.max(0, MAX_HINTS - state.hints);
  const canUse = (state.mode === "campaign" || state.mode === "endless") && remaining > 0 && hintTargetIndex() !== -1;
  els.hintBtn.textContent = `提示 ${remaining}/${MAX_HINTS}`;
  els.hintBtn.disabled = !canUse;
}

function createLipstick(item, options) {
  const node = document.createElement("div");
  node.className = `lipstick${state.selectedId === item.id ? " selected" : ""}`;
  node.dataset.id = item.id;
  applyProductSizeVars(node, item);
  node.innerHTML = `
    <div class="lipstick-body">
      <img src="${item.image}" alt="${item.name}" draggable="false" loading="eager" />
      <span class="lipstick-tag">${item.product}</span>
    </div>
  `;

  if (options.interactive || options.selectable) {
    if (options.placement === "slot") {
      node.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
        startSlotDrag(event, item, node);
      });
    }
    node.addEventListener("click", (event) => {
      event.stopPropagation();
      if (node.dataset.suppressClick) {
        delete node.dataset.suppressClick;
        return;
      }
      if (options.placement === "slot") {
        const slotEl = node.closest(".answer-slot");
        const slotIndex = slotEl ? Number(slotEl.dataset.index) : -1;
        if (state.selectedId && state.selectedId !== item.id && slotIndex >= 0) {
          placeSelected(slotIndex);
        } else if (state.selectedId === item.id) {
          returnToSink(item.id);
        } else {
          selectItem(item.id);
        }
      } else {
        selectItem(item.id);
      }
    });
  }

  return node;
}

function pickItemAtPoint(clientX, clientY, primaryId) {
  const stack = document.elementsFromPoint(clientX, clientY)
    .map((el) => el.closest && el.closest(".sink-item"))
    .filter((el, i, arr) => el && arr.indexOf(el) === i)
    .map((el) => el.dataset.id)
    .filter(Boolean);

  if (stack.length <= 1) {
    return primaryId;
  }

  const key = `${Math.round(clientX / 8)}:${Math.round(clientY / 8)}`;
  if (state.lastClickKey === key && state.lastClickIds.length === stack.length) {
    state.lastClickIndex = (state.lastClickIndex + 1) % stack.length;
  } else {
    state.lastClickKey = key;
    state.lastClickIds = stack;
    state.lastClickIndex = 0;
  }
  return stack[state.lastClickIndex];
}

function getMaxSinkZ() {
  return Object.values(state.sinkLayouts).reduce((max, layout) => Math.max(max, layout?.z || 0), 0);
}

function startSinkDrag(event, item, wrapper) {
  if (event.button !== undefined && event.button !== 0) return;
  const layout = state.sinkLayouts[item.id];
  if (!layout) return;

  const startClientX = event.clientX;
  const startClientY = event.clientY;
  const startLayoutX = layout.x;
  const startLayoutY = layout.y;
  const baseTransform = getComputedStyle(wrapper).transform;
  const baseTransformPrefix = baseTransform && baseTransform !== "none" ? baseTransform : "";

  const slotCenters = Array.from(document.querySelectorAll(".answer-slot:not(.filled)")).map((slot) => {
    const r = slot.getBoundingClientRect();
    return {
      slot,
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      threshold: Math.max(80, Math.hypot(r.width, r.height) * 0.6),
    };
  });

  let hasMoved = false;
  let rafId = null;
  let pendingDx = 0;
  let pendingDy = 0;

  try { wrapper.setPointerCapture(event.pointerId); } catch (_) {}
  wrapper.classList.add("drag-armed");
  state.draggedId = item.id;

  function flush() {
    rafId = null;
    wrapper.style.transform =
      `translate3d(${pendingDx}px, ${pendingDy}px, 0) scale(1.04) ${baseTransformPrefix}`;

    const cx = startClientX + pendingDx;
    const cy = startClientY + pendingDy;
    let nearest = null;
    let nearestDist = Infinity;
    for (const s of slotCenters) {
      const d = Math.hypot(cx - s.cx, cy - s.cy);
      if (d < nearestDist) { nearestDist = d; nearest = s; }
    }
    document.querySelectorAll(".answer-slot.drop-near").forEach((el) => {
      if (!nearest || el !== nearest.slot) el.classList.remove("drop-near");
    });
    if (nearest && nearestDist <= nearest.threshold) {
      nearest.slot.classList.add("drop-near");
    }
  }

  function onMove(e) {
    const dx = e.clientX - startClientX;
    const dy = e.clientY - startClientY;
    if (!hasMoved && Math.hypot(dx, dy) > 4) {
      hasMoved = true;
      wrapper.classList.remove("drag-armed");
      wrapper.classList.add("dragging");
      wrapper.style.willChange = "transform";
    }
    if (!hasMoved) return;
    pendingDx = dx;
    pendingDy = dy;
    if (rafId == null) rafId = requestAnimationFrame(flush);
  }

  function cleanup() {
    if (rafId != null) cancelAnimationFrame(rafId);
    rafId = null;
    wrapper.removeEventListener("pointermove", onMove);
    wrapper.removeEventListener("pointerup", onUp);
    wrapper.removeEventListener("pointercancel", onCancel);
    wrapper.classList.remove("drag-armed", "dragging");
    wrapper.style.transform = "";
    wrapper.style.willChange = "";
    document.querySelectorAll(".answer-slot.drop-near").forEach((el) => el.classList.remove("drop-near"));
    state.draggedId = null;
    try { wrapper.releasePointerCapture(event.pointerId); } catch (_) {}
  }

  function onCancel() {
    cleanup();
  }

  function onUp(e) {
    if (!hasMoved) {
      cleanup();
      return;
    }
    wrapper.dataset.suppressClick = "1";
    wrapper.style.visibility = "hidden";
    const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
    wrapper.style.visibility = "";

    const slotEl = dropTarget && dropTarget.closest && dropTarget.closest(".answer-slot");
    const inSink = dropTarget && dropTarget.closest && dropTarget.closest(".sink-pile");

    if (slotEl) {
      cleanup();
      moveToSlot(item.id, Number(slotEl.dataset.index));
      return;
    }

    if (inSink) {
      const sinkRect = els.pool.getBoundingClientRect();
      const newX = clamp(startLayoutX + ((e.clientX - startClientX) / sinkRect.width) * 100, sinkBounds.xMin, sinkBounds.xMax);
      const newY = clamp(startLayoutY + ((e.clientY - startClientY) / sinkRect.height) * 100, sinkBounds.yMin, sinkBounds.yMax);
      state.sinkLayouts[item.id] = {
        ...layout,
        x: newX,
        y: newY,
        z: getMaxSinkZ() + 1,
      };
      cleanup();
      render();
      return;
    }

    if (dropTarget && dropTarget.closest && dropTarget.closest(".stage") && !isBlockedDropTarget(dropTarget)) {
      const sinkRect = els.pool.getBoundingClientRect();
      const newX = clamp(((e.clientX - sinkRect.left) / sinkRect.width) * 100, sinkBounds.xMin, sinkBounds.xMax);
      const newY = clamp(((e.clientY - sinkRect.top) / sinkRect.height) * 100, sinkBounds.yMin, sinkBounds.yMax);
      state.sinkLayouts[item.id] = {
        ...layout,
        x: newX,
        y: newY,
        z: getMaxSinkZ() + 1,
      };
      state.selectedId = null;
      cleanup();
      render();
      return;
    }

    cleanup();
    state.selectedId = null;
    render();
  }

  wrapper.addEventListener("pointermove", onMove);
  wrapper.addEventListener("pointerup", onUp);
  wrapper.addEventListener("pointercancel", onCancel);
}

function startSlotDrag(event, item, wrapper) {
  if (event.button !== undefined && event.button !== 0) return;
  const sourceSlotIndex = state.slots.indexOf(item.id);
  if (sourceSlotIndex === -1) return;

  const startClientX = event.clientX;
  const startClientY = event.clientY;

  const slotCenters = Array.from(document.querySelectorAll(".answer-slot"))
    .map((slot) => {
      const idx = Number(slot.dataset.index);
      if (idx === sourceSlotIndex) return null;
      const r = slot.getBoundingClientRect();
      return {
        slot,
        cx: r.left + r.width / 2,
        cy: r.top + r.height / 2,
        threshold: Math.max(80, Math.hypot(r.width, r.height) * 0.6),
      };
    })
    .filter(Boolean);

  let hasMoved = false;
  let rafId = null;
  let pendingDx = 0;
  let pendingDy = 0;

  try { wrapper.setPointerCapture(event.pointerId); } catch (_) {}
  wrapper.classList.add("drag-armed");
  state.draggedId = item.id;

  function flush() {
    rafId = null;
    wrapper.style.transform =
      `translate3d(${pendingDx}px, ${pendingDy}px, 0) scale(1.04)`;
    const cx = startClientX + pendingDx;
    const cy = startClientY + pendingDy;
    let nearest = null;
    let nearestDist = Infinity;
    for (const s of slotCenters) {
      const d = Math.hypot(cx - s.cx, cy - s.cy);
      if (d < nearestDist) { nearestDist = d; nearest = s; }
    }
    document.querySelectorAll(".answer-slot.drop-near").forEach((el) => {
      if (!nearest || el !== nearest.slot) el.classList.remove("drop-near");
    });
    if (nearest && nearestDist <= nearest.threshold) {
      nearest.slot.classList.add("drop-near");
    }
  }

  function onMove(e) {
    const dx = e.clientX - startClientX;
    const dy = e.clientY - startClientY;
    if (!hasMoved && Math.hypot(dx, dy) > 4) {
      hasMoved = true;
      wrapper.classList.remove("drag-armed");
      wrapper.classList.add("dragging");
      wrapper.style.willChange = "transform";
      wrapper.style.zIndex = "9999";
    }
    if (!hasMoved) return;
    pendingDx = dx;
    pendingDy = dy;
    if (rafId == null) rafId = requestAnimationFrame(flush);
  }

  function cleanup() {
    if (rafId != null) cancelAnimationFrame(rafId);
    rafId = null;
    wrapper.removeEventListener("pointermove", onMove);
    wrapper.removeEventListener("pointerup", onUp);
    wrapper.removeEventListener("pointercancel", onCancel);
    wrapper.classList.remove("drag-armed", "dragging");
    wrapper.style.transform = "";
    wrapper.style.willChange = "";
    wrapper.style.zIndex = "";
    document.querySelectorAll(".answer-slot.drop-near").forEach((el) => el.classList.remove("drop-near"));
    state.draggedId = null;
    try { wrapper.releasePointerCapture(event.pointerId); } catch (_) {}
  }

  function onCancel() { cleanup(); }

  function onUp(e) {
    if (!hasMoved) { cleanup(); return; }
    wrapper.dataset.suppressClick = "1";
    wrapper.style.visibility = "hidden";
    const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
    wrapper.style.visibility = "";

    const slotEl = dropTarget && dropTarget.closest && dropTarget.closest(".answer-slot");
    const inSink = dropTarget && dropTarget.closest && dropTarget.closest(".sink-pile");

    if (slotEl) {
      const targetIndex = Number(slotEl.dataset.index);
      cleanup();
      if (targetIndex !== sourceSlotIndex) {
        moveToSlot(item.id, targetIndex);
      } else {
        render();
      }
      return;
    }

    if (inSink) {
      const sinkRect = els.pool.getBoundingClientRect();
      const dropX = clamp(((e.clientX - sinkRect.left) / sinkRect.width) * 100, sinkBounds.xMin, sinkBounds.xMax);
      const dropY = clamp(((e.clientY - sinkRect.top) / sinkRect.height) * 100, sinkBounds.yMin, sinkBounds.yMax);

      const slotIndex = state.slots.indexOf(item.id);
      if (slotIndex === -1) { cleanup(); render(); return; }

      const fromRect = lipstickRect(item.id);
      state.slots[slotIndex] = null;
      if (!state.pool.includes(item.id)) state.pool.push(item.id);

      const existing = state.sinkLayouts[item.id] || {};
      state.sinkLayouts[item.id] = {
        x: dropX,
        y: dropY,
        rotate: existing.rotate ?? (Math.random() - 0.5) * 60,
        scale: existing.scale ?? clamp(1 + (Math.random() - 0.5) * 0.1, 0.94, 1.06),
        z: getMaxSinkZ() + 1,
        tilt: existing.tilt ?? (Math.random() - 0.5) * 6,
        shadow: 0.26,
      };

      state.selectedId = null;
      state.draggedId = null;
      clearSlotMarks();
      els.feedback.textContent = "放回洗手盆，重新挑选";
      cleanup();
      render();
      animateFromRect(item.id, fromRect);
      return;
    }

    cleanup();
    render();
  }

  wrapper.addEventListener("pointermove", onMove);
  wrapper.addEventListener("pointerup", onUp);
  wrapper.addEventListener("pointercancel", onCancel);
}

function createSinkItem(item, layout) {
  const wrapper = document.createElement("div");
  wrapper.className = `sink-item lipstick${state.selectedId === item.id ? " selected" : ""}`;
  wrapper.dataset.id = item.id;
  applyProductSizeVars(wrapper, item);
  wrapper.style.setProperty("--x", `${layout.x}%`);
  wrapper.style.setProperty("--y", `${layout.y}%`);
  wrapper.style.setProperty("--rotate", `${layout.rotate}deg`);
  wrapper.style.setProperty("--scale", layout.scale);
  wrapper.style.setProperty("--z", layout.z);
  wrapper.style.setProperty("--tilt", `${layout.tilt}deg`);
  wrapper.style.setProperty("--shadow-strength", layout.shadow);
  wrapper.innerHTML = `
    <div class="lipstick-body">
      <img src="${item.image}" alt="${item.name}" draggable="false" loading="eager" />
      <span class="lipstick-tag">${item.product}</span>
    </div>
  `;

  wrapper.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    startSinkDrag(event, item, wrapper);
  });

  wrapper.addEventListener("click", (event) => {
    event.stopPropagation();
    if (wrapper.dataset.suppressClick) {
      delete wrapper.dataset.suppressClick;
      return;
    }
    const targetId = pickItemAtPoint(event.clientX, event.clientY, item.id);
    selectItem(targetId);
  });

  wrapper.addEventListener("dblclick", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const emptyIndex = state.slots.findIndex((s) => !s);
    if (emptyIndex === -1) {
      els.feedback.textContent = "格子已满，先放回一支再继续";
      return;
    }
    moveToSlot(item.id, emptyIndex, "双击放好啦");
  });

  return wrapper;
}

function selectItem(id) {
  state.selectedId = state.selectedId === id ? null : id;
  render();
}

function liftHoveredStacks(clientX, clientY) {
  // 当 hover 一个被压住的物品，把上方挡住的稍微移开，方便点到
  const stack = document.elementsFromPoint(clientX, clientY)
    .map((el) => el.closest && el.closest(".sink-item"))
    .filter((el, i, arr) => el && arr.indexOf(el) === i);
  document.querySelectorAll(".sink-item.peeking").forEach((el) => {
    if (!stack.includes(el)) el.classList.remove("peeking");
  });
  if (stack.length > 1) {
    stack[0].classList.add("peeking");
  }
}

function renderDetail() {
  const item = itemById(state.selectedId);
  if (!item) {
    els.detailName.textContent = "点击物品以显示详细信息";
    els.detailAdvice.textContent = "";
    return;
  }
  els.detailName.textContent = escapeHtml(item.product);
  els.detailAdvice.textContent = [
    `品类：${item.category}`,
    `归属：${item.bigCategory}`,
    `功能：${productFunction(item)}`,
  ].join(" ");
}

function formatCapacity(item) {
  return item.capacityMl > 0 ? `容量约 ${item.capacityMl}ml` : "无固定容量";
}

function productFunction(item) {
  return item.display.advice;
}

function productUseSuggestion(item) {
  const suggestions = {
    洗面奶: "作为护肤第一步使用，清洁后冲洗干净。",
    洁面慕斯: "作为护肤第一步使用，按压起泡后清洁再冲洗。",
    爽肤水: "洁面后使用，轻拍帮助后续护肤衔接。",
    精华液: "爽肤水后使用，少量涂抹在重点护理区域。",
    乳液: "精华后、面霜前使用，帮助补水和柔润肌肤。",
    面霜: "乳液后使用，作为基础护肤的锁水步骤。",
    防晒霜: "白天护肤最后一步使用，出门前均匀涂抹。",
    粉底液: "底妆阶段使用，少量多次均匀推开。",
    散粉: "底妆后轻扫，用于定妆和减少油光。",
    腮红: "底妆后用于面颊，少量叠加提升气色。",
    口红: "妆容后段用于唇部，按整体妆色选择深浅。",
    睫毛膏: "眼妆阶段使用，从睫毛根部向外刷开。",
    假睫毛: "眼妆阶段使用，贴合眼型后再微调。",
    香水: "整体整理最后使用，少量喷在手腕或衣物外侧。",
  };
  if (suggestions[item.product]) return suggestions[item.product];
  if (item.bigCategory === "工具") return "配合对应流程使用，用后清洁并收纳。";
  if (item.bigCategory === "洗护") return "按清洁到护理的顺序使用，用后冲洗或整理。";
  if (item.bigCategory === "美妆") return "按底妆、眼妆、面部彩妆、唇妆的顺序搭配使用。";
  return "根据产品所属流程使用，注意用量和顺序。";
}

function renderProductIntroCards(items) {
  return `
    <div class="product-intro">
      ${items.map((item) => `
        <article class="intro-card">
          <img src="${item.image}" alt="${escapeHtml(item.name)}" />
          <div>
            <h3>${escapeHtml(item.product)}</h3>
            <ul>
              <li>品类：${escapeHtml(item.category)} / ${escapeHtml(item.bigCategory)}</li>
              <li>功能：${escapeHtml(productFunction(item))}</li>
              <li>建议用法：${escapeHtml(productUseSuggestion(item))}</li>
            </ul>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function onDrop(event) {
  event.preventDefault();
  const id = state.draggedId || event.dataTransfer.getData("text/plain");
  moveToSlot(id, Number(event.currentTarget.dataset.index));
}

function placeSelected(index) {
  if (!state.selectedId) return;
  moveToSlot(state.selectedId, index);
}

function lipstickBody(id) {
  return document.querySelector(`.lipstick[data-id="${id}"] .lipstick-body`);
}

function lipstickRect(id) {
  return lipstickBody(id)?.getBoundingClientRect() || null;
}

function animateFromRect(id, fromRect) {
  if (!fromRect) return;
  window.requestAnimationFrame(() => {
    const body = lipstickBody(id);
    if (!body) return;
    const toRect = body.getBoundingClientRect();
    const dx = fromRect.left + fromRect.width / 2 - (toRect.left + toRect.width / 2);
    const dy = fromRect.top + fromRect.height / 2 - (toRect.top + toRect.height / 2);
    const scale = clamp(fromRect.width / Math.max(toRect.width, 1), 0.72, 1.35);
    const host = body.closest(".lipstick");
    host?.classList.add("is-flying");
    const animation = body.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.96 },
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
      ],
      {
        duration: 220,
        easing: "cubic-bezier(0.83, 0, 0.17, 1)",
      }
    );
    animation.addEventListener("finish", () => host?.classList.remove("is-flying"), { once: true });
    animation.addEventListener("cancel", () => host?.classList.remove("is-flying"), { once: true });
  });
}

function returnToSink(id) {
  const slotIndex = state.slots.indexOf(id);
  if (slotIndex === -1) return;

  const fromRect = lipstickRect(id);
  state.slots[slotIndex] = null;
  if (!state.pool.includes(id)) {
    state.pool.push(id);
  }
  state.sinkLayouts[id] = nextSinkLayout(id);
  state.selectedId = null;
  state.draggedId = null;
  clearSlotMarks();
  els.feedback.textContent = "放回洗手盆，重新挑选";
  render();
  animateFromRect(id, fromRect);
}

function moveToSlot(id, index, feedback = "咔哒，放好了") {
  const movingFromRect = lipstickRect(id);
  const poolIndex = state.pool.indexOf(id);
  const slotIndex = state.slots.indexOf(id);
  const replaced = state.slots[index];
  const replacedFromRect = replaced ? lipstickRect(replaced) : null;

  if (poolIndex > -1) {
    state.pool.splice(poolIndex, 1);
  } else if (slotIndex > -1) {
    state.slots[slotIndex] = null;
  } else {
    return;
  }

  if (replaced) {
    if (slotIndex > -1) {
      state.slots[slotIndex] = replaced;
    } else {
      state.pool.push(replaced);
      state.sinkLayouts[replaced] = nextSinkLayout(replaced);
    }
  }

  state.slots[index] = id;
  state.selectedId = null;
  clearSlotMarks();
  els.feedback.textContent = feedback;
  playPlaceSound();
  bump("camera-bump");
  render();
  animateFromRect(id, movingFromRect);
  if (replaced) animateFromRect(replaced, replacedFromRect);
}

function clearSlotMarks() {
  document.querySelectorAll(".answer-slot").forEach((slot) => {
    slot.classList.remove("correct", "wrong");
  });
}

function checkAnswer() {
  if (!state.slots.every(Boolean)) {
    els.feedback.textContent = `还有 ${state.slots.filter((s) => !s).length} 个空位没有摆`;
    return;
  }

  if (state.rule.type === "exclude") {
    const criterion = state.rule.criterion;
    let correct = true;
    document.querySelectorAll(".answer-slot").forEach((slot, index) => {
      const item = itemById(state.slots[index]);
      const ok = item && criterion(item);
      slot.classList.toggle("correct", ok);
      slot.classList.toggle("wrong", !ok);
      if (!ok) correct = false;
    });
    if (correct) {
      finishRound();
    } else {
      state.mistakes += 1;
      els.feedback.textContent = "有物品不符合条件，再找找";
      playErrorBuzz();
      vibrateError();
      bump("camera-error");
    }
    return;
  }

  let correct = true;
  document.querySelectorAll(".answer-slot").forEach((slot, index) => {
    const ok = state.slots[index] === state.answerIds[index];
    slot.classList.toggle("correct", ok);
    slot.classList.toggle("wrong", !ok);
    if (!ok) correct = false;
  });

  if (correct) {
    finishRound();
  } else {
    state.mistakes += 1;
    els.feedback.textContent = "补全顺序还不对";
    playErrorBuzz();
    vibrateError();
    bump("camera-error");
  }
}

function finishRound() {
  if (state.mode === "endless") {
    finishEndlessRound();
    return;
  }
  if (state.mode === "pk-game") {
    state.pk.levelsCompleted += 1;
    bump("camera-win");
    playPlaceSound();
    submitPkProgress();
    if (state.pk.levelsCompleted < state.pk.targetLevels) {
      window.setTimeout(() => {
        if (state.mode === "pk-game") startPkRound();
      }, 600);
    }
    return;
  }
  window.clearInterval(state.timerId);
  state.timerId = null;
  stopUrgentEffects();
  els.timer.classList.remove("danger");
  if (state.mode === "campaign") {
    markCampaignComplete(state.round);
  }
  recordSeenProducts();
  const used = ROUND_SECONDS - Math.max(0, state.timeLeft + 1);
  const usedItems = state.sequenceIds.map((id) => itemById(id));
  state.roundCleared = true;
  bump("camera-win");
  playWinSound();

  els.modalKicker.textContent = `Level ${state.round} / ${MAX_LEVEL}`;
  els.modalTitle.textContent = "整理完成";
  els.modalNext.textContent = state.round >= MAX_LEVEL ? "通关总结" : "下一关";
  els.modalNext.classList.remove("hidden");
  els.summary.innerHTML = `
    <p>规则：${state.rule.title}</p>
    <p>用时：${Math.floor(used / 60)}分${used % 60}秒</p>
    <p>错误：${state.mistakes}，提示：${state.hints}</p>
    <p>完整序列：${usedItems.map((item) => item.product).join("、")}</p>
    <h3 class="summary-heading">恭喜你获得图鉴</h3>
    ${renderProductIntroCards(usedItems)}
  `;
  els.modalHome.classList.remove("hidden");
  els.modal.classList.remove("hidden");
}

function finishEndlessRound() {
  recordSeenProducts();
  state.endlessScore += 1;
  clearSlotMarks();
  els.feedback.textContent = `已通过 ${state.endlessScore} 关`;
  bump("camera-win");
  playWinSound();
  window.setTimeout(() => {
    if (state.mode === "endless" && state.timeLeft > 0) {
      startRound("random", { resetTimer: false });
    }
  }, 260);
}

function showCampaignComplete() {
  state.mode = "campaign-complete";
  window.clearInterval(state.timerId);
  state.timerId = null;
  stopUrgentEffects();
  els.timer.classList.remove("danger");
  els.modalKicker.textContent = "Campaign Clear";
  els.modalTitle.textContent = "通关啦！";
  playCampaignCompleteSound();
  els.modalNext.textContent = "再来一轮";
  els.summary.innerHTML = `
    <p>恭喜完成全部 ${MAX_LEVEL} 关闯关</p>
    <p>你已经掌握了美妆洗护台的主要整理规律。</p>
  `;
  els.modalHome.classList.remove("hidden");
  els.modal.classList.remove("hidden");
}

async function endEndlessRun() {
  stopUrgentEffects();
  els.timer.classList.remove("danger");
  playDingDong();
  state.mode = "endless-result";
  const record = buildScoreRecord(state.endlessScore, state.endlessDurationSeconds);
  const leaderboard = await submitLeaderboardScore(record);
  els.modalKicker.textContent = "Endless Result";
  els.modalTitle.textContent = "无限挑战结束";
  els.modalNext.textContent = "再来一次";
  els.modalNext.classList.remove("hidden");
  els.summary.innerHTML = `
    <p>${state.profile.avatar} ${escapeHtml(state.profile.name)}</p>
    <p>挑战时间：${formatDuration(state.endlessDurationSeconds)}</p>
    <p>通过关数：${state.endlessScore}</p>
    <div class="mini-board">${renderLeaderboardRows(leaderboard.slice(0, 5))}</div>
  `;
  els.modalHome.classList.remove("hidden");
  els.modal.classList.remove("hidden");
}

function buildScoreRecord(score, durationSeconds) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    avatar: state.profile.avatar,
    name: state.profile.name,
    score,
    durationSeconds,
    createdAt: new Date().toISOString(),
  };
}

async function submitLeaderboardScore(record) {
  const localRecords = saveLocalScore(record);
  if (!LEADERBOARD_API) return localRecords;

  try {
    const response = await fetch(LEADERBOARD_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
    if (!response.ok) throw new Error("leaderboard submit failed");
    const data = await response.json();
    return normalizeLeaderboard(data.records || data);
  } catch (_) {
    return localRecords;
  }
}

async function loadLeaderboard() {
  if (LEADERBOARD_API) {
    try {
      const response = await fetch(LEADERBOARD_API);
      if (!response.ok) throw new Error("leaderboard fetch failed");
      const data = await response.json();
      return normalizeLeaderboard(data.records || data);
    } catch (_) {}
  }
  return getLocalLeaderboard();
}

function saveLocalScore(record) {
  const records = normalizeLeaderboard([...getLocalLeaderboard(), record]);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(records.slice(0, 50)));
  return records;
}

function getLocalLeaderboard() {
  try {
    return normalizeLeaderboard(JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]"));
  } catch (_) {
    return [];
  }
}

function normalizeLeaderboard(records) {
  if (!Array.isArray(records)) return [];
  return records
    .filter((record) => record && Number.isFinite(Number(record.score)))
    .map((record) => ({
      id: record.id || `${record.name}-${record.createdAt || ""}`,
      avatar: record.avatar || AVATARS[0],
      name: String(record.name || "匿名玩家").slice(0, 12),
      score: Number(record.score),
      durationSeconds: Number(record.durationSeconds) || 60,
      createdAt: record.createdAt || "",
    }))
    .sort((a, b) => b.score - a.score || b.durationSeconds - a.durationSeconds || String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function showLeaderboard() {
  els.leaderboardKicker.textContent = LEADERBOARD_API ? "Online Leaderboard" : "Local Leaderboard";
  els.leaderboardList.innerHTML = `<div class="empty-board">加载中...</div>`;
  els.leaderboardModal.classList.remove("hidden");
  const records = await loadLeaderboard();
  els.leaderboardList.innerHTML = renderLeaderboardRows(records.slice(0, 20));
}

function renderLeaderboardRows(records) {
  if (!records.length) {
    return `<div class="empty-board">暂无成绩，先来一局无限模式</div>`;
  }
  return records.map((record, index) => `
    <div class="leader-row">
      <span class="leader-rank">${index + 1}</span>
      <span class="leader-avatar">${escapeHtml(record.avatar)}</span>
      <span class="leader-name">${escapeHtml(record.name)}</span>
      <span class="leader-score">${record.score} 关</span>
    </div>
  `).join("");
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes}分${rest}秒` : `${minutes}分钟`;
}

function showHint() {
  if (state.hints >= MAX_HINTS) {
    els.feedback.textContent = "本轮提示已用完";
    updateHintButton();
    return;
  }

  const targetIndex = hintTargetIndex();
  if (targetIndex === -1) {
    els.feedback.textContent = "不需要提示了";
    updateHintButton();
    return;
  }

  state.hints += 1;
  moveToSlot(state.answerIds[targetIndex], targetIndex, `提示已放上正确物品，还剩 ${MAX_HINTS - state.hints} 次`);
  updateHintButton();
}

function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
    if (saved?.name && saved?.avatar) {
      state.profile = {
        name: String(saved.name).slice(0, 12),
        avatar: AVATARS.includes(saved.avatar) ? saved.avatar : AVATARS[0],
      };
    }
  } catch (_) {
    state.profile = null;
  }
  renderProfile();
}

function renderProfile() {
  const avatarChar = state.profile ? escapeHtml(state.profile.avatar) : '?';
  els.profileBadge.innerHTML = `<span class="profile-avatar-mini">${avatarChar}</span><span>设置</span>`;
  if (els.profileAvatar) els.profileAvatar.textContent = avatarChar;
}

function ensureProfile() {
  if (state.profile) return true;
  openRegisterModal();
  return false;
}

function openRegisterModal() {
  state.selectedAvatar = state.profile?.avatar || state.selectedAvatar || AVATARS[0];
  els.playerNameInput.value = state.profile?.name || "";
  els.registerError.textContent = "";
  els.registerTitle.textContent = state.profile ? "编辑玩家档案" : "创建玩家档案";
  document.getElementById("logoutBtn").style.display = state.profile ? "" : "none";
  renderAvatarChoices();
  els.registerModal.classList.remove("hidden");
  window.setTimeout(() => els.playerNameInput.focus(), 30);
}

function renderAvatarChoices() {
  els.avatarChoices.innerHTML = AVATARS.map((avatar) => `
    <button class="avatar-choice${avatar === state.selectedAvatar ? " selected" : ""}" data-avatar="${avatar}" type="button">${avatar}</button>
  `).join("");
}

function saveProfile() {
  const name = els.playerNameInput.value.trim().slice(0, 12);
  if (!name) {
    els.registerError.textContent = "请输入昵称";
    return;
  }
  state.profile = { name, avatar: state.selectedAvatar };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(state.profile));
  renderProfile();
  els.registerModal.classList.add("hidden");
}

function populateCustomMinutes() {
  els.customMinuteWheel.innerHTML = Array.from({ length: 30 }, (_, index) => {
    const minutes = index + 1;
    return `<option value="${minutes}">${minutes} 分钟</option>`;
  }).join("");
  els.customMinuteWheel.value = "10";
}

function setEndlessTime(seconds, custom = false) {
  state.selectedTimeSeconds = seconds;
  document.querySelectorAll(".time-option").forEach((button) => {
    const selected = custom ? button.dataset.custom === "true" : Number(button.dataset.seconds) === seconds;
    button.classList.toggle("selected", selected);
  });
  els.customTimeWrap.classList.toggle("hidden", !custom);
}

function loadCampaignProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(CAMPAIGN_PROGRESS_KEY) || "[]");
    state.campaignProgress = Array.isArray(saved)
      ? saved.filter((n) => Number.isInteger(n) && n >= 1 && n <= MAX_LEVEL)
      : [];
  } catch (_) {
    state.campaignProgress = [];
  }
}

function saveCampaignProgress() {
  try {
    localStorage.setItem(CAMPAIGN_PROGRESS_KEY, JSON.stringify(state.campaignProgress));
  } catch (_) {}
}

function loadCatalogSeen() {
  try {
    const arr = JSON.parse(localStorage.getItem(CATALOG_SEEN_KEY) || "[]");
    state.catalogSeen = new Set(Array.isArray(arr) ? arr : []);
  } catch (_) { state.catalogSeen = new Set(); }
}

function saveCatalogSeen() {
  try { localStorage.setItem(CATALOG_SEEN_KEY, JSON.stringify([...state.catalogSeen])); } catch (_) {}
}

function recordSeenProducts() {
  state.sequenceIds.forEach((id) => {
    const item = itemById(id);
    if (item) state.catalogSeen.add(item.product);
  });
  saveCatalogSeen();
}

function markCampaignComplete(level) {
  if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) return;
  if (!state.campaignProgress.includes(level)) {
    state.campaignProgress.push(level);
    state.campaignProgress.sort((a, b) => a - b);
    saveCampaignProgress();
  }
}

function maxUnlockedLevel() {
  if (!state.campaignProgress.length) return 1;
  return Math.min(MAX_LEVEL, Math.max(...state.campaignProgress) + 1);
}

function renderLevelGrid() {
  const unlocked = maxUnlockedLevel();
  if (!state.selectedCampaignLevel
      || state.selectedCampaignLevel > unlocked
      || state.selectedCampaignLevel > MAX_LEVEL) {
    state.selectedCampaignLevel = unlocked;
  }
  els.levelSelectHint.textContent = `选择要挑战的关卡（已通关：${state.campaignProgress.length} / ${MAX_LEVEL}）`;
  els.levelGrid.innerHTML = "";
  for (let level = 1; level <= MAX_LEVEL; level += 1) {
    const completed = state.campaignProgress.includes(level);
    const isUnlocked = level <= unlocked;
    const isSelected = level === state.selectedCampaignLevel;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "level-card";
    button.dataset.level = String(level);
    if (completed) button.classList.add("completed");
    if (!isUnlocked) {
      button.classList.add("locked");
      button.disabled = true;
    } else {
      button.classList.add("unlocked");
    }
    if (isSelected) button.classList.add("selected");
    button.innerHTML = `<span class="level-number">${level}</span><span class="level-status">${
      completed ? "★" : isUnlocked ? "" : "🔒"
    }</span>`;
    if (isUnlocked) {
      button.addEventListener("click", () => {
        playUiClickSound();
        state.selectedCampaignLevel = level;
        renderLevelGrid();
      });
    }
    els.levelGrid.appendChild(button);
  }
}

function openLevelSelectPanel() {
  loadCampaignProgress();
  if (!state.selectedCampaignLevel) state.selectedCampaignLevel = maxUnlockedLevel();
  renderLevelGrid();
  els.endlessPanel.classList.add("hidden");
  els.levelSelectPanel.classList.remove("hidden");
}

function applyScene(sceneId) {
  const scene = SCENES.find((s) => s.id === sceneId);
  if (!scene) return;
  state.currentSceneId = scene.id;
  els.stage.style.setProperty("--stage-bg", `url("${scene.image}")`);
  try { localStorage.setItem(CURRENT_SCENE_KEY, scene.id); } catch (_) {}
}

function loadSavedScene() {
  try {
    const id = localStorage.getItem(CURRENT_SCENE_KEY);
    if (id && SCENES.find((s) => s.id === id)) {
      applyScene(id);
    }
  } catch (_) {}
}

function renderSceneSelector() {
  loadCampaignProgress();
  els.sceneModalGrid.innerHTML = "";
  SCENES.forEach((scene) => {
    const unlocked = isSceneUnlocked(scene);
    const card = document.createElement("button");
    card.type = "button";
    card.className = `scene-card${unlocked ? "" : " locked"}${state.currentSceneId === scene.id ? " selected" : ""}`;
    card.disabled = !unlocked;
    card.innerHTML = `
      <div class="scene-thumb" style="background-image:url('${scene.image}');"></div>
      <span class="scene-name">${escapeHtml(scene.name)}</span>
      <span class="scene-desc">${unlocked ? escapeHtml(scene.desc) : `通关 ${scene.unlockLevel} 关解锁`}</span>
    `;
    if (unlocked) {
      card.addEventListener("click", () => {
        playUiClickSound();
        applyScene(scene.id);
        renderSceneSelector();
      });
    }
    els.sceneModalGrid.appendChild(card);
  });
}

function showSceneSelector() {
  renderSceneSelector();
  els.sceneModal.classList.remove("hidden");
}

function closeSceneSelector() {
  els.sceneModal.classList.add("hidden");
}

function isSceneUnlocked(scene) {
  if (!scene) return false;
  return maxCompletedLevel() >= (scene.unlockLevel || 1);
}

function maxCompletedLevel() {
  return state.campaignProgress.length ? Math.max(...state.campaignProgress) : 0;
}

function isCategoryUnlocked(bigCategory) {
  const threshold = CATEGORY_UNLOCK[bigCategory] || 1;
  return maxCompletedLevel() + 1 >= threshold;
}

function categoryUnlockLevel(bigCategory) {
  return CATEGORY_UNLOCK[bigCategory] || 1;
}

function loadMemories() {
  try {
    const saved = JSON.parse(localStorage.getItem(MEMORIES_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (_) {
    return [];
  }
}

function loadPkHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(PK_HISTORY_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (_) {
    return [];
  }
}

function renderCatalog() {
  loadCatalogSeen();
  const groups = new Map();
  (window.PRODUCTS || []).forEach((item) => {
    const bigCat = item.bigCategory || "其他";
    if (!groups.has(bigCat)) groups.set(bigCat, new Map());
    const byProduct = groups.get(bigCat);
    if (!byProduct.has(item.product)) byProduct.set(item.product, item);
  });

  const totalProducts = new Set((window.PRODUCTS || []).map((p) => p.product)).size;
  const seenCount = state.catalogSeen.size;
  const headerHtml = `<p class="collection-summary">已收录：${seenCount} / ${totalProducts} 种</p>`;
  const sectionsHtml = Array.from(groups.entries()).map(([bigCat, byProduct]) => {
    const cards = Array.from(byProduct.values()).map((rep) => {
      const seen = state.catalogSeen.has(rep.product);
      const repClass = seen ? "catalog-card" : "catalog-card locked";
      const image = seen
        ? `<img src="${rep.image}" alt="${escapeHtml(rep.product)}" loading="lazy" />`
        : `<span class="question-mark">?</span>`;
      const label = seen ? escapeHtml(rep.product) : "???";
      return `<div class="${repClass}">${image}<span class="catalog-label">${label}</span></div>`;
    }).join("");
    return `
      <section class="catalog-category">
        <header class="catalog-category-header">
          <h3>${escapeHtml(bigCat)}</h3>
        </header>
        <div class="catalog-grid">${cards}</div>
      </section>
    `;
  }).join("");

  els.collectionBody.innerHTML = headerHtml + sectionsHtml;
}

function openMemoryFullscreen(src) {
  const overlay = document.querySelector("#memoryFullscreen");
  const img = document.querySelector("#memoryFullscreenImg");
  if (!overlay || !img) return;
  img.src = src;
  overlay.classList.remove("hidden");
}

function closeMemoryFullscreen() {
  const overlay = document.querySelector("#memoryFullscreen");
  if (overlay) overlay.classList.add("hidden");
}

function renderMemories() {
  const memories = loadMemories();
  if (!memories.length) {
    els.collectionBody.innerHTML = `<div class="empty-board">还没有回忆，去自由模式拍照保存吧</div>`;
    return;
  }
  els.collectionBody.innerHTML = `<div class="memory-list">${memories.map((m) => `
    <div class="memory-card" data-id="${escapeHtml(m.id || "")}">
      <img class="memory-preview" src="${m.photoDataUrl}" alt="${escapeHtml(m.name || "回忆")}" />
      <button class="memory-delete" data-delete="${escapeHtml(m.id || "")}" type="button" aria-label="删除回忆">×</button>
      <div class="memory-meta">
        <span class="memory-name">${escapeHtml(m.name || "回忆")}</span>
        <span class="memory-date">${escapeHtml(m.dateLabel || "")}</span>
      </div>
    </div>
  `).join("")}</div>`;
  els.collectionBody.querySelectorAll(".memory-delete").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      playUiClickSound();
      confirmDeleteMemory(btn.dataset.delete);
    });
  });
  els.collectionBody.querySelectorAll(".memory-preview").forEach((img) => {
    img.addEventListener("click", () => openMemoryFullscreen(img.src));
  });
}

function renderPkHistoryTab() {
  const history = loadPkHistory();
  if (!history.length) {
    els.collectionBody.innerHTML = `<div class="empty-board">还没有 PK 战绩，去 PK 模式约战吧</div>`;
    return;
  }
  els.collectionBody.innerHTML = `<div class="pk-history-list">${history.map((r) => {
    const cls = r.result === "win" ? "win" : r.result === "lose" ? "lose" : "draw";
    const label = r.result === "win" ? "胜" : r.result === "lose" ? "负" : "平";
    return `<div class="pk-history-card">
      <span class="pk-history-result ${cls}">${label}</span>
      <span class="pk-history-meta">${escapeHtml(r.opponentName || "对手")} · ${escapeHtml(r.dateLabel || "")}</span>
      <span class="pk-history-score">${escapeHtml(r.scoreText || "")}</span>
    </div>`;
  }).join("")}</div>`;
}

function setCollectionTab(name) {
  state.collectionTab = name;
  document.querySelectorAll(".collection-tab").forEach((tab) => {
    tab.classList.toggle("selected", tab.dataset.tab === name);
  });
  if (name === "catalog") renderCatalog();
  else if (name === "memories") renderMemories();
  else if (name === "pk") renderPkHistoryTab();
}

function showCollection() {
  els.collectionModal.classList.remove("hidden");
  setCollectionTab(state.collectionTab || "catalog");
}

function closeCollection() {
  els.collectionModal.classList.add("hidden");
}

function isItemUnlocked(item) {
  return isCategoryUnlocked(item.bigCategory);
}

function unlockedFreeItems() {
  const seen = new Map();
  (window.PRODUCTS || []).forEach((item) => {
    if (!isItemUnlocked(item)) return;
    if (!seen.has(item.product)) seen.set(item.product, []);
    seen.get(item.product).push(item);
  });
  return seen;
}

function renderSceneGrid() {
  loadCampaignProgress();
  els.sceneGrid.innerHTML = "";
  SCENES.forEach((scene) => {
    const unlocked = isSceneUnlocked(scene);
    const card = document.createElement("button");
    card.type = "button";
    card.className = `scene-card${unlocked ? "" : " locked"}${state.freeSceneId === scene.id ? " selected" : ""}`;
    card.dataset.sceneId = scene.id;
    card.disabled = !unlocked;
    card.innerHTML = `
      <div class="scene-thumb" style="background-image:url('${scene.image}');"></div>
      <span class="scene-name">${escapeHtml(scene.name)}</span>
      <span class="scene-desc">${unlocked ? escapeHtml(scene.desc) : `通关 ${scene.unlockLevel} 关解锁`}</span>
    `;
    if (unlocked) {
      card.addEventListener("click", () => {
        playUiClickSound();
        state.freeSceneId = scene.id;
        renderSceneGrid();
        els.freeSceneNextBtn.disabled = false;
      });
    }
    els.sceneGrid.appendChild(card);
  });
}

function renderFreeItemGrid() {
  loadCampaignProgress();
  const unlocked = unlockedFreeItems();
  els.freeItemHint.textContent = `最多选 ${MAX_FREE_ITEMS} 件物品（已选 ${state.freePickedIds.length}）`;
  els.freeItemGrid.innerHTML = "";
  unlocked.forEach((variants, productName) => {
    const rep = variants[0];
    const isPicked = state.freePickedIds.includes(rep.id);
    const card = document.createElement("button");
    card.type = "button";
    card.className = `free-pick-card${isPicked ? " selected" : ""}`;
    card.dataset.id = rep.id;
    card.innerHTML = `
      <img src="${rep.image}" alt="${escapeHtml(rep.product)}" loading="lazy" />
      <span class="free-pick-label">${escapeHtml(rep.product)}</span>
    `;
    card.addEventListener("click", () => {
      playUiClickSound();
      const idx = state.freePickedIds.indexOf(rep.id);
      if (idx >= 0) {
        state.freePickedIds.splice(idx, 1);
        card.classList.remove("selected");
      } else if (state.freePickedIds.length < MAX_FREE_ITEMS) {
        state.freePickedIds.push(rep.id);
        card.classList.add("selected");
      }
      els.freeItemHint.textContent = `最多选 ${MAX_FREE_ITEMS} 件物品（已选 ${state.freePickedIds.length}）`;
      els.freeStartBtn.disabled = state.freePickedIds.length === 0;
    });
    els.freeItemGrid.appendChild(card);
  });
}

function startFreeMode() {
  if (!ensureProfile()) return;
  state.mode = "free-scene";
  state.freeSceneId = null;
  state.freePickedIds = [];
  state.freeLayouts = {};
  els.endlessPanel.classList.add("hidden");
  els.levelSelectPanel.classList.add("hidden");
  els.freeItemPanel.classList.add("hidden");
  els.freePanel.classList.remove("hidden");
  els.freeSceneNextBtn.disabled = true;
  renderSceneGrid();
}

function showFreeItemPanel() {
  state.mode = "free-pick";
  els.freePanel.classList.add("hidden");
  els.freeItemPanel.classList.remove("hidden");
  els.freeStartBtn.disabled = state.freePickedIds.length === 0;
  renderFreeItemGrid();
}

function buildFreeLayouts() {
  const layout = {};
  const cols = Math.max(3, Math.ceil(Math.sqrt(state.freePickedIds.length)));
  const rows = Math.ceil(state.freePickedIds.length / cols);
  state.freePickedIds.forEach((id, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    layout[id] = {
      x: 12 + ((c + 0.5) / cols) * 76,
      y: 18 + ((r + 0.5) / Math.max(rows, 1)) * 64,
      z: i + 1,
      rotate: (Math.random() - 0.5) * 12,
      shadow: 0.3,
    };
  });
  return layout;
}

function renderFreeItems() {
  els.freeItemsLayer.innerHTML = "";
  state.freePickedIds.forEach((id) => {
    const item = (window.PRODUCTS || []).find((p) => p.id === id);
    if (!item) return;
    const layout = state.freeLayouts[id];
    if (!layout) return;
    const node = document.createElement("div");
    node.className = "free-item sink-item lipstick";
    node.dataset.id = id;
    applyProductSizeVars(node, item);
    node.style.setProperty("--x", `${layout.x}%`);
    node.style.setProperty("--y", `${layout.y}%`);
    node.style.setProperty("--z", String(layout.z));
    node.style.setProperty("--rotate", `${layout.rotate}deg`);
    node.style.setProperty("--shadow-strength", String(layout.shadow));
    node.innerHTML = `
      <div class="lipstick-body">
        <img src="${item.image}" alt="${item.name}" draggable="false" loading="eager" />
        <span class="lipstick-tag">${item.product}</span>
      </div>
    `;
    node.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      startFreeDrag(event, item, node);
    });
    els.freeItemsLayer.appendChild(node);
  });
}

function startFreeDrag(event, item, wrapper) {
  if (event.button !== undefined && event.button !== 0) return;
  const layout = state.freeLayouts[item.id];
  if (!layout) return;

  const layerRect = els.freeItemsLayer.getBoundingClientRect();
  const startClientX = event.clientX;
  const startClientY = event.clientY;
  const startLayoutX = layout.x;
  const startLayoutY = layout.y;

  let hasMoved = false;
  let rafId = null;
  let pendingDx = 0;
  let pendingDy = 0;

  try { wrapper.setPointerCapture(event.pointerId); } catch (_) {}
  wrapper.classList.add("drag-armed");

  // Lift to top z
  const newZ = Math.max(0, ...state.freePickedIds.map((id) => state.freeLayouts[id]?.z || 0)) + 1;
  state.freeLayouts[item.id] = { ...layout, z: newZ };
  wrapper.style.setProperty("--z", String(newZ));

  function flush() {
    rafId = null;
    const baseT = `translate(-50%, -50%)`;
    wrapper.style.transform = `${baseT} translate3d(${pendingDx}px, ${pendingDy}px, 0) scale(1.04)`;
  }

  function onMove(e) {
    const dx = e.clientX - startClientX;
    const dy = e.clientY - startClientY;
    if (!hasMoved && Math.hypot(dx, dy) > 4) {
      hasMoved = true;
      wrapper.classList.remove("drag-armed");
      wrapper.classList.add("dragging");
    }
    if (!hasMoved) return;
    pendingDx = dx;
    pendingDy = dy;
    if (rafId == null) rafId = requestAnimationFrame(flush);
  }

  function cleanup() {
    if (rafId != null) cancelAnimationFrame(rafId);
    rafId = null;
    wrapper.removeEventListener("pointermove", onMove);
    wrapper.removeEventListener("pointerup", onUp);
    wrapper.removeEventListener("pointercancel", onCancel);
    wrapper.classList.remove("drag-armed", "dragging");
    wrapper.style.transform = "";
    try { wrapper.releasePointerCapture(event.pointerId); } catch (_) {}
  }

  function onCancel() { cleanup(); }

  function onUp(e) {
    if (!hasMoved) { cleanup(); return; }
    const dx = e.clientX - startClientX;
    const dy = e.clientY - startClientY;
    const newX = clamp(startLayoutX + (dx / layerRect.width) * 100, 4, 96);
    const newY = clamp(startLayoutY + (dy / layerRect.height) * 100, 4, 96);
    state.freeLayouts[item.id] = {
      ...state.freeLayouts[item.id],
      x: newX,
      y: newY,
    };
    cleanup();
    renderFreeItems();
  }

  wrapper.addEventListener("pointermove", onMove);
  wrapper.addEventListener("pointerup", onUp);
  wrapper.addEventListener("pointercancel", onCancel);
}

function resetFreeLayout() {
  state.freeLayouts = buildFreeLayouts();
  renderFreeItems();
}

function startFreePlay() {
  switchBgm("game");
  state.mode = "free";
  state.freeLayouts = buildFreeLayouts();
  applyScene(state.freeSceneId || "bathroom_sink");
  els.splash.classList.add("hidden");
  els.homepage.classList.add("hidden");
  els.freeItemPanel.classList.add("hidden");
  els.freePanel.classList.add("hidden");
  els.game.classList.remove("hidden");
  els.stage.classList.add("free-stage");
  document.querySelector(".sequence-zone")?.classList.add("hidden");
  document.querySelector(".sink-zone")?.classList.add("hidden");
  document.querySelector(".hud")?.classList.add("hidden");
  els.roundHintBadge.classList.add("hidden");
  els.freePlayZone.classList.remove("hidden");
  els.actionsFooter.classList.add("hidden");
  els.freeActions.classList.remove("hidden");
  renderFreeItems();
}

function exitFreeMode() {
  state.mode = "home";
  exitPhotoMode();
  els.stage.classList.remove("free-stage");
  document.querySelector(".sequence-zone")?.classList.remove("hidden");
  document.querySelector(".sink-zone")?.classList.remove("hidden");
  document.querySelector(".hud")?.classList.remove("hidden");
  els.freePlayZone.classList.add("hidden");
  els.actionsFooter.classList.remove("hidden");
  els.freeActions.classList.add("hidden");
  applyScene(state.currentSceneId || "bathroom_sink");
  showHomepage();
}

function enterPhotoMode() {
  if (state.mode !== "free") return;
  state.photoMode = true;
  els.stage.classList.add("photo-active");
  els.photoFrame.classList.remove("hidden");
  els.photoControls.classList.remove("hidden");
  els.photoFrame.setAttribute("aria-hidden", "false");
  updatePhotoPresetLabels();
  applyPhotoFramePreset("center");
}

function exitPhotoMode() {
  state.photoMode = false;
  els.stage.classList.remove("photo-active");
  els.photoFrame.classList.add("hidden");
  els.photoControls.classList.add("hidden");
  els.photoFrame.setAttribute("aria-hidden", "true");
  state.photoFrameRect = null;
}

function applyPhotoFramePreset(preset) {
  // Rect in percent of stage size
  let rect;
  if (preset === "table") rect = { x: 6, y: 6, w: 88, h: 38 };
  else if (preset === "sink") rect = { x: 4, y: 42, w: 92, h: 54 };
  else if (preset === "full") rect = { x: 2, y: 2, w: 96, h: 96 };
  else rect = { x: 6, y: 26, w: 88, h: 48 }; // center default — landscape, wide & short
  state.photoFrameRect = rect;
  els.photoFrame.dataset.frame = preset;
  applyPhotoFrameRect();
}

const PHOTO_PRESET_LABELS = {
  bathroom_sink:   { table: "台面",   sink: "池子" },
  dressing_room:   { table: "梳妆台", sink: "镜前区" },
  seaside_resort:  { table: "礁石台", sink: "海边角落" },
};

function updatePhotoPresetLabels() {
  const sceneId = state.freeSceneId || state.currentSceneId || "bathroom_sink";
  const labels = PHOTO_PRESET_LABELS[sceneId] || PHOTO_PRESET_LABELS.bathroom_sink;
  const tableBtn = document.querySelector("#photoFrameTableBtn");
  const sinkBtn  = document.querySelector("#photoFrameSinkBtn");
  if (tableBtn) tableBtn.textContent = labels.table;
  if (sinkBtn)  sinkBtn.textContent  = labels.sink;
}

function applyPhotoFrameRect() {
  const r = state.photoFrameRect;
  if (!r) return;
  els.photoFrame.style.left = `${r.x}%`;
  els.photoFrame.style.top = `${r.y}%`;
  els.photoFrame.style.width = `${r.w}%`;
  els.photoFrame.style.height = `${r.h}%`;
}

function startPhotoFrameDrag(event) {
  if (!state.photoFrameRect) return;
  if (event.target && event.target.classList && event.target.classList.contains("corner-handle")) return;
  event.preventDefault();
  event.stopPropagation();
  const stageRect = els.stage.getBoundingClientRect();
  const start = { ...state.photoFrameRect };
  const startClientX = event.clientX;
  const startClientY = event.clientY;
  let latestX = startClientX;
  let latestY = startClientY;
  let rafPending = false;
  function onMove(e) {
    latestX = e.clientX;
    latestY = e.clientY;
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      const dx = ((latestX - startClientX) / stageRect.width) * 100;
      const dy = ((latestY - startClientY) / stageRect.height) * 100;
      const nx = clamp(start.x + dx, 0, 100 - start.w);
      const ny = clamp(start.y + dy, 0, 100 - start.h);
      state.photoFrameRect = { ...start, x: nx, y: ny };
      els.photoFrame.dataset.frame = "custom";
      applyPhotoFrameRect();
    });
  }
  function onUp() {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
  }
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
}

function startCornerDrag(event) {
  if (!state.photoFrameRect) return;
  if (!event.target || !event.target.dataset || !event.target.dataset.corner) return;
  event.preventDefault();
  event.stopPropagation();
  const corner = event.target.dataset.corner;
  const stageRect = els.stage.getBoundingClientRect();
  const start = { ...state.photoFrameRect };
  const startClientX = event.clientX;
  const startClientY = event.clientY;
  let latestX = startClientX;
  let latestY = startClientY;
  let rafPending = false;
  function onMove(e) {
    latestX = e.clientX;
    latestY = e.clientY;
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      const dxp = ((latestX - startClientX) / stageRect.width) * 100;
      const dyp = ((latestY - startClientY) / stageRect.height) * 100;
      let nx = start.x, ny = start.y, nw = start.w, nh = start.h;
      if (corner === "tl") { nx = start.x + dxp; ny = start.y + dyp; nw = start.w - dxp; nh = start.h - dyp; }
      if (corner === "tr") { ny = start.y + dyp; nw = start.w + dxp; nh = start.h - dyp; }
      if (corner === "bl") { nx = start.x + dxp; nw = start.w - dxp; nh = start.h + dyp; }
      if (corner === "br") { nw = start.w + dxp; nh = start.h + dyp; }
      nw = Math.max(15, nw);
      nh = Math.max(15, nh);
      nx = clamp(nx, 0, 100 - nw);
      ny = clamp(ny, 0, 100 - nh);
      state.photoFrameRect = { x: nx, y: ny, w: nw, h: nh };
      els.photoFrame.dataset.frame = "custom";
      applyPhotoFrameRect();
    });
  }
  function onUp() {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
  }
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
}

function playShutterSound() {
  try {
    unlockAudio();
    const ctx = state.audioContext || new (window.AudioContext || window.webkitAudioContext)();
    state.audioContext = ctx;
    const now = ctx.currentTime;

    // "咔" — sharp mechanical click (triangle wave, fast frequency sweep down)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(2000, now);
    osc1.frequency.exponentialRampToValueAtTime(400, now + 0.03);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc1.connect(gain1);
    gain1.connect(state.sfxMasterGain);
    osc1.start(now);
    osc1.stop(now + 0.05);

    // "嚓" — lower, softer follow-up (sine wave)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1000, now + 0.06);
    osc2.frequency.exponentialRampToValueAtTime(300, now + 0.1);
    gain2.gain.setValueAtTime(0.25, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc2.connect(gain2);
    gain2.connect(state.sfxMasterGain);
    osc2.start(now + 0.06);
    osc2.stop(now + 0.12);
  } catch (_) {}
}

function playSaveSound() {
  try {
    unlockAudio();
    const ctx = state.audioContext || new (window.AudioContext || window.webkitAudioContext)();
    state.audioContext = ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(state.sfxMasterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (_) {}
}

function playDeleteSound() {
  try {
    unlockAudio();
    const ctx = state.audioContext || new (window.AudioContext || window.webkitAudioContext)();
    state.audioContext = ctx;
    const now = ctx.currentTime;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.32, now);
    src.connect(gain);
    gain.connect(state.sfxMasterGain);
    src.start(now);
    src.stop(now + 0.12);
  } catch (_) {}
}

function playUiClickSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    state.audioContext ||= new AudioContext();
    const ctx = state.audioContext;
    if (ctx.state === "suspended") ctx.resume?.();
    const now = ctx.currentTime;
    // 萌萌的"啵～"泡泡音 — 频率从 520Hz 快速滑落到 90Hz，软弹不刺耳
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.08);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(state.sfxMasterGain);
    osc.start(now);
    osc.stop(now + 0.14);
  } catch (_) {}
}

function loadCanvasImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function makeBlankCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

async function captureFreePhoto() {
  const stageRect = els.stage.getBoundingClientRect();
  const r = state.photoFrameRect || { x: 0, y: 0, w: 100, h: 100 };
  const px = (stageRect.width * r.x) / 100;
  const py = (stageRect.height * r.y) / 100;
  const pw = (stageRect.width * r.w) / 100;
  const ph = (stageRect.height * r.h) / 100;
  const scale = 2;
  const cw = Math.max(1, Math.round(pw * scale));
  const ch = Math.max(1, Math.round(ph * scale));

  // ── Build the canvas ──────────────────────────────────────────────
  const canvas = makeBlankCanvas(cw, ch);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff5ec";
  ctx.fillRect(0, 0, cw, ch);

  // Background scene
  const scene = SCENES.find((s) => s.id === (state.freeSceneId || state.currentSceneId));
  if (scene) {
    try {
      const img = await loadCanvasImage(scene.image);
      const ratio = Math.max(stageRect.width / img.width, stageRect.height / img.height);
      const drawW = img.width * ratio;
      const drawH = img.height * ratio;
      const dx = (stageRect.width - drawW) / 2;
      const dy = (stageRect.height - drawH) / 2;
      ctx.drawImage(
        img,
        ((px - dx) / drawW) * img.width,
        ((py - dy) / drawH) * img.height,
        (pw / drawW) * img.width,
        (ph / drawH) * img.height,
        0, 0, cw, ch,
      );
    } catch (_) {}
  }

  // Items
  for (const id of state.freePickedIds) {
    const item = (window.PRODUCTS || []).find((p) => p.id === id);
    const node = els.freeItemsLayer.querySelector(`.free-item[data-id="${id}"] img`);
    if (!item || !node) continue;
    try {
      const img = await loadCanvasImage(item.image);
      const nodeRect = node.getBoundingClientRect();
      const cx = nodeRect.left - stageRect.left + nodeRect.width / 2;
      const cy = nodeRect.top - stageRect.top + nodeRect.height / 2;
      const inX = cx + nodeRect.width / 2 >= px && cx - nodeRect.width / 2 <= px + pw;
      const inY = cy + nodeRect.height / 2 >= py && cy - nodeRect.height / 2 <= py + ph;
      if (!inX || !inY) continue;
      const localX = (cx - px) * scale;
      const localY = (cy - py) * scale;
      const drawW = nodeRect.width * scale;
      const drawH = nodeRect.height * scale;
      ctx.save();
      ctx.translate(localX, localY);
      const layout = state.freeLayouts[id];
      if (layout && layout.rotate) ctx.rotate((layout.rotate * Math.PI) / 180);
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    } catch (_) {}
  }

  // ── Try to export; fall back gracefully for tainted canvas (file://) ──
  try {
    return canvas.toDataURL("image/png");
  } catch (_) {
    // Canvas tainted (Chrome file:// security). Draw item silhouettes instead.
    const fb = makeBlankCanvas(cw, ch);
    const fctx = fb.getContext("2d");
    fctx.fillStyle = "#f5e8e0";
    fctx.fillRect(0, 0, cw, ch);
    for (const id of state.freePickedIds) {
      const item = (window.PRODUCTS || []).find((p) => p.id === id);
      const node = els.freeItemsLayer.querySelector(`.free-item[data-id="${id}"] img`);
      if (!item || !node) continue;
      const nodeRect = node.getBoundingClientRect();
      const cx = nodeRect.left - stageRect.left + nodeRect.width / 2;
      const cy = nodeRect.top - stageRect.top + nodeRect.height / 2;
      const inX = cx + nodeRect.width / 2 >= px && cx - nodeRect.width / 2 <= px + pw;
      const inY = cy + nodeRect.height / 2 >= py && cy - nodeRect.height / 2 <= py + ph;
      if (!inX || !inY) continue;
      const localX = (cx - px) * scale;
      const localY = (cy - py) * scale;
      const drawW = nodeRect.width * scale;
      const drawH = nodeRect.height * scale;
      const color = item.colorHex || "#d8a0b0";
      fctx.save();
      fctx.translate(localX, localY);
      const layout = state.freeLayouts[id];
      if (layout && layout.rotate) fctx.rotate((layout.rotate * Math.PI) / 180);
      fctx.fillStyle = color;
      fctx.globalAlpha = 0.85;
      fctx.beginPath();
      fctx.roundRect(-drawW / 2, -drawH / 2, drawW, drawH, 6);
      fctx.fill();
      fctx.globalAlpha = 1;
      fctx.restore();
    }
    return fb.toDataURL("image/png");
  }
}

function handleShutter() {
  if (!state.photoMode) return;
  playShutterSound();
  bump("camera-win");
  captureFreePhoto()
    .then((dataUrl) => {
      state.pendingPhotoUrl = dataUrl;
      showSavePhotoDialog(dataUrl);
    })
    .catch(() => {
      els.feedback.textContent = "拍照失败，再试一次";
    });
}

function showSavePhotoDialog(dataUrl) {
  els.savePhotoPreview.src = dataUrl;
  els.savePhotoName.value = defaultPhotoName();
  els.savePhotoModal.classList.remove("hidden");
}

function defaultPhotoName() {
  const d = new Date();
  return `回忆 ${d.getMonth() + 1}-${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function discardPhoto() {
  state.pendingPhotoUrl = null;
  els.savePhotoModal.classList.add("hidden");
}

function savePhotoWithName() {
  if (!state.pendingPhotoUrl) return;
  const memories = loadMemories();
  const id = `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const d = new Date();
  const dateLabel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  memories.unshift({
    id,
    name: els.savePhotoName.value.trim() || defaultPhotoName(),
    photoDataUrl: state.pendingPhotoUrl,
    dateLabel,
    sceneId: state.freeSceneId,
  });
  try {
    localStorage.setItem(MEMORIES_KEY, JSON.stringify(memories.slice(0, 30)));
  } catch (_) {
    els.feedback.textContent = "回忆已满，先去图鉴删几张";
  }
  state.pendingPhotoUrl = null;
  playSaveSound();
  els.savePhotoModal.classList.add("hidden");
}

function confirmDeleteMemory(id) {
  state.pendingDeleteMemoryId = id;
  els.deleteConfirmModal.classList.remove("hidden");
}

function executeDeleteMemory() {
  if (!state.pendingDeleteMemoryId) {
    els.deleteConfirmModal.classList.add("hidden");
    return;
  }
  playDeleteSound();
  const memories = loadMemories().filter((m) => m.id !== state.pendingDeleteMemoryId);
  localStorage.setItem(MEMORIES_KEY, JSON.stringify(memories));
  state.pendingDeleteMemoryId = null;
  els.deleteConfirmModal.classList.add("hidden");
  if (state.collectionTab === "memories") renderMemories();
}

// ===== PK Mode =====

function pkAvailable() {
  return Boolean(PK_API);
}

function playerPayload() {
  return {
    avatar: state.profile?.avatar || AVATARS[0],
    name: state.profile?.name || "匿名玩家",
  };
}

async function pkRequest(path, options = {}) {
  if (!PK_API) throw new Error("PK 服务未配置");
  const response = await fetch(`${PK_API}${path}`, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "PK 请求失败");
  return data;
}

function openPkPanel() {
  if (!ensureProfile()) return;
  state.mode = "pk-setup";
  els.endlessPanel.classList.add("hidden");
  els.levelSelectPanel.classList.add("hidden");
  els.freePanel.classList.add("hidden");
  els.freeItemPanel.classList.add("hidden");
  els.pkPanel.classList.remove("hidden");
  els.pkSetupError.textContent = pkAvailable() ? "" : "请先在 config.js 配置 window.HUANZI_PK_API";
  els.createRoomBtn.disabled = !pkAvailable();
  els.joinRoomBtn.disabled = !pkAvailable();
  document.querySelectorAll(".pk-level-option").forEach((btn) => {
    btn.classList.toggle("selected", Number(btn.dataset.levels) === state.selectedPkLevels);
  });
}

function setPkLevels(levels) {
  state.selectedPkLevels = levels;
  document.querySelectorAll(".pk-level-option").forEach((btn) => {
    btn.classList.toggle("selected", Number(btn.dataset.levels) === levels);
  });
}

async function createPkRoom() {
  els.pkSetupError.textContent = "";
  els.createRoomBtn.disabled = true;
  els.joinRoomBtn.disabled = true;
  try {
    const data = await pkRequest("/pk/rooms", {
      method: "POST",
      body: { player: playerPayload(), targetLevels: state.selectedPkLevels },
    });
    enterPkLobby(data);
  } catch (e) {
    els.pkSetupError.textContent = `创建失败：${e.message}`;
    els.createRoomBtn.disabled = false;
    els.joinRoomBtn.disabled = false;
  }
}

async function joinPkRoom() {
  const code = (els.roomCodeInput.value || "").trim().toUpperCase();
  if (code.length !== 4) {
    els.pkSetupError.textContent = "请输入 4 位房间码";
    return;
  }
  els.pkSetupError.textContent = "";
  els.createRoomBtn.disabled = true;
  els.joinRoomBtn.disabled = true;
  try {
    const data = await pkRequest(`/pk/rooms/${code}/join`, {
      method: "POST",
      body: { player: playerPayload() },
    });
    enterPkLobby(data);
  } catch (e) {
    els.pkSetupError.textContent = `加入失败：${e.message}`;
    els.createRoomBtn.disabled = false;
    els.joinRoomBtn.disabled = false;
  }
}

function enterPkLobby(data) {
  state.pk = {
    matchId: data.matchId,
    playerId: data.playerId,
    roomCode: data.roomCode || "",
    targetLevels: data.match?.targetLevels || state.selectedPkLevels,
    totalSeconds: data.totalSeconds || state.selectedPkLevels * PK_SECONDS_PER_LEVEL,
    match: data.match,
    levelsCompleted: 0,
    timerId: null,
    countdownTimer: null,
  };
  switchBgm("game");
  state.mode = "pk-lobby";
  els.pkPanel.classList.add("hidden");
  els.splash.classList.add("hidden");
  els.homepage.classList.add("hidden");
  els.game.classList.remove("hidden");
  document.querySelector(".sequence-zone")?.classList.add("hidden");
  document.querySelector(".sink-zone")?.classList.add("hidden");
  document.querySelector(".hud")?.classList.add("hidden");
  els.actionsFooter.classList.add("hidden");
  els.pkLobby.classList.remove("hidden");
  renderPkLobby();
  startPkPolling();
}

function renderPkLobby() {
  if (!state.pk || !state.pk.match) return;
  const m = state.pk.match;
  els.pkLobbyCode.textContent = m.roomCode || "----";
  const me = m.self || {};
  const opp = m.opponent;
  els.pkLobbySelfName.textContent = me.name || "我";
  els.pkLobbySelfStatus.textContent = me.ready ? "已准备" : "未准备";
  els.pkLobbySelfStatus.className = `pk-lobby-status${me.ready ? " ready" : ""}`;
  if (opp) {
    els.pkLobbyOppName.textContent = opp.name || "对手";
    els.pkLobbyOppStatus.textContent = opp.ready ? "已准备" : "未准备";
    els.pkLobbyOppStatus.className = `pk-lobby-status${opp.ready ? " ready" : ""}`;
    els.pkLobbyHint.textContent = "对手已加入，双方准备好后自动开始";
    els.pkLobbyReadyBtn.disabled = me.ready;
  } else {
    els.pkLobbyOppName.textContent = "等待中";
    els.pkLobbyOppStatus.textContent = "等待加入";
    els.pkLobbyHint.textContent = "把房间码发给好友邀请加入";
    els.pkLobbyReadyBtn.disabled = me.ready;
  }
}

function startPkPolling() {
  clearPkPolling();
  state.pkPollTimer = setInterval(pollPkMatch, PK_POLL_MS);
}

function clearPkPolling() {
  if (state.pkPollTimer) {
    clearInterval(state.pkPollTimer);
    state.pkPollTimer = null;
  }
}

async function pollPkMatch() {
  if (!state.pk) return;
  try {
    const data = await pkRequest(`/pk/matches/${state.pk.matchId}?playerId=${state.pk.playerId}`);
    applyPkMatch(data.match);
  } catch (_) {
    // server unreachable — ignore tick
  }
}

function applyPkMatch(match) {
  if (!state.pk || !match) return;
  state.pk.match = match;
  const newStatus = match.status;
  if (state.mode === "pk-lobby") {
    renderPkLobby();
    if (newStatus === "active") {
      beginPkGame(match);
    }
  } else if (state.mode === "pk-game") {
    renderPkHud();
    if (newStatus === "finished") {
      finishPkRound(match);
    }
  }
}

async function pkReady() {
  if (!state.pk) return;
  els.pkLobbyReadyBtn.disabled = true;
  try {
    const data = await pkRequest(`/pk/matches/${state.pk.matchId}/ready`, {
      method: "POST",
      body: { playerId: state.pk.playerId },
    });
    applyPkMatch(data.match);
  } catch (_) {
    els.pkLobbyReadyBtn.disabled = false;
  }
}

function beginPkGame(match) {
  els.pkLobby.classList.add("hidden");
  state.mode = "pk-game";
  state.round = 0;
  state.pk.levelsCompleted = 0;
  els.pkStatus.classList.remove("hidden");
  document.querySelector(".sequence-zone")?.classList.remove("hidden");
  document.querySelector(".sink-zone")?.classList.remove("hidden");
  document.querySelector(".hud")?.classList.remove("hidden");
  document.querySelector(".hud")?.classList.add("pk-active");
  document.querySelector(".hud-title")?.classList.add("hidden");
  els.roundHintBadge.classList.add("hidden");
  els.actionsFooter.classList.remove("hidden");
  startPkCountdown(match);
}

function startPkCountdown(match) {
  els.pkCountSelfName.textContent = match.self?.name || "我";
  els.pkCountOppName.textContent = match.opponent?.name || "对手";
  els.pkCountTarget.textContent = `${match.targetLevels} 关`;
  els.pkCountTimer.textContent = `${match.totalSeconds} 秒`;
  els.pkCountdownOverlay.classList.remove("hidden");
  let count = 3;
  els.pkCountNumber.textContent = String(count);
  state.pk.countdownTimer = setInterval(() => {
    count -= 1;
    if (count > 0) {
      els.pkCountNumber.textContent = String(count);
      try { new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
    } else if (count === 0) {
      els.pkCountNumber.textContent = "开始!";
    } else {
      clearInterval(state.pk.countdownTimer);
      state.pk.countdownTimer = null;
      els.pkCountdownOverlay.classList.add("hidden");
      startPkRound();
    }
  }, 1000);
}

function startPkRound() {
  state.round += 1;
  // Reuse standard round flow but skip auto-end
  state.mode = "pk-game";
  startRound(campaignRuleForNextRound());
  state.mode = "pk-game"; // startRound may set mode; restore
  renderPkHud();
}

function renderPkHud() {
  if (!state.pk || !state.pk.match) return;
  const m = state.pk.match;
  const tgt = m.targetLevels || state.pk.targetLevels;
  els.pkSelfName.textContent = m.self?.name || "我";
  els.pkSelfCount.textContent = `${m.self?.completedLevels || 0} / ${tgt}`;
  els.pkSelfBar.style.width = `${Math.min(100, ((m.self?.completedLevels || 0) / tgt) * 100)}%`;
  els.pkOpponentName.textContent = m.opponent?.name || "对手";
  els.pkOpponentCount.textContent = `${m.opponent?.completedLevels || 0} / ${tgt}`;
  els.pkOpponentBar.style.width = `${Math.min(100, ((m.opponent?.completedLevels || 0) / tgt) * 100)}%`;
}

async function submitPkProgress() {
  if (!state.pk) return;
  const completed = state.pk.levelsCompleted;
  const finished = completed >= state.pk.targetLevels;
  try {
    const data = await pkRequest(`/pk/matches/${state.pk.matchId}/progress`, {
      method: "POST",
      body: { playerId: state.pk.playerId, completedLevels: completed, finished },
    });
    applyPkMatch(data.match);
  } catch (_) {}
}

function finishPkRound(match) {
  clearPkPolling();
  const me = match.self || {};
  const opp = match.opponent || {};
  let result = "draw";
  if (match.result?.type === "winner") {
    result = match.result.winnerId === state.pk.playerId ? "win" : "lose";
  } else if (match.result?.type === "cancelled") {
    result = "draw";
  }
  savePkHistory({
    id: `pk-${Date.now()}`,
    result,
    opponentName: opp.name || "对手",
    dateLabel: new Date().toLocaleDateString(),
    scoreText: `${me.completedLevels || 0} : ${opp.completedLevels || 0}`,
  });
  els.modal.classList.remove("hidden");
  els.modalKicker.textContent = "PK 结束";
  els.modalTitle.textContent = result === "win" ? "胜利" : result === "lose" ? "失败" : "平局";
  if (result === "win") {
    playWinSound();
  } else if (result === "lose") {
    playDingDong();
  }
  els.summary.innerHTML = `
    <p>${escapeHtml(me.name || "我")} ${me.completedLevels || 0} : ${opp.completedLevels || 0} ${escapeHtml(opp.name || "对手")}</p>
    <p>原因：${escapeHtml(match.result?.reason || "对局结束")}</p>
  `;
  els.modalNext.classList.add("hidden");
  state.mode = "pk-result";
  els.pkStatus.classList.add("hidden");
}

function savePkHistory(record) {
  const history = loadPkHistory();
  history.unshift(record);
  try {
    localStorage.setItem(PK_HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
  } catch (_) {}
}

function exitPkAll() {
  clearPkPolling();
  if (state.pk && state.pk.countdownTimer) {
    clearInterval(state.pk.countdownTimer);
  }
  if (state.pk && state.pk.matchId) {
    pkRequest(`/pk/matches/${state.pk.matchId}/leave`, {
      method: "POST",
      body: { playerId: state.pk.playerId },
    }).catch(() => {});
  }
  state.pk = null;
  els.pkLobby.classList.add("hidden");
  els.pkStatus.classList.add("hidden");
  els.pkCountdownOverlay.classList.add("hidden");
  els.pkPanel.classList.add("hidden");
  els.modalNext.classList.remove("hidden");
  document.querySelector(".hud")?.classList.remove("pk-active");
  document.querySelector(".hud-title")?.classList.remove("hidden");
  showHomepage();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function giveUp() {
  if (state.mode === "endless") {
    window.clearInterval(state.timerId);
    state.timerId = null;
    stopUrgentEffects();
    endEndlessRun();
    return;
  }
  window.clearInterval(state.timerId);
  state.timerId = null;
  stopUrgentEffects();
  els.timer.classList.remove("danger");

  state.pool = state.pool.filter((id) => !state.answerIds.includes(id));
  state.slots.forEach((id) => {
    if (id && !state.answerIds.includes(id) && !state.pool.includes(id)) {
      state.pool.push(id);
      state.sinkLayouts[id] = nextSinkLayout(id);
    }
  });
  state.slots = [...state.answerIds];
  state.selectedId = null;
  state.draggedId = null;
  clearSlotMarks();
  render();

  const usedItems = state.sequenceIds.map((id) => itemById(id));
  const answerItems = state.answerIds.map((id) => itemById(id));
  els.feedback.textContent = "本局正确答案已揭晓";
  state.mode = "campaign-giveup";
  els.modalHome.classList.add("hidden");
  els.modalKicker.textContent = `Level ${state.round} / ${MAX_LEVEL}`;
  els.modalTitle.textContent = "正确答案";
  els.modalNext.textContent = "返回主页";
  els.summary.innerHTML = `
    <p>规则：${state.rule.title}</p>
    <p>完整序列：${usedItems.map((item) => item.product).join("、")}</p>
    <p>正确补全：${answerItems.map((item) => item.product).join("、")}</p>
    <h3 class="summary-heading">恭喜你获得图鉴</h3>
    ${renderProductIntroCards(usedItems)}
  `;
  els.modal.classList.remove("hidden");
}

function switchBgm(track) {
  state.bgmTrack = track;
  const menu = els.bgmMenu;
  const game = els.bgmGame;
  menu.volume = state.bgmVolume;
  game.volume = state.bgmVolume;
  if (track === "menu") {
    if (!game.paused) { game.pause(); game.currentTime = 0; }
    if (menu.paused) menu.play().catch(() => {});
  } else if (track === "game") {
    if (!menu.paused) { menu.pause(); menu.currentTime = 0; }
    if (game.paused) game.play().catch(() => {});
  } else {
    menu.pause(); menu.currentTime = 0;
    game.pause(); game.currentTime = 0;
  }
}

function updateSoundBtnIcon() {
  const muted = state.bgmVolume === 0;
  els.soundBtnIcon.innerHTML = muted
    ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>'
    : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>';
}

els.soundBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  els.mixerPopover.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
  if (!els.mixerPopover.contains(e.target) && e.target !== els.soundBtn) {
    els.mixerPopover.classList.add("hidden");
  }
});

els.bgmSlider.addEventListener("input", () => {
  const val = Number(els.bgmSlider.value);
  els.bgmVal.textContent = val;
  state.bgmVolume = val / 100;
  els.bgmMenu.volume = state.bgmVolume;
  els.bgmGame.volume = state.bgmVolume;
  updateSoundBtnIcon();
});

els.sfxSlider.addEventListener("input", () => {
  const val = Number(els.sfxSlider.value);
  els.sfxVal.textContent = val;
  state.sfxVolume = val / 100;
  if (state.sfxMasterGain) state.sfxMasterGain.gain.value = state.sfxVolume;
});

function playPlaceSound() {
  unlockAudio();
  const sound = state.placeSound;
  if (sound) {
    sound.currentTime = 0;
    sound.volume = state.sfxVolume;
    const playback = sound.play();
    if (playback && typeof playback.catch === "function") {
      playback.catch(playSyntheticClack);
    }
    return;
  }
  playSyntheticClack();
}

function unlockAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  state.audioContext ||= new AudioContext();
  if (state.audioContext.state === "suspended") {
    state.audioContext.resume?.();
  }
  if (!state.sfxMasterGain) {
    state.sfxMasterGain = state.audioContext.createGain();
    state.sfxMasterGain.gain.value = state.sfxVolume;
    state.sfxMasterGain.connect(state.audioContext.destination);
  }
}

function playSyntheticClack() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  unlockAudio();
  const ctx = state.audioContext;
  const now = ctx.currentTime;
  [180, 95].forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + index * 0.035;
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.045);
    osc.connect(gain).connect(state.sfxMasterGain);
    osc.start(start);
    osc.stop(start + 0.055);
  });
}

function playCountdownBeep() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  unlockAudio();
  const ctx = state.audioContext;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(860, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
  osc.connect(gain).connect(state.sfxMasterGain);
  osc.start(now);
  osc.stop(now + 0.1);
}

function playErrorBuzz() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  unlockAudio();
  const ctx = state.audioContext;
  // One crisp "bi" beep — sine wave at 1200Hz, short & clean
  const start = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1200, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.18, start + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.08);
  osc.connect(gain).connect(state.sfxMasterGain);
  osc.start(start);
  osc.stop(start + 0.1);
}

function playWinSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  unlockAudio();
  const ctx = state.audioContext;
  // Rising arpeggio: C5 → E5 → G5 → C6 — cheerful "ding ding ding DING!"
  const notes = [
    { freq: 523, offset: 0 },
    { freq: 659, offset: 0.12 },
    { freq: 784, offset: 0.24 },
    { freq: 1047, offset: 0.36 },
  ];
  notes.forEach(({ freq, offset }) => {
    const start = ctx.currentTime + offset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.22, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
    osc.connect(gain).connect(state.sfxMasterGain);
    osc.start(start);
    osc.stop(start + 0.3);
  });
}

function playCampaignCompleteSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  unlockAudio();
  const ctx = state.audioContext;
  // Grand fanfare: C4+E4+G4 triad → C5+E5+G5 triad → C6 bell
  const chord1 = [262, 330, 392]; // C4, E4, G4
  const chord2 = [523, 659, 784]; // C5, E5, G5
  chord1.forEach((freq) => {
    const start = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
    osc.connect(gain).connect(state.sfxMasterGain);
    osc.start(start);
    osc.stop(start + 0.55);
  });
  chord2.forEach((freq) => {
    const start = ctx.currentTime + 0.45;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.22, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.7);
    osc.connect(gain).connect(state.sfxMasterGain);
    osc.start(start);
    osc.stop(start + 0.75);
  });
  // Final high bell C7
  {
    const start = ctx.currentTime + 0.95;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(2093, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);
    osc.connect(gain).connect(state.sfxMasterGain);
    osc.start(start);
    osc.stop(start + 1.0);
  }
}

function playDingDong() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  unlockAudio();
  const ctx = state.audioContext;
  // Two-tone bell: high then low
  [
    { freq: 988, offset: 0 },     // B5 "ding"
    { freq: 659, offset: 0.32 },  // E5 "dong"
  ].forEach(({ freq, offset }) => {
    const start = ctx.currentTime + offset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.3, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
    osc.connect(gain).connect(state.sfxMasterGain);
    osc.start(start);
    osc.stop(start + 0.55);
  });
}

function handleUrgentCountdown(seconds) {
  const urgent = (state.mode === "campaign" || state.mode === "endless") && seconds <= URGENT_SECONDS && seconds > 0;
  els.stage.classList.remove("timer-panic");
  if (!urgent) {
    stopUrgentEffects();
    return;
  }

  if (state.lastUrgentBeepSecond !== seconds) {
    playCountdownBeep();
    state.lastUrgentBeepSecond = seconds;
  }
}

function startBuzz() {
  if (state.buzzNodes) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  unlockAudio();
  const ctx = state.audioContext;

  const carrier = ctx.createOscillator();
  const gain = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  carrier.type = "sawtooth";
  carrier.frequency.setValueAtTime(86, ctx.currentTime);
  lfo.type = "sine";
  lfo.frequency.setValueAtTime(18, ctx.currentTime);
  gain.gain.setValueAtTime(0.025, ctx.currentTime);
  lfoGain.gain.setValueAtTime(0.018, ctx.currentTime);
  lfo.connect(lfoGain).connect(gain.gain);
  carrier.connect(gain).connect(state.sfxMasterGain);
  carrier.start();
  lfo.start();
  state.buzzNodes = { carrier, lfo, gain };
}

function stopUrgentEffects() {
  const wasUrgent = state.lastUrgentBeepSecond !== null || els.stage.classList.contains("timer-panic") || state.buzzNodes;
  els.stage.classList.remove("timer-panic");
  state.lastUrgentBeepSecond = null;
  if (!state.buzzNodes) return;
  const { carrier, lfo, gain } = state.buzzNodes;
  const ctx = state.audioContext;
  const now = ctx?.currentTime || 0;
  try {
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value || 0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    carrier.stop(now + 0.05);
    lfo.stop(now + 0.05);
  } catch (_) {
    try { carrier.stop(); } catch (__) {}
    try { lfo.stop(); } catch (__) {}
  }
  state.buzzNodes = null;
}

function bump(className) {
  els.stage.classList.remove("camera-bump", "camera-soft", "camera-win", "camera-error");
  void els.stage.offsetWidth;
  els.stage.classList.add(className);
}

function isBlockedDropTarget(target) {
  return Boolean(
    target.closest(".lipstick") ||
    target.closest(".answer-slot") ||
    target.closest(".actions") ||
    target.closest(".hud") ||
    target.closest(".detail-panel") ||
    target.closest(".modal")
  );
}

function dropSelectedOnBlank(target) {
  if (!state.selectedId || (state.mode !== "campaign" && state.mode !== "endless")) return false;
  if (target.closest && isBlockedDropTarget(target)) return false;
  state.selectedId = null;
  render();
  return true;
}

function vibrateError() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try { navigator.vibrate([120, 60, 120]); } catch (_) {}
  }
}

function requestReturnHome() {
  const inLiveRound = (state.mode === "campaign" || state.mode === "endless")
    && state.timerId !== null
    && !state.roundCleared;
  if (!inLiveRound) {
    showHomepage();
    return;
  }
  els.confirmHomeModal.classList.remove("hidden");
}

function closeConfirmHomeModal() {
  els.confirmHomeModal.classList.add("hidden");
}

function confirmReturnHome() {
  closeConfirmHomeModal();
  showHomepage();
}

els.hintBtn.addEventListener("click", () => { playUiClickSound(); showHint(); });
els.checkBtn.addEventListener("click", () => { playUiClickSound(); checkAnswer(); });
els.giveUpBtn.addEventListener("click", () => { playUiClickSound(); giveUp(); });
els.homeBtn.addEventListener("click", () => { playUiClickSound(); requestReturnHome(); });
els.splashStartBtn.addEventListener("click", () => { playUiClickSound(); showHomepage(); });
function closeSetupPanel() {
  els.homeCard.classList.remove("setup-open");
  els.levelSelectPanel.classList.add("hidden");
  els.endlessPanel.classList.add("hidden");
  els.pkPanel.classList.add("hidden");
  els.freePanel.classList.add("hidden");
  els.freeItemPanel.classList.add("hidden");
}

els.campaignBackBtn.addEventListener("click", () => { playUiClickSound(); closeSetupPanel(); });
els.endlessBackBtn.addEventListener("click", () => { playUiClickSound(); closeSetupPanel(); });
els.pkBackBtn.addEventListener("click", () => { playUiClickSound(); closeSetupPanel(); });
els.confirmHomeCancel.addEventListener("click", () => { playUiClickSound(); closeConfirmHomeModal(); });
els.confirmHomeOk.addEventListener("click", () => { playUiClickSound(); confirmReturnHome(); });
els.confirmHomeModal.addEventListener("click", (event) => {
  if (event.target === els.confirmHomeModal) closeConfirmHomeModal();
});
els.modalNext.addEventListener("click", () => {
  playUiClickSound();
  if (state.mode === "campaign-complete") {
    startCampaign();
  } else if (state.mode === "endless-result") {
    startEndless();
  } else if (state.mode === "campaign" && state.round >= MAX_LEVEL && state.roundCleared) {
    showCampaignComplete();
  } else if (state.mode === "campaign" && state.round >= MAX_LEVEL) {
    startCampaign();
  } else if (state.mode === "campaign-giveup") {
    showHomepage();
  } else {
    nextLevel();
  }
});
els.modalHome.addEventListener("click", () => {
  playUiClickSound();
  if (state.mode && state.mode.startsWith("pk")) {
    exitPkAll();
  } else {
    showHomepage();
  }
});
els.modal.addEventListener("click", (event) => {
  if (event.target === els.modal) els.modal.classList.add("hidden");
});

document.querySelectorAll(".mode-card").forEach((card) => {
  card.addEventListener("click", () => {
    if (card.disabled) return;
    playUiClickSound();
    document.querySelectorAll(".mode-card").forEach((item) => item.classList.toggle("mode-active", item === card));
  });
});

const MODE_PANEL = {
  campaign: { panel: "levelSelectPanel", open: openLevelSelectPanel },
  endless: { panel: "endlessPanel", open: () => { if (!ensureProfile()) return; els.endlessPanel.classList.remove("hidden"); } },
  free: { panel: null, open: startFreeMode },
  pk: { panel: "pkPanel", open: openPkPanel },
};

function confirmModeSelection() {
  const mode = document.querySelector(".mode-card.mode-active")?.dataset.mode || "campaign";
  const entry = MODE_PANEL[mode];
  if (!entry) return;
  // Hide all panels first
  els.endlessPanel.classList.add("hidden");
  els.levelSelectPanel.classList.add("hidden");
  els.freePanel.classList.add("hidden");
  els.freeItemPanel.classList.add("hidden");
  els.pkPanel.classList.add("hidden");
  els.homeCard.classList.add("setup-open");
  entry.open();
}

els.confirmModeBtn.addEventListener("click", () => { playUiClickSound(); confirmModeSelection(); });


document.querySelectorAll(".pk-level-option").forEach((btn) => {
  btn.addEventListener("click", () => { playUiClickSound(); setPkLevels(Number(btn.dataset.levels)); });
});
els.createRoomBtn.addEventListener("click", () => { playUiClickSound(); createPkRoom(); });
els.joinRoomBtn.addEventListener("click", () => { playUiClickSound(); joinPkRoom(); });
els.pkLobbyReadyBtn.addEventListener("click", () => { playUiClickSound(); pkReady(); });
els.pkLobbyLeaveBtn.addEventListener("click", () => { playUiClickSound(); exitPkAll(); });

els.roundIntroBtn.addEventListener("click", () => {
  playUiClickSound();
  els.roundIntroOverlay.classList.add("hidden");
  restartTimer(ROUND_SECONDS);
});

els.startCampaignBtn.addEventListener("click", () => {
  if (!ensureProfile()) return;
  playUiClickSound();
  startCampaign();
});

els.freeSceneNextBtn.addEventListener("click", () => { playUiClickSound(); showFreeItemPanel(); });
els.freeItemBackBtn.addEventListener("click", () => {
  playUiClickSound();
  els.freeItemPanel.classList.add("hidden");
  els.freePanel.classList.remove("hidden");
});
els.freeStartBtn.addEventListener("click", () => { playUiClickSound(); startFreePlay(); });
els.freeResetBtn.addEventListener("click", () => { playUiClickSound(); resetFreeLayout(); });
els.freeHomeBtn.addEventListener("click", () => { playUiClickSound(); exitFreeMode(); });
els.freeMemoriesBtn.addEventListener("click", () => { playUiClickSound(); showCollection("memories"); });
els.freePhotoBtn.addEventListener("click", () => { playUiClickSound(); enterPhotoMode(); });
els.exitPhotoBtn.addEventListener("click", () => { playUiClickSound(); exitPhotoMode(); });
els.shutterBtn.addEventListener("click", handleShutter);
els.photoFrame.addEventListener("pointerdown", (event) => {
  if (event.target && event.target.classList && event.target.classList.contains("corner-handle")) {
    startCornerDrag(event);
  } else {
    startPhotoFrameDrag(event);
  }
});
document.querySelectorAll("#photoControls [data-preset]").forEach((btn) => {
  btn.addEventListener("click", () => { playUiClickSound(); applyPhotoFramePreset(btn.dataset.preset); });
});
els.discardPhotoBtn.addEventListener("click", () => { playUiClickSound(); discardPhoto(); });
els.savePhotoBtn.addEventListener("click", savePhotoWithName);
els.savePhotoModal.addEventListener("click", (event) => {
  if (event.target === els.savePhotoModal) discardPhoto();
});
els.cancelDeleteBtn.addEventListener("click", () => {
  playUiClickSound();
  state.pendingDeleteMemoryId = null;
  els.deleteConfirmModal.classList.add("hidden");
});
els.confirmDeleteBtn.addEventListener("click", executeDeleteMemory);
els.deleteConfirmModal.addEventListener("click", (event) => {
  if (event.target === els.deleteConfirmModal) {
    state.pendingDeleteMemoryId = null;
    els.deleteConfirmModal.classList.add("hidden");
  }
});

document.querySelectorAll(".time-option").forEach((button) => {
  button.addEventListener("click", () => {
    playUiClickSound();
    if (button.dataset.custom === "true") {
      const minutes = Number(els.customMinuteWheel.value) || 10;
      setEndlessTime(minutes * 60, true);
      return;
    }
    setEndlessTime(Number(button.dataset.seconds) || 60, false);
  });
});

els.customMinuteWheel.addEventListener("change", () => {
  setEndlessTime((Number(els.customMinuteWheel.value) || 10) * 60, true);
});
els.startEndlessBtn.addEventListener("click", () => { playUiClickSound(); startEndless(); });
els.leaderboardBtn.addEventListener("click", () => { playUiClickSound(); showLeaderboard(); });
els.closeLeaderboardBtn.addEventListener("click", () => { playUiClickSound(); els.leaderboardModal.classList.add("hidden"); });
els.leaderboardModal.addEventListener("click", (event) => {
  if (event.target === els.leaderboardModal) els.leaderboardModal.classList.add("hidden");
});
els.collectionBtn.addEventListener("click", () => { playUiClickSound(); showCollection(); });
els.closeCollectionBtn.addEventListener("click", () => { playUiClickSound(); closeCollection(); });
els.collectionModal.addEventListener("click", (event) => {
  if (event.target === els.collectionModal) closeCollection();
});
els.sceneBtn.addEventListener("click", () => { playUiClickSound(); showSceneSelector(); });
els.closeSceneModalBtn.addEventListener("click", () => { playUiClickSound(); closeSceneSelector(); });
els.sceneModal.addEventListener("click", (event) => {
  if (event.target === els.sceneModal) closeSceneSelector();
});
document.querySelectorAll(".collection-tab").forEach((tab) => {
  tab.addEventListener("click", () => { playUiClickSound(); setCollectionTab(tab.dataset.tab); });
});
els.profileBadge.addEventListener("click", () => { playUiClickSound(); openRegisterModal(); });
document.getElementById("memoryFullscreenClose").addEventListener("click", () => { playUiClickSound(); closeMemoryFullscreen(); });
document.getElementById("memoryFullscreen").addEventListener("click", (e) => {
  if (e.target === document.getElementById("memoryFullscreen")) closeMemoryFullscreen();
});
els.saveProfileBtn.addEventListener("click", () => { playUiClickSound(); saveProfile(); });
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem(PROFILE_KEY);
  state.profile = null;
  renderProfile();
  document.getElementById("registerModal").classList.add("hidden");
  showSplash();
});
els.playerNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") saveProfile();
});
els.avatarChoices.addEventListener("click", (event) => {
  const button = event.target.closest(".avatar-choice");
  if (!button) return;
  playUiClickSound();
  state.selectedAvatar = button.dataset.avatar;
  renderAvatarChoices();
});

els.pool.addEventListener("mousemove", (event) => {
  liftHoveredStacks(event.clientX, event.clientY);
});
els.pool.addEventListener("mouseleave", () => {
  document.querySelectorAll(".sink-item.peeking").forEach((el) => el.classList.remove("peeking"));
});

document.addEventListener("click", (event) => {
  dropSelectedOnBlank(event.target);
});

populateCustomMinutes();
setEndlessTime(60, false);
loadProfile();
loadCampaignProgress();
loadCatalogSeen();
loadSavedScene();
showSplash();
