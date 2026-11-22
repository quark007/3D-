# 04 · CodeArts 移交说明（2026-11-22 21:30）

CodeArts 额度用尽，工作停在这里。本文说明**已保存了什么、断在哪一行、换账号后怎么接着做**。
前四份文档（`00`～`03`）描述的是 11-20 的打包快照，**已过时**，接手以本文 + 仓库实际文件为准。

---

## 一、一句话结论

代码与资产全部已入库；**断点在王贵面部形态修正，属于"脚本改了、模型没重建"的半成品状态**。

| 项 | 值 |
|---|---|
| 中断时间 | 2026-11-22 21:17（最后一次写入） |
| 中断位置 | `changzheng/tools/build_wang_gui.py` → `morph_deltas()`，第 186–229 行 |
| 最后一次成功构建 | 20:58，产出 `changzheng/assets/characters/wang-gui/wang-gui-v1.glb`（10.8 MB，sha256 `636ed637…`） |
| 脚本当前版本 | 21:17，sha256 `101df542…` —— **比模型新，改动尚未生效** |
| 截图证据 | 21:00 的 `_shots/wang-gui-final-*.png`，对应 20:58 那版模型，**不含 21:17 的改动** |

也就是说：**先别拿现有截图当"最新效果"**，要重新跑一遍脚本才有对照。

---

## 二、本次保存了什么

### 2.1 生成脚本（原先只在 GitCode 那份仓库里，GitHub 上没有）

| 路径 | 作用 |
|---|---|
| `changzheng/tools/build_he_wen.py` | 61 KB，何文模型全流程生成（贴图增强 + 网格 + 骨骼 + 12 组形态） |
| `changzheng/tools/build_wang_gui.py` | 28 KB，王贵模型生成；**断点在这个文件** |
| `changzheng/tools/optimize_he_wen_glb.py` | 何文 GLB 压缩（Draco / 贴图降采样），产出 `he-wen-web.glb` |
| `changzheng/tools/verify_he_wen.cjs` | 何文浏览器验收（面数/骨骼/形态/截图） |
| `changzheng/tools/verify_he_wen_webgpu.cjs` | 何文 WebGPU 后端专项 |
| `changzheng/tools/verify_march_world_3d.cjs` | 3D 行走场景整体验收 |

脚本用 `ROOT = Path(__file__).resolve().parents[1]` 定位工程根，**必须保持在 `changzheng/tools/` 这一层**，放进子目录会算错根路径。

### 2.2 资产与页面

| 路径 | 说明 |
|---|---|
| `changzheng/assets/characters/wang-gui/wang-gui-v1.glb` | 10.8 MB 未压缩版，形态 12 组；预览页加载的是它 |
| `changzheng/assets/characters/wang-gui/wang-gui-v1.json` | 构建元数据（32 骨骼 / 5 段动画 / 12 形态） |
| `changzheng/assets/characters/wang-gui/wang-gui-web.glb` | 1.9 MB 压缩版，游戏内 `actors3d.js` 用这个 |
| `changzheng/assets/characters/he-wen/studio_small_09_1k.hdr` | 预览页用的 HDRI，**缺了它页面会报错** |
| `changzheng/march-world/wang-gui-preview.html` | 王贵验收页（4 视角 / 6 滑杆 / 口型下拉 / 素模） |
| `changzheng/march-world/engine/wang-gui-preview.js` | 预览逻辑，双后端 + 性能计数 |
| `evidence/wang-gui-final-1122/` | 16 张验收截图（21:00 拍） |

### 2.3 未合并的渲染实验

`changzheng/experiments/render-upgrade/engine/` 下放着 16:26 那版"真人级渲染"尝试：预积分皮肤 `skinMaterial.js`、三层眼球 `eyeMaterial.js`、各向异性毛发 `hairMaterial.js`、布料 `wardrobeMaterial.js`，以及 `skin-preintegrated.js`、`temporalPass.js`（TAA）、`grade.js`。

**故意挪出运行目录**：它基于旧版 `character-preview.js` 写的，直接覆盖会和现在的 Draco + 王贵加载逻辑冲突。要用就当成"参数与着色器参考"移植，不要整体覆盖。

---

## 三、断点细节（接手先读这段）

`build_wang_gui.py` 的 `morph_deltas()` 负责生成 12 组形态目标。21:17 那次改动针对两个具体问题：

### 3.1 闭眼时眼球穿出眼皮

当前实现（第 202–208 行）：

```python
eye_white = (uv[:, 0] >= .66) & (uv[:, 1] > .88)
for side, label in [(1, 'Left'), (-1, 'Right')]:
    eye = np.clip(gaussian(x, side * 0.032, 0.024) * gaussian(y, 1.666, 0.017) * front * 1.8, 0, 1)
    blink = np.zeros_like(base)
    blink[:, 1] = (1.666 - y) * eye                                  # 向 y=1.666 平面压平
    blink[:, 2] = np.where(eye_white, -0.018 * eye, 0.004 * eye)     # 眼白后移 18mm，眼睑皮肤前移 4mm
    deltas[f'eyeBlink{label}'] = blink
```

思路是对的：眼白后缩、眼睑前顶。**但两个缺陷还在**：

1. `blink[:, 1]` 把上下眼睑**同时收拢到同一个平面 y=1.666**，两者完全共面 → 闭合瞬间 Z-fighting，侧面看是"一条缝在抖"。
   建议：上睑目标到 `1.666 - 0.004`、下睑到 `1.666 + 0.003`，留 7 mm 错位；或用 `smoothstep` 按 `y` 分侧给不同目标。
2. `eye_white` 用的是 UV 区间硬判定（`u>=.66`），眼白与眼睑皮肤交界处会出现一圈**硬边台阶**，前移量从 +4 mm 突变到 −18 mm。
   建议：把硬掩膜换成按 UV 距离的 `smoothstep` 过渡（宽度约 0.01 UV）。

### 3.2 张嘴时上唇跟着动

当前实现（第 188–195 行）：

```python
jaw = np.zeros_like(base)
lower_lip = np.where(y < 1.6005, 1.0, 0.0)        # 硬阈值
jaw_weight = np.maximum(mouth, lip_line.astype(np.float64))
jaw[:, 1] = -0.042 * jaw_weight * lower_lip
jaw[:, 2] = 0.003 * jaw_weight * lower_lip
```

`lower_lip` 是**二值掩膜**，在 `y = 1.6005` 处一刀切：边界顶点位移从 0 直接跳到 −42 mm，模型上会出现一道折痕；而且上唇靠近唇线的顶点若落在阈值下方，也会被误带动。

建议：`lower_lip = 1 / (1 + exp((y - 1.6005) / 0.0015))`（1.5 mm 过渡带），或直接对 `jaw_weight` 乘 `smoothstep(1.6005, 1.6045, y)` 再补一个上唇反向微抬。

### 3.3 重建与复验

改完跑：

```bash
cd changzheng
python tools/build_wang_gui.py            # 重建 wang-gui-v1.glb + json
python tools/build_wang_gui.py --inspect  # 只看源模型结构，不写文件
```

脚本依赖：Python 3.13、`numpy`、`Pillow`（本机已装 numpy 2.2.6 / Pillow 13.0.0）。
源模型是 `assets/models-v03/char_soldier.glb`（2.5 MB，仓库内已有），不依赖 Blender。

跑完刷新 `wang-gui-preview.html`，拖「闭眼」「开口」两个滑杆到 1.0，看是否还有穿插与折痕。

---

## 四、换账号接手（5 步）

```bash
# 1. 拿最新代码（仓库 380MB+，首次 clone 慢）
git clone https://github.com/quark007/3D-.git
cd 3D-

# 2. 起服务（零依赖，root 固定指向 changzheng/）
node serve.cjs 8080

# 3. 看现场
#    3D 行走： http://localhost:8080/march-world/preview.html?3d=1
#    王贵验收：http://localhost:8080/march-world/wang-gui-preview.html
#    何文验收：http://localhost:8080/march-world/character-preview.html
```

4. 按第三节改 `changzheng/tools/build_wang_gui.py`，重建模型。
5. 验收截图存到 `evidence/`，并把本文第三节对应条目勾掉。

**push 前必读**：仓库历史被重写过一次（SHA 全变、作者改成 quark007）。如果你本地有旧 clone，先 `git fetch origin && git reset --hard origin/main`，别直接 push 覆盖。

---

## 五、已知坑（都是踩过的）

| 坑 | 说明 |
|---|---|
| 资源是绝对路径 | 页面里写的是 `/assets/...`，**站点根必须是 `changzheng/`**，从别的目录起服务会全 404 |
| 开场 6.4 秒内读不到相机 | `follow()` 还没跑，脚本要等 `CZMarchWorld` 就绪再取值，否则拿到 `undefined` |
| 锚点 id 带前缀 | 清单里是 `chapter-3/anchor-dialogue-03-03-he_wen`，用后缀匹配才稳 |
| 预览页缺 HDR 会报错 | `wang-gui-preview.js` 要 `/assets/characters/he-wen/studio_small_09_1k.hdr` |
| 两个王贵模型别搞混 | `wang-gui-v1.glb`（10.8 MB，预览页）≠ `wang-gui-web.glb`（1.9 MB，游戏内） |
| 验证脚本写死 Chrome 路径 | `verify_he_wen.cjs` 走 `C:/Program Files/Google/Chrome/...`；本机只有 Edge 时改 `executablePath`，或设 `PUPPETEER_PATH` |

---

## 六、还没做的（按优先级）

1. **王贵闭眼/张嘴穿插**（本文第三节，P0，脚本已改一半）
2. **王贵脸部比例**：鼻梁偏窄、眼窝偏平、帽子像贴上去的（16 张截图可对照）
3. **10 个 NPC 独立模型**：目前只有何文、王贵两个；其余仍是 `anchors.js` 里 4 套模型换色
4. **何文渲染升级移植**：`experiments/render-upgrade` 的皮肤/眼球/毛发着色器还没接到新预览页
5. **手机端性能**：王贵 10.8 MB 未压缩版只在预览页用，进游戏必须走 web 版；同屏多 NPC 未测
