#!/usr/bin/env python3
"""Build merged SVG Kits packages under merges/<slug>/.

Reads source themes from /tmp/fx-lab-merge-src (CDN snapshot) and writes
self-contained packages: manifest.json, icons/*.svg, README.md, base_hash.txt.
all.png is rendered afterwards by sheet.mjs (see the bottom of main).

Does not publish. See scripts/publish-svg-kit-merges.mjs.
"""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = Path("/tmp/fx-lab-merge-src")
OUT = ROOT / "merges"

# Plate colors rejected by scripts/lib/svg-kit-tiles.ts
FORBIDDEN = {
    "#F5EFDC", "#FFF8EC", "#F6F0DC", "#FFFBF5",
    "#D8CDAE", "#E6D9C2", "#CDBF94", "#E8E0D4",
    "#F7F1E3", "#F7F3EC", "#E4E8D5", "#22372A",
}

GENERIC = [
    ("moon", re.compile(r"(full[- ]moon|prairie[- ]moon|月亮|满月|月轮|crescent|\bmoon\b)", re.I)),
    ("lantern", re.compile(r"(lantern|灯笼)", re.I)),
    ("chest", re.compile(r"(treasure[- ]chest|宝箱|\bchest\b|coffer)", re.I)),
    ("campfire", re.compile(r"(campfire|bonfire|篝火)", re.I)),
    ("mist", re.compile(r"(\bmist\b|\bfog\b|雾气|迷雾)", re.I)),
]

SCENERY_RE = re.compile(
    r"(forest|meadow|mountain|waterfall|grove|woods|landscape|sunset|horizon|"
    r"seascape|coast|island|desert|mesa|tundra|glacier|\bfield\b|\bpath\b|"
    r"\briver\b|\bcloud\b|\bsky\b|\bcave\b|birch|pinewood|starry|moonlit)",
    re.I,
)

# Lower rank is kept first when a source still has room after its heroes.
# Matched against the English title only, so id fragments like "mushroom-ring" do not win.
SIG_RANKS = [
    (0, re.compile(
        r"(pretzel|lederhosen|beer|cuckoo|alphorn|harmonica|cowboy|\blasso\b|\bspur\b|"
        r"mjolnir|gungnir|brisingamen|andvaranaut)",
        re.I,
    )),
    (1, re.compile(
        r"(\bhat\b|\bcrown\b|\bveil\b|\bmask\b|scepter|sceptre|\btrident\b|\bankh\b|"
        r"scarab|uraeus|torii|shimenawa|magatama|\blyre\b|\bharp\b|cauldron|\bmortar\b|"
        r"pestle|spindle|\bbroom\b|\bsword\b|\bspear\b|\baxe\b|\bmace\b|\bshield\b|"
        r"\bbow\b|\bhelm\b|helmet|\bbead\b|\bjewel\b|\bbell\b|sistrum|\bfan\b|"
        r"\bscroll\b|\bbook\b|\bcoin\b|\bkey\b|caduceus|fleece|\bnet\b)",
        re.I,
    )),
]

COLOR_ATTR = re.compile(
    r"\b(fill|stroke|stop-color|flood-color|lighting-color)=\"(#[0-9A-Fa-f]{3,8})\"",
    re.I,
)
COLOR_DECL = re.compile(
    r"\b(fill|stroke|stop-color|flood-color|lighting-color)\s*:\s*(#[0-9A-Fa-f]{3,8})\b",
    re.I,
)


def L(zh, en):
    return {"zh": zh, "en": en}


def src(slug, short, cat, zh, en, alt=None):
    item = {"slug": slug, "short": short, "category": cat, "label": L(zh, en)}
    if alt:
        item["alt"] = {"category": alt[0], "label": L(alt[1], alt[2])}
    return item


def pal(*rows):
    """rows: (hex, zh, en)"""
    return [{"hex": h.upper(), "zh": z, "en": e} for h, z, e in rows]


# Members are listed before the kept main slug so a story-specific icon wins
# a duplicate title. Manifest order is reversed back to main-first at emit time.
GROUPS = [
    {
        "group": 1,
        "slug": "wolpertinger-bavarian-cryptid",
        "new": False,
        "cap": 48,
        "generic_prefix": "hare",
        "title": L("鹿角兔", "Horned Hares"),
        "description": L(
            "巴伐利亚鹿角兔与北美草原鹿角兔收在一套里，共 {n} 件：奇兽本体，加上椒盐卷、啤酒杯和牛仔装具。",
            "Bavarian wolpertinger and prairie jackalope in one kit of {n} icons: the beasts, plus pretzels, beer steins, and frontier gear.",
        ),
        "cover": ("wolpertinger-bavarian-cryptid", "wolpertinger"),
        "palette": pal(
            ("#F3E6C8", "暖纸", "warm paper"),
            ("#6B8F4E", "苔绿", "moss"),
            ("#3E6B3A", "松绿", "pine"),
            ("#8C4A2F", "鹿角棕", "antler"),
            ("#C45C3E", "浆果红", "berry"),
            ("#E0B15C", "麦金", "wheat gold"),
            ("#FFFFFF", "高光", "highlight"),
            ("#3A2C22", "眼墨", "eye ink"),
        ),
        "sources": [
            src("jackalope-prairie-cryptid", "jack", "prairie-beast", "草原奇兽", "Prairie Beasts",
                ("frontier-gear", "西部装具", "Frontier Gear")),
            src("wolpertinger-bavarian-cryptid", "wolp", "bavarian-beast", "巴伐利亚奇兽", "Bavarian Beasts",
                ("alpine-gear", "阿尔卑斯器物", "Alpine Gear")),
        ],
    },
    {
        "group": 2,
        "slug": "kitsune-nine-tailed-fox",
        "new": False,
        "cap": 48,
        "generic_prefix": "fox",
        "title": L("狐仙", "Fox Spirits"),
        "description": L(
            "日本九尾、日照雨嫁女与韩国九尾狐珠收在一套里，共 {n} 件，保留狐、珠、鸟居和法器。",
            "Japanese kitsune, the sun-shower fox wedding, and the Korean kumiho bead in one kit of {n} icons.",
        ),
        "cover": ("kitsune-nine-tailed-fox", "kitsune"),
        "palette": pal(
            ("#F6E7D4", "米白", "rice paper"),
            ("#D6453D", "朱红", "vermilion"),
            ("#8E2E2A", "深朱", "deep vermilion"),
            ("#E3B34C", "金", "gold"),
            ("#2F4A3C", "松绿", "pine"),
            ("#2A3358", "靛蓝", "indigo"),
            ("#FFFFFF", "高光", "highlight"),
            ("#3A2C22", "眼墨", "eye ink"),
        ),
        "sources": [
            src("kitsune-sunshine-rain-wedding", "wed", "fox-wedding", "狐狸嫁女", "Fox Wedding",
                ("wedding-rite", "婚仪器物", "Wedding Rites")),
            src("kumiho-fox-bead", "kumiho", "kumiho", "九尾狐珠", "Kumiho",
                ("kumiho-relic", "狐珠法器", "Fox-Bead Relics")),
            src("kitsune-nine-tailed-fox", "kitsu", "kitsune", "九尾狐", "Kitsune",
                ("inari", "稻荷器物", "Inari Relics")),
        ],
    },
    {
        "group": 3,
        "slug": "egyptian",
        "new": False,
        "cap": 60,
        "generic_prefix": "eg",
        "title": L("埃及神话", "Egyptian Myth"),
        "description": L(
            "埃及神系与日舟、称心、猫神三则故事收在一套里，共 {n} 件。",
            "The Egyptian pantheon plus the solar barque, the weighing of the heart, and Bastet, {n} icons in one kit.",
        ),
        "cover": ("egyptian", "ra"),
        "palette": pal(
            ("#E7D3A1", "沙金", "sand"),
            ("#1F4E79", "青金石", "lapis"),
            ("#16324F", "夜青金", "deep lapis"),
            ("#C4922A", "金", "gold"),
            ("#C4652F", "红玉髓", "carnelian"),
            ("#1F8A7A", "绿松石", "turquoise"),
            ("#FFFFFF", "高光", "highlight"),
            ("#3A2C22", "眼墨", "eye ink"),
        ),
        "sources": [
            src("anubis-weighing-heart", "anubis", "anubis", "阿努比斯称心", "Weighing of the Heart"),
            src("ra-solar-barque", "ra", "ra", "拉的日舟", "Solar Barque"),
            src("bastet-cat-goddess", "bastet", "bastet", "巴斯特", "Bastet"),
            src("egyptian", "egy", "pantheon", "埃及神系", "Pantheon"),
        ],
    },
    {
        "group": 4,
        "slug": "norse",
        "new": False,
        "cap": 60,
        "generic_prefix": "nr",
        "title": L("北欧神话", "Norse Myth"),
        "description": L(
            "北欧诸神与四则传说（新娘锤、鲑鱼网、世界树松鼠、法夫纳指环）收在一套里，共 {n} 件。",
            "The Norse gods plus the bride-hammer, the salmon net, Ratatoskr, and Sigurd's ring, {n} icons in one kit.",
        ),
        "cover": ("norse", "odin"),
        "palette": pal(
            ("#D5DDE3", "冰", "ice"),
            ("#3E6F8C", "峡湾蓝", "fjord"),
            ("#1E3A4C", "深海", "deep water"),
            ("#8E2F2B", "卢恩红", "rune red"),
            ("#C4A15A", "蜜金", "mead gold"),
            ("#6B5344", "木", "wood"),
            ("#FFFFFF", "高光", "highlight"),
            ("#3A2C22", "眼墨", "eye ink"),
        ),
        "sources": [
            src("thor-mjolnir-bride-disguise", "thor", "thor", "托尔夺锤", "Thor's Hammer"),
            src("loki-salmon-net", "loki", "loki", "洛基与网", "Loki's Net"),
            src("ratatoskr-yggdrasil-gossip", "rata", "ratatoskr", "拉塔托斯克", "Ratatoskr"),
            src("sigurd-fafnir-ring", "sigurd", "sigurd", "西古尔德", "Sigurd"),
            src("norse", "aesir", "aesir", "阿萨诸神", "The Aesir"),
        ],
    },
    {
        "group": 5,
        "slug": "mesopotamia-myth",
        "new": False,
        "cap": 48,
        "generic_prefix": "meso",
        "title": L("美索不达米亚", "Mesopotamia"),
        "description": L(
            "美索不达米亚神话图鉴与吉尔伽美什雪松林收在一套里，共 {n} 件。",
            "Mesopotamian myth and the cedar forest of Gilgamesh, {n} icons in one kit.",
        ),
        "cover": ("gilgamesh-cedar-forest", "gil-king"),
        "palette": pal(
            ("#E6C99A", "浅陶", "light clay"),
            ("#C46A3A", "陶土", "clay"),
            ("#1E4B7A", "青金石", "lapis"),
            ("#1F6A4A", "芦苇", "reed"),
            ("#C4922A", "金", "gold"),
            ("#7A2E2A", "赤玉", "carnelian"),
            ("#FFFFFF", "高光", "highlight"),
            ("#3A2C22", "眼墨", "eye ink"),
        ),
        "sources": [
            src("gilgamesh-cedar-forest", "gilga", "gilgamesh", "吉尔伽美什", "Gilgamesh",
                ("cedar-relic", "雪松林器物", "Cedar Forest Relics")),
            src("mesopotamia-myth", "meso", "pantheon", "两河神系", "River Pantheon",
                ("meso-relic", "两河法器", "River Relics")),
        ],
    },
    {
        "group": 6,
        "slug": "qilin-auspicious-beast",
        "new": False,
        "cap": 60,
        "generic_prefix": "rui",
        "title": L("中华瑞兽", "Auspicious Beasts"),
        "description": L(
            "麒麟、貔貅、獬豸、白泽、鲲鹏、凤凰与刘海金蟾收在一套里，共 {n} 件。",
            "Qilin, pixiu, xiezhi, baize, kunpeng, fenghuang, and Liu Hai's golden toad, {n} icons in one kit.",
        ),
        "cover": ("qilin-auspicious-beast", "qilin-front"),
        "palette": pal(
            ("#F0D48A", "淡金", "pale gold"),
            ("#C23A2E", "朱", "cinnabar"),
            ("#8E1F24", "深朱", "deep cinnabar"),
            ("#2F6B4F", "玉", "jade"),
            ("#E2B33A", "金", "gold"),
            ("#5C3D7A", "紫", "purple"),
            ("#FFFFFF", "高光", "highlight"),
            ("#3A2C22", "眼墨", "eye ink"),
        ),
        "sources": [
            src("pixiu-wealth-beast", "pixiu", "pixiu", "貔貅", "Pixiu"),
            src("xiezhi-justice-beast", "xiezhi", "xiezhi", "獬豸", "Xiezhi"),
            src("baize-spirit-compendium", "baize", "baize", "白泽", "Baize"),
            src("kunpeng-north-sea-giant", "kunpeng", "kunpeng", "鲲鹏", "Kunpeng"),
            src("phoenix-rebirth", "feng", "fenghuang", "凤凰", "Fenghuang"),
            src("liuhai-golden-toad", "liuhai", "liuhai", "刘海金蟾", "Golden Toad"),
            src("qilin-auspicious-beast", "qilin", "qilin", "麒麟", "Qilin"),
        ],
    },
    {
        "group": 7,
        "slug": "world-dragons",
        "new": True,
        "cap": 60,
        "generic_prefix": "wd",
        "title": L("世界龙族", "Dragons of the World"),
        "description": L(
            "欧亚、东南亚、非洲、美洲与大洋洲的龙和巨蛇收在一套里，共 {n} 件。",
            "Dragons and great serpents from Europe, Asia, Africa, the Americas, and Oceania, {n} icons in one kit.",
        ),
        "cover": ("zmey-gorynych-dragon", "zmey-gorynych"),
        "palette": pal(
            ("#D7E0C8", "鳞光", "scale light"),
            ("#2F6B45", "鳞绿", "scale"),
            ("#1E4030", "深鳞", "deep scale"),
            ("#D85A2A", "余烬", "ember"),
            ("#E0B15A", "金", "gold"),
            ("#3D4F6B", "风暴", "storm"),
            ("#FFFFFF", "高光", "highlight"),
            ("#3A2C22", "眼墨", "eye ink"),
        ),
        "sources": [
            src("lindworm-nordic-serpent-king", "lind", "europe", "欧洲龙", "European Dragons"),
            src("tarasque-tarascon-dragon", "tara", "europe", "欧洲龙", "European Dragons"),
            src("wawel-dragon-krakow-shoemaker", "wawel", "europe", "欧洲龙", "European Dragons"),
            src("basilisk-cockatrice-gaze", "basil", "europe", "欧洲龙", "European Dragons"),
            src("zmey-gorynych-dragon", "zmey", "slavic", "斯拉夫与波罗的", "Slavic and Baltic"),
            src("aitvaras-lithuanian-fire-sprite", "aitva", "slavic", "斯拉夫与波罗的", "Slavic and Baltic"),
            src("bakunawa-moon-eating-serpent", "baku", "se-asia", "东南亚巨蛇", "Southeast Asian Serpents"),
            src("naga-mekong-serpent", "naga", "se-asia", "东南亚巨蛇", "Southeast Asian Serpents"),
            src("grootslang-diamond-cave-serpent", "groot", "africa", "非洲巨蛇", "African Serpent"),
            src("quetzalcoatl-feathered-serpent", "quetz", "americas", "美洲羽蛇", "American Serpent"),
            src("taniwha-maori-guardian", "tani", "oceania", "大洋洲守护者", "Oceanian Guardian"),
        ],
    },
    {
        "group": 8,
        "slug": "water-spirits",
        "new": True,
        "cap": 60,
        "generic_prefix": "ws",
        "title": L("水妖精灵", "Water Spirits"),
        "description": L(
            "河、海、湖里的水妖、水马、海豹人与河童收在一套里，共 {n} 件。",
            "River, sea, and lake spirits, water-horses, selkies, and kappa, {n} icons in one kit.",
        ),
        "cover": ("mami-wata-water-spirit", "mami-wata"),
        "palette": pal(
            ("#D5EBE6", "浪沫", "foam"),
            ("#1F7A78", "青绿", "teal"),
            ("#134E55", "深潮", "deep tide"),
            ("#E07A6A", "珊瑚", "coral"),
            ("#7BA05B", "海藻", "kelp"),
            ("#1E3358", "夜海", "night sea"),
            ("#FFFFFF", "高光", "highlight"),
            ("#3A2C22", "眼墨", "eye ink"),
        ),
        "sources": [
            src("mami-wata-water-spirit", "mami", "africa", "西非水灵", "West African Waters"),
            src("vodyanoy-slavic-water-grandpa", "vody", "slavic", "斯拉夫水妖", "Slavic Waters"),
            src("rusalka-river-maiden", "rusa", "slavic", "斯拉夫水妖", "Slavic Waters"),
            src("kelpie-loch-water-horse", "kelpie", "celtic", "凯尔特水域", "Celtic Waters"),
            src("selkie-seal-folk", "selkie", "celtic", "凯尔特水域", "Celtic Waters"),
            src("lorelei-rhine-siren", "lore", "rhine", "莱茵与蛇仙", "Rhine and Melusine"),
            src("melusine-serpent-fairy", "melu", "rhine", "莱茵与蛇仙", "Rhine and Melusine"),
            src("kappa-cucumber-river", "kappa", "japan", "日本河童", "Kappa"),
            src("encantado-amazon-pink-dolphin", "encant", "americas", "美洲水域", "American Waters"),
            src("ahuizotl-lake-hound", "ahui", "americas", "美洲水域", "American Waters"),
        ],
    },
    {
        "group": 9,
        "slug": "mythic-beasts",
        "new": True,
        "cap": 60,
        "generic_prefix": "mb",
        "title": L("西方神兽", "Heraldic Beasts"),
        "description": L(
            "狮鹫、飞马、斯芬克斯、独角兽、八足马与拉玛苏等西方神兽收在一套里，共 {n} 件。",
            "Griffin, pegasus, sphinx, unicorn, Sleipnir, lamassu, and their kin, {n} icons in one kit.",
        ),
        "cover": ("griffin-scythian-gold-guard", "griffin-full"),
        "palette": pal(
            ("#F0E2C4", "大理石", "marble"),
            ("#8E1E2A", "绯红", "crimson"),
            ("#C9A227", "金", "gold"),
            ("#8A6232", "青铜", "bronze"),
            ("#1E4E8C", "蓝宝石", "sapphire"),
            ("#4A6741", "叶绿", "leaf"),
            ("#FFFFFF", "高光", "highlight"),
            ("#3A2C22", "眼墨", "eye ink"),
        ),
        "sources": [
            src("griffin-scythian-gold-guard", "grif", "hellenic", "希腊与斯基泰", "Hellenic"),
            src("pegasus-bellerophon-chimera", "pega", "hellenic", "希腊与斯基泰", "Hellenic"),
            src("sphinx-riddle-guardian", "sphinx", "hellenic", "希腊与斯基泰", "Hellenic"),
            src("peryton-atlantis-stag-bird", "pery", "medieval", "中世纪纹章", "Medieval Heraldry"),
            src("unicorn-tapestry-hunt", "uni", "medieval", "中世纪纹章", "Medieval Heraldry"),
            src("caladrius-healing-bird", "cala", "medieval", "中世纪纹章", "Medieval Heraldry"),
            src("manticore-persian-beast", "manti", "persia", "波斯", "Persia"),
            src("sleipnir-odin-eight-legged-steed", "sleip", "steed", "八足马", "Eight-Legged Steed"),
            src("lamassu-gate-guardian", "lama", "assyria", "门神拉玛苏", "Lamassu"),
        ],
    },
    {
        "group": 10,
        "slug": "cryptids",
        "new": True,
        "cap": 60,
        "generic_prefix": "uma",
        "title": L("世界秘兽", "Cryptids"),
        "description": L(
            "湖怪、雪人、毛人、莫克拉姆班贝与滴熊等秘兽收在一套里，共 {n} 件。",
            "Lake monsters, yeti, bigfoot, mokele-mbembe, drop bears, and other cryptids, {n} icons in one kit.",
        ),
        "cover": ("nessie-loch-ness-monster", "nessie"),
        "palette": pal(
            ("#C8B89A", "泥色", "mud light"),
            ("#6B5A3E", "土", "earth"),
            ("#2F4A32", "松绿", "pine"),
            ("#C47A2A", "琥珀", "amber"),
            ("#7A2E2E", "暗红", "dark red"),
            ("#3E4650", "雾灰", "fog"),
            ("#FFFFFF", "高光", "highlight"),
            ("#3A2C22", "眼墨", "eye ink"),
        ),
        "sources": [
            src("nessie-loch-ness-monster", "ness", "europe", "欧洲湖怪", "European Lake"),
            src("sasquatch-bigfoot-trail", "squatch", "north-america", "北美", "North America"),
            src("mothman-point-pleasant", "moth", "north-america", "北美", "North America"),
            src("jersey-devil-pine-barrens", "jersey", "north-america", "北美", "North America"),
            src("hodag-wisconsin-lumberjack-beast", "hodag", "north-america", "北美", "North America"),
            src("chupacabra-desert-cryptid", "chupa", "latin-america", "拉丁美洲", "Latin America"),
            src("tsuchinoko-cryptid-hunt", "tsuchi", "asia", "亚洲", "Asia"),
            src("yeti-himalaya-snowfolk", "yeti", "asia", "亚洲", "Asia"),
            src("mokele-mbembe-river-beast", "mokele", "africa", "非洲", "Africa"),
            src("drop-bear-outback", "drop", "oceania", "大洋洲", "Oceania"),
            src("bunyip-billabong-spirit", "bunyip", "oceania", "大洋洲", "Oceania"),
        ],
    },
    {
        "group": 11,
        "slug": "sacred-birds",
        "new": True,
        "cap": 48,
        "generic_prefix": "sb",
        "title": L("世界神鸟", "Sacred Birds"),
        "description": L(
            "西摩格、雷鸟、天堂鸟、阿里坎托、火鸟、迦楼罗与图鲁尔收在一套里，共 {n} 件。",
            "Simurgh, thunderbird, alkonost, alicanto, firebird, garuda, and turul, {n} icons in one kit.",
        ),
        "cover": ("firebird-tsarevich", "firebird"),
        "palette": pal(
            ("#F4E1B5", "灰金", "ash gold"),
            ("#E25B2A", "焰", "flame"),
            ("#F2C14E", "焰金", "flame gold"),
            ("#2E6B8A", "天青", "sky"),
            ("#1F6B4A", "翠", "jewel green"),
            ("#6B3A6E", "暮紫", "dusk"),
            ("#FFFFFF", "高光", "highlight"),
            ("#3A2C22", "眼墨", "eye ink"),
        ),
        "sources": [
            src("simurgh-persian-sage-bird", "simurgh", "simurgh", "西摩格", "Simurgh"),
            src("thunderbird-plains-storm", "thunder", "thunderbird", "雷鸟", "Thunderbird"),
            src("alkonost-sirin-paradise-birds", "alkonost", "alkonost", "天堂鸟", "Birds of Paradise"),
            src("alicanto-chilean-gold-bird", "alicanto", "alicanto", "阿里坎托", "Alicanto"),
            src("firebird-tsarevich", "firebird", "firebird", "火鸟", "Firebird"),
            src("garuda-amrita-quest", "garuda", "garuda", "迦楼罗", "Garuda"),
            src("turul-csodaszarvas-wonder-stag", "turul", "turul", "图鲁尔", "Turul"),
        ],
    },
    {
        "group": 12,
        "slug": "giant-heroes",
        "new": True,
        "cap": 48,
        "generic_prefix": "gh",
        "title": L("巨人英雄", "Giant Heroes"),
        "description": L(
            "伐木巨人、文化英雄与被锁住的勇士收在一套里，共 {n} 件。",
            "Lumberjack giants, culture heroes, and a chained champion, {n} icons in one kit.",
        ),
        "cover": ("paul-bunyan-blue-ox", "paul-bunyan"),
        "palette": pal(
            ("#E4C99A", "麦色", "wheat"),
            ("#3A6EA5", "牛蓝", "ox blue"),
            ("#2F4A32", "松绿", "pine"),
            ("#8C5A32", "皮革", "leather"),
            ("#5C6570", "铁", "iron"),
            ("#A33B2B", "砖红", "brick"),
            ("#FFFFFF", "高光", "highlight"),
            ("#3A2C22", "眼墨", "eye ink"),
        ),
        "sources": [
            src("paul-bunyan-blue-ox", "bunyan", "bunyan", "保罗·班扬", "Paul Bunyan"),
            src("glooscap-wabanaki-giant", "gloos", "glooscap", "格卢斯卡普", "Glooscap"),
            src("kalevipoeg-estonian-giant", "kalev", "kalevipoeg", "卡列维波埃格", "Kalevipoeg"),
            src("rubezahl-mountain-spirit", "rube", "rubezahl", "吕贝扎尔", "Rübezahl"),
            src("amirani-georgian-chained-hero", "amirani", "amirani", "阿米拉尼", "Amirani"),
        ],
    },
    {
        "group": 13,
        "slug": "greek-olympus",
        "new": False,
        "cap": 60,
        "generic_prefix": "gr",
        "title": L("希腊神话", "Greek Myth"),
        "description": L(
            "奥林匹斯神器与珀尔修斯、潘多拉、伊卡洛斯、迈达斯、蛛女、普绪克、俄耳甫斯、迷宫、皮格马利翁、木马和归航收在一套里，共 {n} 件。",
            "Olympian attributes plus the hero cycles of Perseus, Pandora, Icarus, Midas, Arachne, Psyche, Orpheus, the labyrinth, Pygmalion, the horse, and the voyage home, {n} icons in one kit.",
        ),
        "cover": ("greek-olympus", "trident"),
        "palette": pal(
            ("#F3E6D0", "大理石", "marble"),
            ("#1F6A8A", "爱琴蓝", "aegean"),
            ("#16384A", "深海", "deep sea"),
            ("#C9A24A", "金", "gold"),
            ("#C4653A", "陶土", "terracotta"),
            ("#6B2D4A", "酒红", "wine"),
            ("#FFFFFF", "高光", "highlight"),
            ("#3A2C22", "眼墨", "eye ink"),
        ),
        "sources": [
            src("perseus-medusa", "pers", "heroes", "英雄", "Heroes"),
            src("odysseus-homeward-voyage", "ody", "heroes", "英雄", "Heroes"),
            src("icarus-daedalus-wings", "icarus", "heroes", "英雄", "Heroes"),
            src("pandora-box-hope", "pandora", "fate", "命运与造物", "Fate and Making"),
            src("king-midas-golden-touch", "midas", "fate", "命运与造物", "Fate and Making"),
            src("psyche-eros-trials", "psyche", "fate", "命运与造物", "Fate and Making"),
            src("pygmalion-galatea-statue", "pyg", "fate", "命运与造物", "Fate and Making"),
            src("arachne-weaving-contest", "arachne", "labyrinth", "迷宫与冥界", "Labyrinth and Underworld"),
            src("minotaur-labyrinth", "mino", "labyrinth", "迷宫与冥界", "Labyrinth and Underworld"),
            src("orpheus-underworld", "orph", "labyrinth", "迷宫与冥界", "Labyrinth and Underworld"),
            src("trojan-horse-siege", "trojan", "troy", "特洛伊", "Troy"),
            src("greek-olympus", "oly", "olympus", "奥林匹斯", "Olympus"),
        ],
    },
    {
        "group": 14,
        "slug": "onmyoji-yokai",
        "new": False,
        "cap": 60,
        "generic_prefix": "yk",
        "title": L("日本妖怪", "Japanese Yokai"),
        "description": L(
            "阴阳师图鉴与鵺、雷兽、猫又、络新妇、雪女、天狗、座敷童子、尼彦收在一套里，共 {n} 件。",
            "The onmyoji field guide plus nue, raiju, bakeneko, jorogumo, yuki-onna, tengu, zashiki-warashi, and amabie, {n} icons in one kit.",
        ),
        "cover": ("onmyoji-yokai", "paper-shikigami"),
        "palette": pal(
            ("#E7DCC8", "骨色", "bone"),
            ("#D6453D", "朱红", "vermilion"),
            ("#1E2A4A", "靛蓝", "indigo"),
            ("#E2B34A", "金", "gold"),
            ("#2F4A3A", "松绿", "pine"),
            ("#8FB4C9", "幽灵蓝", "ghost blue"),
            ("#FFFFFF", "高光", "highlight"),
            ("#3A2C22", "眼墨", "eye ink"),
        ),
        "sources": [
            src("nue-yokai-night-thunder", "nue", "night", "夜行", "Night Parade"),
            src("bakeneko-nekomata-night", "bake", "night", "夜行", "Night Parade"),
            src("raiju-thunder-beast", "raiju", "storm", "雷", "Thunder"),
            src("tengu-mountain-crow", "tengu", "mountain", "山", "Mountain"),
            src("jorogumo-waterfall-weaver", "joro", "water", "水", "Water"),
            src("amabie-plague-prophet", "amabie", "water", "水", "Water"),
            src("yukionna-snow-woman", "yuki", "house", "家与雪", "House and Snow"),
            src("zashiki-warashi-house-spirit", "zashiki", "house", "家与雪", "House and Snow"),
            src("onmyoji-yokai", "onmyo", "bureau", "阴阳寮", "Onmyo Bureau"),
        ],
    },
    {
        "group": 15,
        "slug": "celtic-fae",
        "new": True,
        "cap": 60,
        "generic_prefix": "cf",
        "title": L("凯尔特精怪", "Celtic Fae"),
        "description": L(
            "报丧女妖、普卡、无头骑士、小矮妖、磷火、塔姆林与奥辛收在一套里，共 {n} 件。凯尔特-斯拉夫总览主题单独保留，不并入。",
            "Banshee, púca, dullahan, leprechaun, will-o'-the-wisp, Tam Lin, and Oisín, {n} icons in one kit. The celtic-slavic overview stays separate.",
        ),
        "cover": ("dullahan-headless-fairy-rider", "dullahan-rider"),
        "palette": pal(
            ("#D5E0C4", "浅苔", "pale moss"),
            ("#3E6B3A", "苔绿", "moss"),
            ("#6B4A8A", "暮紫", "twilight"),
            ("#E0B15A", "金", "gold"),
            ("#A33B4A", "浆果", "berry"),
            ("#7FA0B5", "雾蓝", "mist blue"),
            ("#FFFFFF", "高光", "highlight"),
            ("#3A2C22", "眼墨", "eye ink"),
        ),
        "sources": [
            src("banshee-keening-wail", "banshee", "banshee", "报丧女妖", "Banshee"),
            src("puca-irish-shapeshifter", "puca", "puca", "普卡", "Púca"),
            src("dullahan-headless-fairy-rider", "dulla", "dullahan", "无头骑士", "Dullahan"),
            src("leprechaun-rainbow-gold", "lepre", "leprechaun", "小矮妖", "Leprechaun"),
            src("will-o-wisp-marsh-lights", "wisp", "wisp", "磷火", "Will-o'-the-Wisp"),
            src("tam-lin-fairy-rescue", "tamlin", "tam-lin", "塔姆林", "Tam Lin"),
            src("oisin-tir-na-nog", "oisin", "oisin", "奥辛", "Oisín"),
        ],
    },
    {
        "group": 16,
        "slug": "slavic-myth",
        "new": True,
        "cap": 60,
        "generic_prefix": "sm",
        "title": L("斯拉夫神话", "Slavic Myth"),
        "description": L(
            "芭芭雅嘎、科谢伊、林妖、家神、佩伦与瓦西丽莎收在一套里，共 {n} 件。凯尔特-斯拉夫总览主题单独保留，不并入。",
            "Baba Yaga, Koschei, the leshy, the domovoi, Perun, and Vasilisa, {n} icons in one kit. The celtic-slavic overview stays separate.",
        ),
        "cover": ("baba-yaga-hut", "chicken-leg-hut"),
        "palette": pal(
            ("#E4E0D4", "桦白", "birch"),
            ("#243028", "林黑", "forest black"),
            ("#C23A2E", "余烬", "ember"),
            ("#E0B15A", "金", "gold"),
            ("#F4F1EA", "雪", "snow"),
            ("#5C2A2A", "血红", "blood"),
            ("#FFFFFF", "高光", "highlight"),
            ("#3A2C22", "眼墨", "eye ink"),
        ),
        "sources": [
            src("baba-yaga-hut", "baba", "baba-yaga", "芭芭雅嘎", "Baba Yaga"),
            src("koschei-deathless", "koschei", "koschei", "科谢伊", "Koschei"),
            src("leshy-slavic-forest-lord", "leshy", "leshy", "林妖", "Leshy"),
            src("domovoi-house-spirit", "domovoi", "domovoi", "家神", "Domovoi"),
            src("perun-veles-thunder-duel", "perun", "perun", "佩伦与韦列斯", "Perun and Veles"),
            src("vasilisa-skull-lantern", "vasilisa", "vasilisa", "瓦西丽莎", "Vasilisa"),
        ],
    },
    {
        "group": 17,
        "slug": "indian-epics",
        "new": True,
        "cap": 60,
        "generic_prefix": "ie",
        "title": L("印度史诗", "Indian Epics"),
        "description": L(
            "摩诃婆罗多、象神断牙与人狮那罗辛哈收在一套里，共 {n} 件。",
            "The Mahabharata, Ganesha's broken tusk, and Narasimha, {n} icons in one kit.",
        ),
        "cover": ("ganesha-broken-tusk", "ganesha"),
        "palette": pal(
            ("#E07A2F", "藏红", "saffron"),
            ("#C23A4A", "朱红", "kumkum"),
            ("#1F6B5A", "孔雀绿", "peacock"),
            ("#E2B33A", "金", "gold"),
            ("#2A3358", "靛蓝", "indigo"),
            ("#E7A0B4", "莲粉", "lotus"),
            ("#FFFFFF", "高光", "highlight"),
            ("#3A2C22", "眼墨", "eye ink"),
        ),
        "sources": [
            src("mahabharata-kurukshetra", "maha", "mahabharata", "摩诃婆罗多", "Mahabharata",
                ("kurukshetra", "俱卢之野", "Kurukshetra")),
            src("ganesha-broken-tusk", "ganesha", "ganesha", "象神", "Ganesha",
                ("ganesha-relic", "象神器物", "Ganesha Relics")),
            src("narasimha-twilight-pillar", "nara", "narasimha", "那罗辛哈", "Narasimha",
                ("narasimha-relic", "人狮器物", "Narasimha Relics")),
        ],
    },
]


def blob(icon):
    return f"{icon['id']} {icon['title']['en']} {icon['title']['zh']}"


def generic_key(icon):
    text = blob(icon)
    for key, cre in GENERIC:
        if cre.search(text):
            return key
    return None


def is_scenery(icon):
    return bool(SCENERY_RE.search(f"{icon['id']} {icon['title']['en']}"))


def noun_of(icon):
    words = re.findall(r"[A-Za-z][A-Za-z']+", icon["title"]["en"])
    stop = {"the", "a", "an", "of", "and", "with", "on", "in"}
    words = [w for w in words if w.lower() not in stop]
    return words[-1].lower() if words else icon["id"]


def title_key(icon):
    return re.sub(r"\s+", " ", icon["title"]["en"]).strip().casefold()


def head_of(icon):
    en = icon["title"]["en"]
    en = re.split(r"\s*[—–]\s*", en)[0]
    en = re.split(r"\s+-\s+", en)[0]
    return re.sub(r"\s+", " ", en).strip().casefold()


def sig_rank(icon):
    en = icon["title"]["en"]
    best = 9
    for rank, cre in SIG_RANKS:
        if cre.search(en):
            best = min(best, rank)
    return best


def quota(n_sources, cap):
    k = min(6, cap // n_sources)
    return max(3, k)


def load_source(slug):
    d = SRC / slug
    raw = (d / "manifest.json").read_bytes()
    manifest = json.loads(raw)
    if manifest.get("id") != slug:
        raise SystemExit(f"{slug}: manifest id is {manifest.get('id')}")
    icons = []
    for index, icon in enumerate(manifest["icons"]):
        path = d / "icons" / f"{icon['id']}.svg"
        icons.append({**icon, "_index": index, "_svg": path.read_text(), "_path": path})
    return manifest, raw, icons


def conflicts(icon, used_titles, used_heads, used_ids, used_single):
    if icon["id"] in used_ids or title_key(icon) in used_titles:
        return True
    head = head_of(icon)
    if head in used_heads:
        return True
    words = head.split()
    if any(len(word) >= 5 and word in used_single for word in words):
        return True
    if len(words) == 1 and len(words[0]) >= 5:
        for other in used_heads:
            if re.search(rf"\b{re.escape(words[0])}\b", other):
                return True
    return False


def remember(icon, used_titles, used_heads, used_ids, used_single):
    used_titles.add(title_key(icon))
    used_ids.add(icon["id"])
    head = head_of(icon)
    used_heads.add(head)
    words = head.split()
    if len(words) == 1 and len(words[0]) >= 5:
        used_single.add(words[0])


def take(pool, chosen, limit, noun_cap, used_titles, used_heads, used_ids, used_single, used_generic, nouns):
    for icon in pool:
        if len(chosen) >= limit:
            return
        g = generic_key(icon)
        if g and g in used_generic:
            continue
        if conflicts(icon, used_titles, used_heads, used_ids, used_single):
            continue
        n = noun_of(icon)
        if noun_cap and nouns.get(n, 0) >= noun_cap and icon["_index"] != 0:
            continue
        chosen.append(icon)
        nouns[n] = nouns.get(n, 0) + 1
        remember(icon, used_titles, used_heads, used_ids, used_single)
        if g:
            used_generic.add(g)


def pick_icons(icons, k, used):
    heroes, gear, rest = [], [], []
    for icon in icons:
        g = generic_key(icon)
        s = is_scenery(icon)
        if icon["_index"] < 6 and not g and not s:
            heroes.append(icon)
        elif not g and not s:
            gear.append(icon)
        else:
            rest.append(icon)
    gear.sort(key=lambda ic: (sig_rank(ic), ic["_index"]))
    rest.sort(key=lambda ic: ic["_index"])
    chosen = []
    nouns = {}
    args = (*used, nouns)
    take(heroes, chosen, min(3, k), 2, *args)
    signature_left = [ic for ic in heroes if ic not in chosen and sig_rank(ic) < 9]
    signature_left.sort(key=lambda ic: (sig_rank(ic), ic["_index"]))
    take(signature_left, chosen, k, 2, *args)
    take(gear, chosen, k, 2, *args)
    if len(chosen) < min(3, k):
        take(heroes, chosen, k, 4, *args)
    if len(chosen) < k:
        take(rest, chosen, k, 1, *args)
    if len(chosen) < 3:
        take(heroes + gear + rest, chosen, 3, None, *args)
    chosen.sort(key=lambda ic: ic["_index"])
    return chosen[:k]


def parse_hex(value):
    h = value.strip().lstrip("#")
    alpha = None
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    elif len(h) == 4:
        h = "".join(c * 2 for c in h)
        alpha = h[6:]
        h = h[:6]
    elif len(h) == 8:
        alpha = h[6:]
        h = h[:6]
    elif len(h) != 6:
        return None
    try:
        rgb = (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
    except ValueError:
        return None
    return rgb, alpha


def to_hsl(r, g, b):
    r, g, b = r / 255, g / 255, b / 255
    mx, mn = max(r, g, b), min(r, g, b)
    light = (mx + mn) / 2
    if mx == mn:
        return 0.0, 0.0, light
    d = mx - mn
    sat = d / (2 - mx - mn) if light > 0.5 else d / (mx + mn)
    if mx == r:
        hue = ((g - b) / d) % 6
    elif mx == g:
        hue = (b - r) / d + 2
    else:
        hue = (r - g) / d + 4
    return hue * 60, sat, light


def snap_factory(palette):
    parsed = []
    for row in palette:
        rgb, _ = parse_hex(row["hex"])
        parsed.append((row["hex"], to_hsl(*rgb)))
    by_hex = {row["hex"]: row["hex"] for row in palette}

    def snap(raw):
        got = parse_hex(raw)
        if not got:
            return raw
        (r, g, b), alpha = got
        canon = f"#{r:02X}{g:02X}{b:02X}"
        if canon in ("#FFFFFF",) or min(r, g, b) >= 248:
            chosen = "#FFFFFF"
        elif canon == "#3A2C22":
            chosen = "#3A2C22"
        else:
            hsl = to_hsl(r, g, b)
            if hsl[2] < 0.14 and hsl[1] < 0.18:
                chosen = "#3A2C22"
            else:
                def dist(item):
                    ph, ps, pl = item[1]
                    sh, ss, sl = hsl
                    if ss < 0.12:
                        return abs(sl - pl) * 2 + ps * 0.15
                    dh = min(abs(sh - ph), 360 - abs(sh - ph)) / 180
                    return dh * 1.6 + abs(sl - pl) * 0.9 + abs(ss - ps) * 0.25

                chosen = min(parsed, key=dist)[0]
        if chosen not in by_hex:
            raise SystemExit(f"snapped to {chosen}, not in palette")
        if alpha and alpha.upper() != "FF":
            return chosen + alpha.upper()
        return chosen

    return snap


def ensure_root_id(svg, prefix):
    if re.search(r"<svg\b[^>]*\bid=", svg):
        return svg
    return svg.replace("<svg ", f'<svg id="{prefix}root" ', 1)


def ensure_reduced_motion(svg):
    if "prefers-reduced-motion" not in svg:
        return svg
    if "transform:none" in svg:
        return svg
    return svg.replace(
        "animation:none!important",
        "animation:none!important;transform:none!important",
        1,
    )


def recolor(svg, snap):
    def attr(m):
        return f'{m.group(1)}="{snap(m.group(2))}"'

    def decl(m):
        return f"{m.group(1)}:{snap(m.group(2))}"

    return COLOR_DECL.sub(decl, COLOR_ATTR.sub(attr, svg))


def transform_svg(svg, old_theme, old_icon, new_theme, new_icon, snap):
    old_prefix = f"{old_theme}-{old_icon}-"
    new_prefix = f"{new_theme}-{new_icon}-"
    if old_prefix not in svg:
        raise ValueError(f"missing prefix {old_prefix}")
    # Single pass. The new prefix may contain the old string (norse-odin- inside
    # norse-norse-odin-); str.replace does not rescan inserted text.
    out = svg.replace(old_prefix, new_prefix)
    out = ensure_root_id(out, new_prefix)
    out = ensure_reduced_motion(out)
    out = recolor(out, snap)
    ids = re.findall(r'\bid="([^"]+)"', out)
    if len(ids) != len(set(ids)):
        raise ValueError(f"duplicate ids in {new_icon}")
    for item in ids:
        if not item.startswith(new_prefix):
            raise ValueError(f"id {item} lacks {new_prefix}")
    if "currentColor" not in out:
        raise ValueError(f"no currentColor in {new_icon}")
    for color in FORBIDDEN:
        if color.lower() in out.lower():
            raise ValueError(f"forbidden plate {color} in {new_icon}")
    return out


# Namesake icons that sit too far down a source list to win a 3-hero quota.
MUST_ICONS = {
    "perseus-medusa": ["medusa-head"],
    "minotaur-labyrinth": ["minotaur-mask"],
    "loki-salmon-net": ["first-net"],
}


def force_must(icons, chosen, must_ids, k, used):
    if not must_ids:
        return
    have = {ic["id"] for ic in chosen}
    titles, heads, ids, single, generic = used
    for mid in must_ids:
        if mid in have:
            continue
        icon = next((ic for ic in icons if ic["id"] == mid), None)
        if icon is None:
            print(f"! missing required icon {mid}", file=sys.stderr)
            continue
        if conflicts(icon, titles, heads, ids, single):
            print(f"! required icon {mid} collides with an earlier pick; left out", file=sys.stderr)
            continue
        if len(chosen) >= k:
            drop = max(chosen, key=lambda ic: ic["_index"] if ic["id"] not in must_ids else -1)
            if drop["id"] in must_ids:
                continue
            chosen.remove(drop)
        chosen.append(icon)
        remember(icon, titles, heads, ids, single)
        have.add(mid)


def category_for(source, icon):
    alt = source.get("alt")
    if alt and (icon["_index"] >= 6 or is_scenery(icon) or generic_key(icon)):
        return alt["category"]
    return source["category"]


def display_sources(group):
    sources = group["sources"]
    if group["new"]:
        return sources
    # Kept slug was placed last so it loses duplicate-title ties. Show it first.
    main = [s for s in sources if s["slug"] == group["slug"]]
    rest = [s for s in sources if s["slug"] != group["slug"]]
    return main + rest


def build_group(group, plan_only=False):
    k = quota(len(group["sources"]), group["cap"])
    snap = snap_factory(group["palette"])
    for row in group["palette"]:
        if row["hex"] in FORBIDDEN:
            raise SystemExit(f"{group['slug']} palette uses plate color {row['hex']}")
    used = (set(), set(), set(), set(), set())  # titles, heads, ids, single words, generic classes
    selected = []  # (source, icon, new_id)
    seen_ids = set()
    for source in group["sources"]:
        _manifest, _raw, icons = load_source(source["slug"])
        chosen = pick_icons(icons, k, used)
        force_must(icons, chosen, MUST_ICONS.get(source["slug"], []), k, used)
        chosen.sort(key=lambda ic: ic["_index"])
        for icon in chosen:
            gkey = generic_key(icon)
            if gkey:
                new_id = f"{group['generic_prefix']}-{gkey}"
                if icon["id"] not in (gkey, f"full-{gkey}"):
                    new_id = f"{group['generic_prefix']}-{icon['id']}"
            else:
                new_id = f"{source['short']}-{icon['id']}"
            new_id = re.sub(r"-{2,}", "-", new_id).strip("-")
            if new_id in seen_ids:
                new_id = f"{source['short']}-{icon['id']}"
            if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", new_id):
                raise SystemExit(f"bad icon id {new_id}")
            if new_id in seen_ids:
                raise SystemExit(f"duplicate icon id {new_id}")
            seen_ids.add(new_id)
            selected.append((source, icon, new_id))
        if len(chosen) < 3:
            print(f"! {group['slug']} / {source['slug']}: only {len(chosen)} icons", file=sys.stderr)

    if len(selected) > group["cap"]:
        raise SystemExit(f"{group['slug']} selected {len(selected)} > cap {group['cap']}")

    # Guarantee a secondary category is used when one was declared.
    by_source = {}
    for source, icon, new_id in selected:
        by_source.setdefault(source["slug"], []).append((source, icon, new_id))
    cat_override = {}
    for source in group["sources"]:
        alt = source.get("alt")
        rows = by_source.get(source["slug"], [])
        if not alt or not rows:
            continue
        cats = {category_for(source, icon) for _s, icon, _n in rows}
        if alt["category"] in cats and source["category"] in cats:
            continue
        if len(rows) < 4:
            continue
        for triple in rows[-2:]:
            cat_override[id(triple[1])] = alt["category"]

    order = {s["slug"]: i for i, s in enumerate(display_sources(group))}
    selected.sort(key=lambda row: (order[row[0]["slug"]], row[1]["_index"]))

    labels = {}
    for source in group["sources"]:
        labels[source["category"]] = source["label"]
        if source.get("alt"):
            labels[source["alt"]["category"]] = source["alt"]["label"]

    icons_out = []
    files = {}
    for source, icon, new_id in selected:
        cat = cat_override.get(id(icon), category_for(source, icon))
        try:
            svg = transform_svg(icon["_svg"], source["slug"], icon["id"], group["slug"], new_id, snap)
        except ValueError as exc:
            raise SystemExit(f"{group['slug']} {source['slug']}/{icon['id']}: {exc}") from exc
        files[new_id] = svg
        entry = {
            "id": new_id,
            "title": icon["title"],
            "description": icon["description"],
            "animation": icon["animation"],
            "category": cat,
        }
        if icon.get("tags"):
            entry["tags"] = icon["tags"]
        icons_out.append(entry)

    used_cats = []
    for icon in icons_out:
        if icon["category"] not in used_cats:
            used_cats.append(icon["category"])
    categories = {key: labels[key] for key in used_cats}

    cover_src, cover_old = group["cover"]
    cover = None
    for source, icon, new_id in selected:
        if source["slug"] == cover_src and icon["id"] == cover_old:
            cover = new_id
            break
    if cover is None:
        for _source, icon, new_id in selected:
            if icon["id"] == cover_old:
                cover = new_id
                break
    if cover is None:
        cover = icons_out[0]["id"]

    n = len(icons_out)
    manifest = {
        "id": group["slug"],
        "title": group["title"],
        "description": {
            "zh": group["description"]["zh"].format(n=n),
            "en": group["description"]["en"].format(n=n),
        },
        "cover": cover,
        "categories": categories,
        "icons": icons_out,
    }

    per_source = {}
    for source, _icon, _new in selected:
        per_source[source["slug"]] = per_source.get(source["slug"], 0) + 1

    if plan_only:
        print(f"\n== {group['group']} {group['slug']}  k={k}  n={n}  cap={group['cap']}")
        for source in display_sources(group):
            rows = [(ic, nid) for s, ic, nid in selected if s["slug"] == source["slug"]]
            print(f"  {source['slug']} ({len(rows)})")
            for ic, nid in rows:
                cat = cat_override.get(id(ic), category_for(source, ic))
                print(f"    {nid:40} {cat:16} {ic['title']['zh']} | {ic['title']['en']}")
        return {"slug": group["slug"], "count": n, "per_source": per_source}

    dest = OUT / group["slug"]
    icon_dir = dest / "icons"
    if icon_dir.exists():
        for old in icon_dir.glob("*.svg"):
            old.unlink()
    icon_dir.mkdir(parents=True, exist_ok=True)
    for new_id, svg in files.items():
        (icon_dir / f"{new_id}.svg").write_text(svg)
    (dest / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")

    if group["new"]:
        base_hash = "none"
    else:
        raw = (SRC / group["slug"] / "manifest.json").read_bytes()
        base_hash = hashlib.sha256(raw).hexdigest()
    (dest / "base_hash.txt").write_text(base_hash + "\n")

    palette_rows = "\n".join(
        f"| {row['zh']} | {row['en']} | `{row['hex']}` |" for row in group["palette"]
    )
    absorbed = [s["slug"] for s in group["sources"] if s["slug"] != group["slug"] or group["new"]]
    readme = f"""# {group['title']['zh']}（`{group['slug']}`）

第 {group['group']} 组。共 {n} 件。描边保持 `currentColor`，填色收进下面这一套调色板。

## 调色板

| 角色 | Role | 色值 |
| --- | --- | --- |
{palette_rows}

眼睛与近黑中性色收成 `#3A2C22`，近白高光收成 `#FFFFFF`。其余填色按色相和明度就近贴到表内色，阴影的透明度不动。

## 来源

{chr(10).join(f'- `{slug}`：{count} 件' for slug, count in per_source.items())}

被并入、需要 301 的 slug：{', '.join(f'`{s}`' for s in absorbed) or '（无）'}。

旧目录 `themes/<旧 slug>/` 发布时保留，不删除。`base_hash.txt` 是开工时主 slug 线上 manifest 的 sha256；新建主题为 `none`。
"""
    (dest / "README.md").write_text(readme)
    return {
        "group": group["group"],
        "slug": group["slug"],
        "new": group["new"],
        "base_hash": base_hash,
        "count": n,
        "cap": group["cap"],
        "absorbed": absorbed,
        "per_source": per_source,
        "package": f"merges/{group['slug']}",
    }


def main():
    plan_only = "--plan" in sys.argv
    if not SRC.is_dir():
        raise SystemExit(f"missing source snapshot {SRC}")
    protected = {"celtic-slavic", "european-myth", "african", "americas", "eastern-myth"}
    seen = []
    for group in GROUPS:
        for source in group["sources"]:
            if source["slug"] in protected:
                raise SystemExit(f"refusing to absorb {source['slug']}")
            seen.append(source["slug"])
    dup = {s for s in seen if seen.count(s) > 1}
    if dup:
        raise SystemExit(f"slug used in two groups: {dup}")
    summaries = [build_group(group, plan_only=plan_only) for group in GROUPS]
    if plan_only:
        print("\nTOTAL", sum(s["count"] for s in summaries))
        return
    catalog = {"groups": summaries}
    (OUT / "catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n")
    print(f"wrote {len(summaries)} packages, {sum(s['count'] for s in summaries)} icons")


if __name__ == "__main__":
    main()
