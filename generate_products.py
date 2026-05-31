from PIL import Image
from pathlib import Path
import colorsys
import json
import math
import re


ROOT = Path(__file__).resolve().parent
IMAGE_ROOT = ROOT.parent / "image"
OUT_DIR = ROOT / "assets" / "products" / "generated"
PRODUCTS_JS = ROOT / "products.js"
RESAMPLE = getattr(Image, "Resampling", Image).LANCZOS

SOURCE_NAME_OVERRIDES = {
    "洁面慕斯final": "洁面慕斯",
}

SKIP_SOURCES = {
    "洁面慕斯.png",
}


META = {
    "洗面奶": {"category": "面部清洁", "bigCategory": "护肤", "shape": "软管", "capacity": 120, "usageOrder": 1, "routine": "skincare", "brandClass": "护肤品牌"},
    "洁面慕斯": {"category": "面部清洁", "bigCategory": "护肤", "shape": "泵瓶", "capacity": 150, "usageOrder": 1.1, "routine": "skincare", "brandClass": "护肤品牌"},
    "爽肤水": {"category": "基础护肤", "bigCategory": "护肤", "shape": "高瓶", "capacity": 150, "usageOrder": 2, "routine": "skincare", "brandClass": "护肤品牌"},
    "精华液": {"category": "基础护肤", "bigCategory": "护肤", "shape": "滴管瓶", "capacity": 30, "usageOrder": 3, "routine": "skincare", "brandClass": "护肤品牌"},
    "面霜": {"category": "基础护肤", "bigCategory": "护肤", "shape": "圆罐", "capacity": 50, "usageOrder": 4, "routine": "skincare", "brandClass": "护肤品牌"},
    "防晒霜": {"category": "防护", "bigCategory": "护肤", "shape": "软管", "capacity": 60, "usageOrder": 5, "routine": "skincare", "brandClass": "护肤品牌"},
    "乳液": {"category": "基础护肤", "bigCategory": "护肤", "shape": "泵瓶", "capacity": 100, "usageOrder": 4.5, "routine": "optional_skincare", "brandClass": "护肤品牌"},
    "补水喷雾": {"category": "基础护肤", "bigCategory": "护肤", "shape": "喷雾瓶", "capacity": 100, "usageOrder": 2.5, "routine": "optional_skincare", "brandClass": "护肤品牌"},
    "眼霜": {"category": "基础护肤", "bigCategory": "护肤", "shape": "小罐", "capacity": 20, "usageOrder": 3.5, "routine": "optional_skincare", "brandClass": "护肤品牌"},
    "面膜": {"category": "基础护肤", "bigCategory": "护肤", "shape": "袋装", "capacity": 25, "usageOrder": 3.8, "routine": "optional_skincare", "brandClass": "护肤品牌"},
    "去角质啫喱": {"category": "面部清洁", "bigCategory": "护肤", "shape": "软管", "capacity": 80, "usageOrder": 1.5, "routine": "optional_skincare", "brandClass": "护肤品牌"},
    "洗发水": {"category": "头发护理", "bigCategory": "洗护", "shape": "泵瓶", "capacity": 300, "usageOrder": 1, "routine": "haircare", "brandClass": "洗护品牌"},
    "护发素": {"category": "头发护理", "bigCategory": "洗护", "shape": "软管/瓶", "capacity": 250, "usageOrder": 2, "routine": "haircare", "brandClass": "洗护品牌"},
    "发膜": {"category": "头发护理", "bigCategory": "洗护", "shape": "圆罐", "capacity": 180, "usageOrder": 3, "routine": "haircare", "brandClass": "洗护品牌"},
    "沐浴露": {"category": "身体护理", "bigCategory": "洗护", "shape": "泵瓶", "capacity": 300, "usageOrder": 1, "routine": "bodycare", "brandClass": "洗护品牌"},
    "香皂": {"category": "身体护理", "bigCategory": "洗护", "shape": "圆皂", "capacity": 100, "usageOrder": 1.1, "routine": "bodycare", "brandClass": "洗护品牌"},
    "泡澡球": {"category": "身体护理", "bigCategory": "洗护", "shape": "圆球", "capacity": 120, "usageOrder": 1.2, "routine": "bodycare", "brandClass": "洗护品牌"},
    "磨砂膏": {"category": "身体护理", "bigCategory": "洗护", "shape": "圆罐", "capacity": 180, "usageOrder": 2, "routine": "bodycare", "brandClass": "洗护品牌"},
    "身体乳": {"category": "身体护理", "bigCategory": "洗护", "shape": "泵瓶", "capacity": 250, "usageOrder": 3, "routine": "bodycare", "brandClass": "洗护品牌"},
    "身体油": {"category": "身体护理", "bigCategory": "洗护", "shape": "瓶装", "capacity": 120, "usageOrder": 4, "routine": "bodycare", "brandClass": "洗护品牌"},
    "止汗露": {"category": "个护", "bigCategory": "洗护", "shape": "滚珠瓶", "capacity": 50, "usageOrder": 5, "routine": "bodycare", "brandClass": "洗护品牌"},
    "护手霜": {"category": "手部护理", "bigCategory": "洗护", "shape": "软管", "capacity": 30, "usageOrder": 6, "routine": "bodycare", "brandClass": "洗护品牌"},
    "护手霜2": {"category": "手部护理", "bigCategory": "洗护", "shape": "软管", "capacity": 30, "usageOrder": 6, "routine": "bodycare", "brandClass": "洗护品牌"},
    "牙膏": {"category": "口腔护理", "bigCategory": "洗护", "shape": "软管", "capacity": 90, "usageOrder": 1, "routine": "washup", "brandClass": "洗护品牌"},
    "梳子": {"category": "工具", "bigCategory": "工具", "shape": "工具", "capacity": 0, "usageOrder": 4, "routine": "tool", "brandClass": "工具品牌"},
    "美妆工具": {"category": "工具", "bigCategory": "工具", "shape": "工具", "capacity": 0, "usageOrder": 4.5, "routine": "tool", "brandClass": "工具品牌"},
    "粉底液": {"category": "底妆", "bigCategory": "美妆", "shape": "方瓶/滴管瓶", "capacity": 35, "usageOrder": 1, "routine": "makeup", "brandClass": "彩妆品牌"},
    "气垫": {"category": "底妆", "bigCategory": "美妆", "shape": "圆盒", "capacity": 15, "usageOrder": 1.2, "routine": "makeup", "brandClass": "彩妆品牌"},
    "遮瑕": {"category": "底妆", "bigCategory": "美妆", "shape": "细管", "capacity": 6, "usageOrder": 1.4, "routine": "makeup", "brandClass": "彩妆品牌"},
    "散粉": {"category": "定妆", "bigCategory": "美妆", "shape": "圆盒", "capacity": 10, "usageOrder": 1.6, "routine": "makeup", "brandClass": "彩妆品牌"},
    "综合盘": {"category": "眼妆", "bigCategory": "美妆", "shape": "方盘/圆盘", "capacity": 12, "usageOrder": 2, "routine": "makeup", "brandClass": "彩妆品牌"},
    "眉装": {"category": "眉眼彩妆", "bigCategory": "美妆", "shape": "细管/小盘", "capacity": 6, "usageOrder": 2.2, "routine": "makeup", "brandClass": "彩妆品牌"},
    "睫毛膏": {"category": "眼妆", "bigCategory": "美妆", "shape": "细管", "capacity": 8, "usageOrder": 2.6, "routine": "makeup", "brandClass": "彩妆品牌"},
    "假睫毛": {"category": "眼妆", "bigCategory": "美妆", "shape": "弧形片", "capacity": 1, "usageOrder": 2.8, "routine": "makeup", "brandClass": "彩妆品牌"},
    "腮红": {"category": "面部彩妆", "bigCategory": "美妆", "shape": "粉盒", "capacity": 8, "usageOrder": 3, "routine": "makeup", "brandClass": "彩妆品牌"},
    "香水": {"category": "香氛", "bigCategory": "香氛", "shape": "香水瓶", "capacity": 50, "usageOrder": 5, "routine": "fragrance", "brandClass": "香氛品牌"},
    "香薰蜡烛": {"category": "香氛", "bigCategory": "香氛", "shape": "圆罐", "capacity": 160, "usageOrder": 6, "routine": "fragrance", "brandClass": "香氛品牌"},
    "口红": {"category": "唇妆", "bigCategory": "美妆", "shape": "口红管", "capacity": 4, "usageOrder": 4, "routine": "makeup", "brandClass": "彩妆品牌"},
}


MANUAL_BOXES = {
    # Opaque-background sources. Skip boxed sets that contain multiple tiny products.
    "护发素": [(75, 400, 325, 930), (365, 180, 610, 930), (640, 275, 895, 930), (925, 540, 1078, 930), (1125, 625, 1272, 925), (1292, 640, 1422, 925)],
    "护手霜": [(42, 580, 182, 925), (198, 570, 324, 920), (360, 400, 514, 920), (528, 400, 694, 920), (708, 505, 854, 920), (878, 505, 1032, 920)],
    "洁面慕斯": [(175, 115, 335, 500), (395, 120, 550, 500), (635, 115, 785, 500), (895, 115, 1045, 500), (1140, 115, 1285, 500), (175, 535, 325, 900), (385, 535, 545, 900), (612, 535, 758, 900), (836, 535, 984, 900), (1076, 535, 1228, 900), (1270, 535, 1405, 900)],
    "香薰蜡烛": [(35, 45, 305, 395), (335, 20, 585, 400), (610, 55, 850, 395), (875, 45, 1100, 405), (35, 430, 280, 750), (295, 480, 560, 750), (585, 435, 825, 760), (855, 395, 1095, 755), (25, 775, 265, 1105), (300, 790, 510, 1100), (540, 825, 770, 1095), (765, 755, 1115, 1100), (40, 1115, 265, 1395), (275, 1125, 575, 1395), (635, 1135, 835, 1395), (890, 1130, 1100, 1395)],
    "磨砂膏": [(100, 55, 510, 310), (615, 55, 1000, 310), (100, 330, 510, 595), (610, 340, 1000, 600), (80, 600, 520, 860), (610, 620, 1010, 870), (105, 880, 510, 1130), (605, 905, 1020, 1145), (105, 1135, 520, 1390), (610, 1160, 1020, 1395)],
}


SLUGS = {
    "乳液": "lotion", "去角质啫喱": "exfoliating_gel", "发膜": "hair_mask", "护发素": "conditioner",
    "护手霜": "hand_cream", "护手霜2": "hand_cream_travel", "梳子": "comb", "止汗露": "deodorant",
    "沐浴露": "shower_gel", "洁面慕斯": "cleansing_mousse", "洗发水": "shampoo", "洗面奶": "cleanser",
    "爽肤水": "toner", "牙膏": "toothpaste", "眉装": "brow", "眼霜": "eye_cream", "磨砂膏": "scrub",
    "粉底液": "foundation", "精华液": "serum", "综合盘": "palette", "美妆工具": "beauty_tool",
    "腮红": "blush", "补水喷雾": "hydrating_spray", "身体乳": "body_lotion", "身体油": "body_oil",
    "防晒霜": "sunscreen", "面膜": "mask", "面霜": "cream", "香水": "perfume", "气垫": "cushion",
    "香皂": "soap", "泡澡球": "bath_bomb", "香薰蜡烛": "scented_candle", "遮瑕": "concealer",
    "散粉": "setting_powder", "睫毛膏": "mascara", "假睫毛": "false_lash",
    "口红": "lipstick",
}


def connected_boxes(alpha, min_area=11000):
    w, h = alpha.size
    pix = alpha.load()
    visited = bytearray(w * h)
    boxes = []
    for y in range(h):
        for x in range(w):
            idx = y * w + x
            if visited[idx] or pix[x, y] <= 12:
                continue
            stack = [(x, y)]
            visited[idx] = 1
            minx = maxx = x
            miny = maxy = y
            area = 0
            while stack:
                cx, cy = stack.pop()
                area += 1
                minx, maxx = min(minx, cx), max(maxx, cx)
                miny, maxy = min(miny, cy), max(maxy, cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        ni = ny * w + nx
                        if not visited[ni] and pix[nx, ny] > 12:
                            visited[ni] = 1
                            stack.append((nx, ny))
            bw, bh = maxx - minx + 1, maxy - miny + 1
            if area >= min_area and bw >= 42 and bh >= 42:
                boxes.append((minx, miny, maxx + 1, maxy + 1, area))
    return sorted(boxes, key=lambda b: (b[1] // 140, b[0]))


def padded_box(box, size, pad):
    x1, y1, x2, y2 = box[:4]
    w, h = size
    return max(0, x1 - pad), max(0, y1 - pad), min(w, x2 + pad), min(h, y2 + pad)


def trim_alpha(image):
    image = image.convert("RGBA")
    bbox = image.getchannel("A").getbbox()
    return image.crop(bbox) if bbox else image


def resize_for_game(image, max_side=430):
    image = image.convert("RGBA")
    scale = min(1, max_side / max(image.size))
    if scale < 1:
        image = image.resize((round(image.width * scale), round(image.height * scale)), RESAMPLE)
    return image


def avg_color(image):
    rgba = image.convert("RGBA")
    step = max(1, int(math.sqrt((rgba.width * rgba.height) / 6000)))
    rs = gs = bs = count = 0
    for y in range(0, rgba.height, step):
        for x in range(0, rgba.width, step):
            r, g, b, a = rgba.getpixel((x, y))
            if a < 40:
                continue
            mx, mn = max(r, g, b), min(r, g, b)
            lum = r * 0.299 + g * 0.587 + b * 0.114
            if lum < 24:
                continue
            if mx - mn < 12 and 55 < lum < 210:
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
    return (round(rs / count), round(gs / count), round(bs / count)) if count else (180, 180, 180)


def color_name(rgb):
    r, g, b = [v / 255 for v in rgb]
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    hue = h * 360
    if l > 0.82 and s < 0.22:
        return "白色/浅色"
    if l < 0.24:
        return "深色"
    if s < 0.18:
        return "灰白色"
    if hue < 18 or hue >= 345:
        return "红色"
    if hue < 42:
        return "橙色/肤色"
    if hue < 68:
        return "黄色/金色"
    if hue < 155:
        return "绿色"
    if hue < 205:
        return "青色"
    if hue < 248:
        return "蓝色"
    if hue < 292:
        return "紫色"
    return "粉色"


def color_rank(rgb):
    order = {"白色/浅色": 1, "橙色/肤色": 2, "黄色/金色": 3, "粉色": 4, "红色": 5, "绿色": 6, "青色": 7, "蓝色": 8, "紫色": 9, "灰白色": 10, "深色": 11}
    return order.get(color_name(rgb), 6)


def slug_for(name):
    return SLUGS.get(name, re.sub(r"\W+", "_", name.lower()).strip("_") or "product")


def collect_sources():
    image_sources = [source for source in sorted(IMAGE_ROOT.glob("*.png")) if source.name not in SKIP_SOURCES]
    return image_sources


def lipstick_products():
    lipstick_meta = [
        ("lipstick_01.png", "黑金方管", 7, 8, 8, "#1d1a1b", "深色"),
        ("lipstick_02.png", "海军蓝方管", 6, 8, 7, "#20314d", "蓝色"),
        ("lipstick_03.png", "爱心粉管", 3, 7, 9, "#f3a3b7", "粉色"),
        ("lipstick_04.png", "黑金圆管", 7, 7, 6, "#171515", "深色"),
        ("lipstick_05.png", "粉蝴蝶结", 2, 9, 8, "#f6bed0", "粉色"),
        ("lipstick_06.png", "金色圆管", 5, 9, 6, "#d8a844", "黄色/金色"),
        ("lipstick_07.png", "玫瑰金管", 4, 9, 5, "#c98f82", "橙色/肤色"),
        ("lipstick_08.png", "白金雕花", 1, 8, 9, "#f6f1e8", "白色/浅色"),
        ("lipstick_09.png", "蜜桃圆管", 3, 8, 5, "#f2a88f", "橙色/肤色"),
        ("lipstick_10.png", "粉晶闪管", 3, 8, 7, "#f2b7c8", "粉色"),
        ("lipstick_11.png", "银白圆管", 1, 7, 4, "#eeeeee", "白色/浅色"),
        ("lipstick_12.png", "渐变红方管", 8, 9, 8, "#b33f46", "红色"),
    ]
    products = []
    for index, (filename, name, color_rank_value, height_rank, luxury_rank, color_hex, color_name_value) in enumerate(lipstick_meta, 1):
        source = ROOT / "assets" / "products" / filename
        if not source.exists():
            continue
        products.append({
            "id": f"lipstick_{index:02}",
            "name": name,
            "product": "口红",
            "variant": index,
            "image": f"assets/products/{filename}",
            "sourceImage": filename,
            "category": "唇妆",
            "bigCategory": "美妆",
            "shape": "口红管",
            "brandClass": "彩妆品牌",
            "routine": "makeup",
            "usageOrder": 4,
            "capacityMl": 4,
            "widthPx": 80,
            "heightPx": 170 + height_rank * 8,
            "visualHeight": height_rank * 10,
            "heightLabel": "高" if height_rank >= 8 else "中",
            "sizeScore": 26 + height_rank * 3,
            "relativeSize": min(1, height_rank / 10),
            "sizeLabel": "大号" if height_rank >= 9 else "中号",
            "colorHex": color_hex,
            "colorName": color_name_value,
            "colorRank": color_rank_value,
            "luxuryRank": luxury_rank,
        })
    return products


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for old in OUT_DIR.glob("*.png"):
        old.unlink()

    products = []
    for source in collect_sources():
        base = SOURCE_NAME_OVERRIDES.get(source.stem, source.stem)
        meta = META.get(base, {"category": "美妆洗护", "bigCategory": "产品", "shape": "瓶罐", "capacity": 80, "usageOrder": 5, "routine": "generic", "brandClass": "综合品牌"})
        src = Image.open(source).convert("RGBA")
        manual = MANUAL_BOXES.get(base)
        if manual:
            boxes = [(x1, y1, x2, y2, (x2 - x1) * (y2 - y1)) for x1, y1, x2, y2 in manual]
            pad = 0
            trim = False
        else:
            boxes = connected_boxes(src.getchannel("A"))
            if not boxes:
                bbox = src.getchannel("A").getbbox()
                boxes = [(bbox[0], bbox[1], bbox[2], bbox[3], (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]))] if bbox else []
            pad = 10
            trim = True

        if not boxes:
            continue

        areas = [box[4] for box in boxes]
        min_area, max_area = min(areas), max(areas)
        for index, box in enumerate(boxes, 1):
            crop = src.crop(padded_box(box, src.size, pad)).convert("RGBA")
            if trim:
                crop = trim_alpha(crop)
            rgb = avg_color(crop)
            bw, bh, area = box[2] - box[0], box[3] - box[1], box[4]
            rel = 0.5 if max_area == min_area else (area - min_area) / (max_area - min_area)
            visual_height = round(bh / src.height * 100, 1)
            size_score = round(area / (src.width * src.height) * 1000, 1)
            capacity = 0 if meta["capacity"] == 0 else max(4, int(round(meta["capacity"] * (0.72 + rel * 0.72) / 5) * 5))
            filename = f"{slug_for(base)}_{index:02}.png"
            resize_for_game(crop).save(OUT_DIR / filename)
            products.append({
                "id": f"{slug_for(base)}_{index:02}",
                "name": f"{base}{index}",
                "product": base,
                "variant": index,
                "image": f"assets/products/generated/{filename}",
                "sourceImage": source.name,
                "category": meta["category"],
                "bigCategory": meta["bigCategory"],
                "shape": meta["shape"],
                "brandClass": meta["brandClass"],
                "routine": meta["routine"],
                "usageOrder": meta["usageOrder"],
                "capacityMl": capacity,
                "widthPx": bw,
                "heightPx": bh,
                "visualHeight": visual_height,
                "heightLabel": "高" if visual_height >= 54 else ("中" if visual_height >= 36 else "矮"),
                "sizeScore": size_score,
                "relativeSize": round(rel, 3),
                "sizeLabel": "大号" if rel >= 0.67 else ("中号" if rel >= 0.34 else "小号"),
                "colorHex": "#%02x%02x%02x" % rgb,
                "colorName": color_name(rgb),
                "colorRank": color_rank(rgb),
            })

    products.extend(lipstick_products())
    products.sort(key=lambda item: (item["bigCategory"], item["product"], item["variant"]))
    PRODUCTS_JS.write_text("window.PRODUCTS = " + json.dumps(products, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
    print(f"generated {len(products)} products")


if __name__ == "__main__":
    main()
