# CodeArts 生成脚本（人物建模管线）

这一层的脚本由 CodeArts 编写，用**纯 Python 直接改写 GLB**（不依赖 Blender）。改完跑一遍就能重建模型，不需要美术软件。

| 脚本 | 输入 | 输出 | 跑法 |
|---|---|---|---|
| `build_he_wen.py` | —（程序化建模 + 贴图增强） | `assets/characters/he-wen/he-wen-study-v1.glb` 及全套 PBR 贴图 | `python tools/build_he_wen.py` |
| `optimize_he_wen_glb.py` | `he-wen-study-v1.glb` | `he-wen-web.glb`（Draco + 1k 贴图） | `python tools/optimize_he_wen_glb.py` |
| `build_wang_gui.py` | `assets/models-v03/char_soldier.glb` | `assets/characters/wang-gui/wang-gui-v1.glb` + `.json` | `python tools/build_wang_gui.py` |
| `verify_he_wen.cjs` | 本地服务 | 控制台读数 + `_shots/` 截图 | `node tools/verify_he_wen.cjs` |
| `verify_he_wen_webgpu.cjs` | 同上 | WebGPU 后端专项 | `node tools/verify_he_wen_webgpu.cjs` |
| `verify_march_world_3d.cjs` | 同上 | 3D 场景整体验收 | `node tools/verify_march_world_3d.cjs` |

## 环境

- Python 3.13 + `numpy` + `Pillow`
- 验证脚本需要 `puppeteer-core`，路径通过 `PUPPETEER_PATH` 环境变量指定；默认回退到 `../../_browser/node_modules/puppeteer-core`
- 所有脚本用 `ROOT = Path(__file__).resolve().parents[1]` 定位工程根 → **文件必须留在 `changzheng/tools/` 这一层**

## 当前状态

`build_wang_gui.py` 在 2026-11-22 21:17 改到一半（闭眼穿插 / 张嘴带动上唇），模型尚未重建。
细节与建议改法见仓库根目录 **`04_CodeArts移交.md` 第三节**。
