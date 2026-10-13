# SVG Kits 主题合并报告

17 组全部在本地打好包，静态校验和浏览器校验都通过。没有发布到生产，也没有使用管理口令。`celtic-slavic` 仍是独立总览，没有并进第 15、16 组；`european-myth`、`african`、`americas`、`eastern-myth` 也没动。

包在 `merges/<slug>/`（`manifest.json`、`icons/*.svg`、48px 的 `all.png`、调色板 README、`base_hash.txt`）。旧 slug 的 301 在 `public/_redirects`，共 105 条，放在 `/* /index.html 200` 之前。发布步骤见 `merges/PUBLISH.md` 和 `scripts/publish-svg-kit-merges.mjs`。

方案里的线上基准是 368 套。发布脚本演练时重新拉了 CDN `index.json`（带缓存绕过参数），当时是 373 套：按组去掉 105 个被并入的 id、加上 9 个新 slug 之后剩 277 套。多出的 5 套不在这 17 组里，脚本不会动。旧的 `themes/<旧 slug>/` 目录按方案保留，脚本不会删除。

校验环境：Chrome 154.0.8037.92。每一组都是 `validate-static` 退出码 0，`validate-browser` 通过，控制台错误 0，外部请求 0。表里的边距是该组 8 个动画相位里测到的最小值（viewBox 单位，门槛 3）。

| 组 | 最终 slug | 件数 | 并入 slug | 校验 |
| --- | --- | --- | --- | --- |
| 1 鹿角兔 | `wolpertinger-bavarian-cryptid` | 12 | `jackalope-prairie-cryptid` | 通过。静态最大 4960 B / 52 元素；浏览器最小边距 4.25（`jack-cowboy-hat`） |
| 2 狐仙 | `kitsune-nine-tailed-fox` | 18 | `kitsune-sunshine-rain-wedding`、`kumiho-fox-bead` | 通过。静态最大 7882 B / 89 元素；浏览器最小边距 3.25（`kitsu-suzu`） |
| 3 埃及神话 | `egyptian` | 24 | `anubis-weighing-heart`、`ra-solar-barque`、`bastet-cat-goddess` | 通过。静态最大 8280 B / 107 元素；浏览器最小边距 3（`anubis-scarab`） |
| 4 北欧神话 | `norse` | 30 | `thor-mjolnir-bride-disguise`、`loki-salmon-net`、`ratatoskr-yggdrasil-gossip`、`sigurd-fafnir-ring` | 通过。静态最大 3821 B / 47 元素；浏览器最小边距 3.5（`thor-goat-chariot`） |
| 5 美索不达米亚 | `mesopotamia-myth` | 12 | `gilgamesh-cedar-forest` | 通过。静态最大 3353 B / 37 元素；浏览器最小边距 3.5（`gilga-gil-king`） |
| 6 中华瑞兽 | `qilin-auspicious-beast` | 42 | `pixiu-wealth-beast`、`xiezhi-justice-beast`、`baize-spirit-compendium`、`kunpeng-north-sea-giant`、`phoenix-rebirth`、`liuhai-golden-toad` | 通过。静态最大 6523 B / 59 元素；浏览器最小边距 3（`liuhai-fishing-line`） |
| 7 世界龙族 | `world-dragons`（新建） | 55 | `lindworm-nordic-serpent-king`、`zmey-gorynych-dragon`、`tarasque-tarascon-dragon`、`bakunawa-moon-eating-serpent`、`naga-mekong-serpent`、`grootslang-diamond-cave-serpent`、`quetzalcoatl-feathered-serpent`、`wawel-dragon-krakow-shoemaker`、`aitvaras-lithuanian-fire-sprite`、`basilisk-cockatrice-gaze`、`taniwha-maori-guardian` | 通过。静态最大 9891 B / 94 元素；浏览器最小边距 3.75（`lind-lindworm-head`） |
| 8 水妖精灵 | `water-spirits`（新建） | 60 | `mami-wata-water-spirit`、`vodyanoy-slavic-water-grandpa`、`rusalka-river-maiden`、`kelpie-loch-water-horse`、`lorelei-rhine-siren`、`selkie-seal-folk`、`kappa-cucumber-river`、`melusine-serpent-fairy`、`encantado-amazon-pink-dolphin`、`ahuizotl-lake-hound` | 通过。静态最大 7526 B / 63 元素；浏览器最小边距 4.5（`kappa-cucumber`） |
| 9 西方神兽 | `mythic-beasts`（新建） | 54 | `griffin-scythian-gold-guard`、`pegasus-bellerophon-chimera`、`peryton-atlantis-stag-bird`、`sphinx-riddle-guardian`、`manticore-persian-beast`、`unicorn-tapestry-hunt`、`caladrius-healing-bird`、`sleipnir-odin-eight-legged-steed`、`lamassu-gate-guardian` | 通过。静态最大 5568 B / 68 元素；浏览器最小边距 3.25（`manti-persian-helmet`） |
| 10 世界秘兽 | `cryptids`（新建） | 55 | `nessie-loch-ness-monster`、`sasquatch-bigfoot-trail`、`mothman-point-pleasant`、`jersey-devil-pine-barrens`、`chupacabra-desert-cryptid`、`hodag-wisconsin-lumberjack-beast`、`tsuchinoko-cryptid-hunt`、`mokele-mbembe-river-beast`、`yeti-himalaya-snowfolk`、`drop-bear-outback`、`bunyip-billabong-spirit` | 通过。静态最大 4854 B / 59 元素；浏览器最小边距 3（`drop-drop-bear`） |
| 11 世界神鸟 | `sacred-birds`（新建） | 42 | `simurgh-persian-sage-bird`、`thunderbird-plains-storm`、`alkonost-sirin-paradise-birds`、`alicanto-chilean-gold-bird`、`firebird-tsarevich`、`garuda-amrita-quest`、`turul-csodaszarvas-wonder-stag` | 通过。静态最大 7728 B / 90 元素；浏览器最小边距 3.25（`garuda-garuda-hatch`） |
| 12 巨人英雄 | `giant-heroes`（新建） | 30 | `paul-bunyan-blue-ox`、`glooscap-wabanaki-giant`、`kalevipoeg-estonian-giant`、`rubezahl-mountain-spirit`、`amirani-georgian-chained-hero` | 通过。静态最大 3881 B / 45 元素；浏览器最小边距 3（`bunyan-babe-blue-ox`） |
| 13 希腊神话 | `greek-olympus` | 60 | `perseus-medusa`、`pandora-box-hope`、`icarus-daedalus-wings`、`king-midas-golden-touch`、`arachne-weaving-contest`、`psyche-eros-trials`、`orpheus-underworld`、`minotaur-labyrinth`、`pygmalion-galatea-statue`、`trojan-horse-siege`、`odysseus-homeward-voyage` | 通过。静态最大 5185 B / 63 元素；浏览器最小边距 3.25（`icarus-wax-wings`） |
| 14 日本妖怪 | `onmyoji-yokai` | 54 | `nue-yokai-night-thunder`、`raiju-thunder-beast`、`bakeneko-nekomata-night`、`jorogumo-waterfall-weaver`、`yukionna-snow-woman`、`tengu-mountain-crow`、`zashiki-warashi-house-spirit`、`amabie-plague-prophet` | 通过。静态最大 5038 B / 54 元素；浏览器最小边距 3（`raiju-raiju-weasel`） |
| 15 凯尔特精怪 | `celtic-fae`（新建） | 42 | `banshee-keening-wail`、`puca-irish-shapeshifter`、`dullahan-headless-fairy-rider`、`leprechaun-rainbow-gold`、`will-o-wisp-marsh-lights`、`tam-lin-fairy-rescue`、`oisin-tir-na-nog` | 通过。静态最大 5337 B / 63 元素；浏览器最小边距 3（`dulla-black-steed`） |
| 16 斯拉夫神话 | `slavic-myth`（新建） | 36 | `baba-yaga-hut`、`koschei-deathless`、`leshy-slavic-forest-lord`、`domovoi-house-spirit`、`perun-veles-thunder-duel`、`vasilisa-skull-lantern` | 通过。静态最大 5536 B / 70 元素；浏览器最小边距 3.5（`domovoi-domovoi`） |
| 17 印度史诗 | `indian-epics`（新建） | 18 | `mahabharata-kurukshetra`、`ganesha-broken-tusk`、`narasimha-twilight-pillar` | 通过。静态最大 4777 B / 58 元素；浏览器最小边距 4.25（`maha-mb-gandiva`） |

合计 644 件。每组从各原主题取 5 或 6 件（上限不允许 6 时取 5）：主角和标志器物优先，月亮、灯笼、宝箱、篝火、迷雾每组最多留一份。图标 id 带原主题短名前缀，CSS class 和 `@keyframes` 已换成 `<新主题>-<新图标>-`。填色收进各组 README 里的 8 色板，描边仍是 `currentColor`。
