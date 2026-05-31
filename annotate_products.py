from pathlib import Path
from PIL import Image
import colorsys
import json
import math


ROOT = Path(__file__).resolve().parent
PRODUCTS_JS = ROOT / "products.js"
GENERATED = ROOT / "assets" / "products" / "generated"


def load_products():
    text = PRODUCTS_JS.read_text(encoding="utf-8")
    prefix = "window.PRODUCTS = "
    if not text.startswith(prefix):
        raise ValueError("products.js does not start with window.PRODUCTS")
    payload = text[len(prefix):].strip()
    if payload.endswith(";"):
        payload = payload[:-1]
    return json.loads(payload)


def avg_color(path):
    rgba = Image.open(path).convert("RGBA")
    step = max(1, int(math.sqrt((rgba.width * rgba.height) / 6000)))
    rs = gs = bs = count = 0
    for y in range(0, rgba.height, step):
        for x in range(0, rgba.width, step):
            r, g, b, a = rgba.getpixel((x, y))
            if a < 40:
                continue
            lum = r * 0.299 + g * 0.587 + b * 0.114
            if lum < 24:
                continue
            if max(r, g, b) - min(r, g, b) < 12 and 55 < lum < 230:
                continue
            rs += r
            gs += g
            bs += b
            count += 1
    if count < 20:
        for y in range(0, rgba.height, step):
            for x in range(0, rgba.width, step):
                r, g, b, a = rgba.getpixel((x, y))
                if a > 40:
                    rs += r
                    gs += g
                    bs += b
                    count += 1
    return (round(rs / count), round(gs / count), round(bs / count)) if count else (190, 190, 190)


def color_name_rank(rgb):
    r, g, b = [v / 255 for v in rgb]
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    hue = h * 360
    if l > 0.82 and s < 0.22:
        name = "白色/浅色"
    elif l < 0.24:
        name = "深色"
    elif s < 0.18:
        name = "灰白色"
    elif hue < 18 or hue >= 345:
        name = "红色"
    elif hue < 42:
        name = "橙色/肤色"
    elif hue < 68:
        name = "黄色/金色"
    elif hue < 155:
        name = "绿色"
    elif hue < 205:
        name = "青色"
    elif hue < 248:
        name = "蓝色"
    elif hue < 292:
        name = "紫色"
    else:
        name = "粉色"
    order = {
        "白色/浅色": 1,
        "橙色/肤色": 2,
        "黄色/金色": 3,
        "粉色": 4,
        "红色": 5,
        "绿色": 6,
        "青色": 7,
        "蓝色": 8,
        "紫色": 9,
        "灰白色": 10,
        "深色": 11,
    }
    return name, order[name]


def color_family(color_name):
    if "粉" in color_name or "红" in color_name:
        return "粉红"
    if "蓝" in color_name or "青" in color_name:
        return "蓝"
    if "绿" in color_name:
        return "绿"
    if "黄" in color_name or "金" in color_name or "橙" in color_name or "肤" in color_name:
        return "暖色"
    if "紫" in color_name:
        return "紫"
    if "白" in color_name or "灰" in color_name:
        return "白灰"
    if "深" in color_name:
        return "深色"
    return "混合"


CATEGORY_MAP = {
    "卸妆膏": "护肤", "卸妆油": "护肤", "卸妆水": "护肤",
    "洗面奶": "护肤", "洁面慕斯": "护肤", "爽肤水": "护肤", "精华液": "护肤", "眼霜": "护肤",
    "乳液": "护肤", "面霜": "护肤", "防晒霜": "护肤", "补水喷雾": "护肤", "面膜": "护肤", "去角质啫喱": "护肤",
    "洗发水": "洗护", "护发素": "洗护", "发膜": "洗护", "沐浴露": "洗护", "身体乳": "洗护",
    "身体油": "洗护", "磨砂膏": "洗护", "香皂": "洗护", "泡澡球": "洗护", "护手霜": "洗护",
    "护手霜2": "洗护", "止汗露": "洗护", "牙膏": "洗护",
    "粉底液": "彩妆", "气垫": "彩妆", "遮瑕": "彩妆", "散粉": "彩妆", "综合盘": "彩妆",
    "腮红": "彩妆", "睫毛膏": "彩妆", "假睫毛": "彩妆", "口红": "彩妆",
    "香水": "香氛", "香薰蜡烛": "香氛",
    "梳子": "工具", "美妆工具": "工具",
}

SHAPE_TYPE_MAP = {
    "卸妆膏": "圆罐", "卸妆油": "高瓶", "卸妆水": "泵瓶",
    "洗面奶": "软管", "洁面慕斯": "泵瓶", "爽肤水": "高瓶", "精华液": "滴管瓶", "眼霜": "圆罐",
    "乳液": "泵瓶", "面霜": "圆罐", "防晒霜": "软管", "补水喷雾": "喷雾瓶", "面膜": "袋装", "去角质啫喱": "软管",
    "洗发水": "泵瓶", "护发素": "软管", "发膜": "圆罐", "沐浴露": "泵瓶", "身体乳": "泵瓶",
    "身体油": "高瓶", "磨砂膏": "圆罐", "香皂": "球形/皂", "泡澡球": "球形/皂", "护手霜": "软管",
    "护手霜2": "软管", "止汗露": "滚珠瓶", "牙膏": "软管",
    "粉底液": "高瓶", "气垫": "扁盒", "遮瑕": "长管", "散粉": "扁盒", "综合盘": "扁盒",
    "腮红": "扁盒", "睫毛膏": "长管", "假睫毛": "扁盒", "口红": "长管",
    "香水": "异形瓶", "香薰蜡烛": "圆罐",
    "梳子": "工具", "美妆工具": "工具",
}

SHAPE_ORDER = {
    "袋装": 1,
    "扁盒": 2,
    "球形/皂": 3,
    "圆罐": 4,
    "长管": 5,
    "软管": 6,
    "滴管瓶": 7,
    "滚珠瓶": 7,
    "喷雾瓶": 8,
    "泵瓶": 9,
    "高瓶": 10,
    "异形瓶": 11,
    "工具": 12,
}

USAGE_MAP = {
    "卸妆水": ("卸妆清洁", 0.1), "卸妆油": ("卸妆清洁", 0.15), "卸妆膏": ("卸妆清洁", 0.2),
    "洗面奶": ("清洁", 1), "洁面慕斯": ("清洁", 1.1), "去角质啫喱": ("去角质", 1.5),
    "爽肤水": ("水类", 2), "补水喷雾": ("水类", 2.2), "精华液": ("精华", 3), "眼霜": ("眼部护理", 3.5),
    "面膜": ("加强护理", 3.8), "乳液": ("保湿", 4), "面霜": ("保湿", 4.2), "防晒霜": ("防晒", 5),
    "洗发水": ("头发清洁", 10), "护发素": ("头发护理", 11), "发膜": ("头发加强护理", 11.5), "梳子": ("工具", 12),
    "沐浴露": ("身体清洁", 20), "香皂": ("身体清洁", 20.1), "泡澡球": ("身体清洁", 20.2),
    "磨砂膏": ("身体去角质", 21), "身体乳": ("身体滋润", 22), "身体油": ("身体滋润", 22.2),
    "护手霜": ("局部护理", 23), "护手霜2": ("局部护理", 23), "止汗露": ("局部护理", 23.4), "牙膏": ("口腔清洁", 24),
    "粉底液": ("底妆", 30), "气垫": ("底妆", 30.1), "遮瑕": ("遮瑕", 31), "散粉": ("定妆", 32),
    "腮红": ("面部彩妆", 33), "综合盘": ("眼影/综合盘", 34), "睫毛膏": ("睫毛产品", 35),
    "假睫毛": ("睫毛产品", 35.2), "口红": ("唇妆", 36), "美妆工具": ("上妆工具", 37),
    "香水": ("香氛", 40), "香薰蜡烛": ("家居香氛", 41),
}

VISUAL_SIZE = {
    "卸妆膏": (6.4, 8.2), "卸妆油": (13.8, 4.9), "卸妆水": (17.2, 5.4),
    "假睫毛": (4.2, 11.5), "口红": (8.6, 2.2), "遮瑕": (6.8, 2.6), "睫毛膏": (12, 2),
    "眼霜": (5, 4.8), "护手霜2": (11.5, 4), "护手霜": (14, 4.8), "散粉": (5.2, 7.5),
    "气垫": (4.8, 8.8), "腮红": (2.5, 7.2), "综合盘": (3.2, 16), "牙膏": (18.2, 5.2),
    "防晒霜": (15.4, 5.3), "洗面奶": (16.2, 5.6), "去角质啫喱": (16.5, 5.5), "粉底液": (16.4, 5),
    "精华液": (12, 3.6), "面霜": (6.8, 7.4), "香水": (10, 5.4), "香皂": (3.8, 8.5),
    "泡澡球": (6.8, 6.8), "香薰蜡烛": (10, 8.5), "止汗露": (13.2, 4.8), "身体油": (16, 5.7),
    "补水喷雾": (18.6, 5), "乳液": (18.8, 5.8), "爽肤水": (19.8, 5.4), "面膜": (19.8, 13.2),
    "身体乳": (21, 6.5), "磨砂膏": (9.6, 9.8), "洁面慕斯": (19.4, 5.9), "护发素": (22, 6.3),
    "发膜": (11, 10.8), "梳子": (22.2, 5.6), "沐浴露": (23.5, 7.4), "洗发水": (24.5, 7.4),
}


def tool_subtype(item):
    if item["product"] == "梳子":
        return "梳子"
    if item["product"] != "美妆工具":
        return None
    aspect = item["heightPx"] / max(item["widthPx"], 1)
    if aspect >= 2.25:
        return "长柄工具"
    if aspect >= 1.55:
        return "刷具"
    return "粉扑/海绵"


def symmetry_score(shape_type, product):
    if shape_type in {"扁盒", "圆罐", "长管", "软管", "泵瓶", "高瓶", "滴管瓶", "喷雾瓶", "滚珠瓶"}:
        return 8
    if shape_type == "球形/皂":
        return 7
    if shape_type == "异形瓶":
        return 5
    if shape_type == "工具":
        return 4 if product == "梳子" else 3
    return 6


def make_remover_item(prefix, product, variant, shape, capacity, usage_order):
    image = GENERATED / f"{prefix}_{variant:02d}.png"
    im = Image.open(image).convert("RGBA")
    rgb = avg_color(image)
    cname, crank = color_name_rank(rgb)
    rel = min(1, max(0, (im.width * im.height) / (430 * 430)))
    cap = max(10, int(round(capacity * (0.75 + rel * 0.55) / 5) * 5))
    return {
        "id": f"{prefix}_{variant:02d}",
        "name": f"{product}{variant}",
        "product": product,
        "variant": variant,
        "image": f"assets/products/generated/{prefix}_{variant:02d}.png",
        "sourceImage": "补充源图/卸妆水",
        "category": "卸妆清洁",
        "bigCategory": "护肤",
        "shape": shape,
        "brandClass": "护肤品牌",
        "routine": "skincare",
        "usageOrder": usage_order,
        "capacityMl": cap,
        "widthPx": im.width,
        "heightPx": im.height,
        "visualHeight": round(im.height / 14, 1),
        "heightLabel": "中",
        "sizeScore": round(im.width * im.height / 1400, 1),
        "relativeSize": 0,
        "sizeLabel": "中号",
        "colorHex": "#%02x%02x%02x" % rgb,
        "colorName": cname,
        "colorRank": crank,
    }


def add_missing_removers(products):
    products = [p for p in products if not p["id"].startswith("makeup_remover_")]
    for index in range(1, 21):
        products.append(make_remover_item("makeup_remover_balm", "卸妆膏", index, "圆罐", 100, 0.2))
    for index in range(1, 13):
        products.append(make_remover_item("makeup_remover_oil", "卸妆油", index, "瓶装", 180, 0.15))
        products.append(make_remover_item("makeup_remover_water", "卸妆水", index, "泵瓶", 250, 0.1))
    return products


def annotate(item):
    product = item["product"]
    shape_type = SHAPE_TYPE_MAP.get(product, "瓶罐")
    base_h, base_w = VISUAL_SIZE.get(product, (max(4, item["heightPx"] / 35), max(2, item["widthPx"] / 35)))
    aspect = item["heightPx"] / max(item["widthPx"], 1)
    variant_offset = ((item.get("variant") or 1) % 5 - 2) * 0.02
    height_score = round(base_h * (1 + variant_offset + max(-0.05, min(0.07, (aspect - 1.3) * 0.02))), 2)
    width_score = round(base_w * (1 - variant_offset * 0.35), 2)
    flatness = round(max(0, min(10, 10 - height_score / max(width_score, 0.1) * 2.1)), 2)
    usage_stage, usage_order = USAGE_MAP.get(product, ("通用整理", 99))
    family = color_family(item.get("colorName", ""))
    item["productType"] = product
    item["gameCategory"] = CATEGORY_MAP.get(product, item.get("bigCategory") or item.get("category") or "产品")
    item["shapeType"] = shape_type
    item["shapeOrder"] = SHAPE_ORDER.get(shape_type, 99)
    item["heightScore"] = height_score
    item["widthScore"] = width_score
    item["flatnessScore"] = flatness
    item["symmetryScore"] = symmetry_score(shape_type, product)
    item["colorFamily"] = family
    item["usageStage"] = usage_stage
    item["usageStageOrder"] = usage_order
    item["toolSubtype"] = tool_subtype(item)
    item["ruleTags"] = [item["gameCategory"], item["productType"], item["shapeType"], family, usage_stage]
    item["isDistractorFriendly"] = shape_type in {"长管", "软管", "高瓶", "泵瓶", "扁盒", "圆罐", "工具"}
    item["ruleHeightScore"] = height_score
    item["ruleWidthScore"] = width_score
    item["ruleSizeScore"] = round(height_score * width_score, 1)


def main():
    products = add_missing_removers(load_products())
    for item in products:
        annotate(item)
    products.sort(key=lambda p: p["id"])
    PRODUCTS_JS.write_text("window.PRODUCTS = " + json.dumps(products, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
    counts = {}
    for item in products:
        counts[item["product"]] = counts.get(item["product"], 0) + 1
    print(f"products {len(products)}")
    for name in ("卸妆膏", "卸妆油", "卸妆水"):
        print(f"{name}: {counts.get(name, 0)}")


if __name__ == "__main__":
    main()
