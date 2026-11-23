你在接手一个进行中的 3D 人物建模工程。上一轮因额度中断，现在只做一件事：修复王贵模型「闭眼」与「张嘴」两处形变瑕疵。不要重新摸底、不要重构、不要换技术路线。

## 一、工作目录

- 工作区根：`E:\新建文件夹\_gh_3D`（git 仓库，origin = https://github.com/quark007/3D-.git，当前 HEAD = b9cacf1）
- 站点根：`E:\新建文件夹\_gh_3D\changzheng`
- **不要**用 `E:\新建文件夹\changzheng`：那是另一个仓库（GitCode `Cz-xh`），3D 部分是旧的，只有生成脚本较新，已全部同步到上面这个目录。

## 二、开工前先读这四份

1. `06_防超限作业规范.md` —— **先读这份**：禁止附图、截图规格、会话切片，不遵守会跑到一半被平台拒掉
2. `04_CodeArts移交.md` —— 第三节写断点位置，第七节就是本次任务
3. `changzheng/tools/README-codearts.md` —— 脚本清单与环境
4. `changzheng/tools/build_wang_gui.py` 的 `morph_deltas()`（第 186–229 行）

## 三、当前状态（一句话）

脚本在 2026-11-22 21:17 改到一半，**模型没重建**：`changzheng/assets/characters/wang-gui/wang-gui-v1.glb` 仍是 20:58 那版；`evidence/wang-gui-final-1122/` 里的 16 张截图也是那一版，不代表当前脚本的效果。

## 四、任务：只改 `morph_deltas()` 里的两处

### 1. 闭眼时上下眼睑共面穿插

现状（第 202–208 行）：

```python
eye_white = (uv[:, 0] >= .66) & (uv[:, 1] > .88)
for side, label in [(1, 'Left'), (-1, 'Right')]:
    eye = np.clip(gaussian(x, side * 0.032, 0.024) * gaussian(y, 1.666, 0.017) * front * 1.8, 0, 1)
    blink = np.zeros_like(base)
    blink[:, 1] = (1.666 - y) * eye
    blink[:, 2] = np.where(eye_white, -0.018 * eye, 0.004 * eye)
    deltas[f'eyeBlink{label}'] = blink
```

问题：`blink[:, 1]` 把上下眼睑同时收到 `y = 1.666` 同一平面，闭合瞬间两者共面 → Z-fighting，侧面看是一条缝在抖；`eye_white` 用 UV 硬阈值（`u >= .66`），眼白与眼睑交界处的位移从 −18mm 直接跳到 +4mm，出现一圈硬边台阶。

改法：
- 按 `y` 分侧给不同目标：上睑（`y > 1.666`）收到 `1.662`，下睑收到 `1.669`，留约 7mm 错位；权重用 `w = np.clip(np.abs(y - 1.666) / 0.006, 0, 1)` 之类做平滑，避免在分界处跳变。
- 把 `eye_white` 的二值掩膜换成按 UV 距离的 smoothstep（过渡宽度约 0.01 UV），让 −18mm → +4mm 连续过渡。

### 2. 张嘴带动上唇、唇线出现折痕

现状（第 192–195 行）：

```python
lower_lip = np.where(y < 1.6005, 1.0, 0.0)
jaw_weight = np.maximum(mouth, lip_line.astype(np.float64))
jaw[:, 1] = -0.042 * jaw_weight * lower_lip
jaw[:, 2] = 0.003 * jaw_weight * lower_lip
```

问题：`lower_lip` 是二值阈值，在 `y = 1.6005` 处位移从 0 直接跳到 −42mm，形成一道折痕；靠近唇线的上唇顶点落在阈值下方时也会被误带动。

改法：
- 换成 1.5mm 过渡带：`lower_lip = 1 / (1 + np.exp((y - 1.6005) / 0.0015))`，或等价的 `smoothstep(1.6005, 1.6045, y)`。
- 再给上唇一个反向微抬（约 +2mm，权重 `smoothstep(1.6045, 1.6085, y)`），抵消被联动的那部分。

## 五、硬约束

- **形态名称一个都不能改**：`jawOpen / smile / eyeBlinkLeft / eyeBlinkRight / browDownLeft / browDownRight / visemeA / visemeI / visemeU / visemeO / visemeE / visemeM`，共 12 个。预览页和 `actors3d.js` 都按名字取。
- 脚本必须留在 `changzheng/tools/` 这一层（脚本用 `Path(__file__).resolve().parents[1]` 定位工程根，挪进子目录会算错路径）。
- 站点根只能是 `changzheng`，页面里资源写的是 `/assets/...` 绝对路径。
- **不要动** `march-world/engine/renderer3d.js`（相机遮挡刚修好并验证过）、`actors3d.js` 的加载逻辑、`scenes/` 下任何文件。
- `changzheng/experiments/render-upgrade/` 是未合并的着色器实验，只作参考，不要整体覆盖到运行目录。
- 不要 `git push --force`；远端 main 被重写过，推送前先 `git pull --rebase`。如果新账号没有 GitHub 凭据，只在本地 commit，不要改 remote。

## 六、跑起来与验收

```bash
cd E:\新建文件夹\_gh_3D
python changzheng\tools\build_wang_gui.py      # 重建，覆盖 wang-gui-v1.glb 与 wang-gui-v1.json
node serve.cjs 8082                             # 8080 / 8081 已被占用，用 8082
```

打开 `http://localhost:8082/march-world/wang-gui-preview.html`，逐条验：

1. 「闭眼」拉到 1.0：正面看不到眼白露出；**转到侧面 90° 不能看到上下眼睑共面闪烁或穿插**。
2. 「开口」拉到 1.0：上唇基本不动、下唇下移；**唇线处不能有硬折痕**。
3. 再各拉一次「微笑」「皱眉」，确认没被这次改动带坏。
4. 口型下拉 A / I / U / O / E / M 逐个切，确认 viseme 仍生效。
5. 正面 / 四分之三 / 侧面 / 全身各截一张，命名 `wang-gui-final-*-v2.png`，存进 `evidence/wang-gui-final-1122/`，与现有 16 张对照。

## 七、交付要求

- 每处改动给 `文件:行号`，不要只写「已优化」。
- 重建后贴出新的 `wang-gui-v1.json`（`sha256` 会变，这是预期的）。
- 截图落盘，并用一句话说明改动前后的差异。
- commit message 用：`fix(wang-gui): 闭眼分层与唇线过渡，修正眼睑穿插与上唇联动`

## 八、环境

- Python 3.13.14，已装 numpy 2.2.6、Pillow 13.0.0
- 源模型 `changzheng/assets/models-v03/char_soldier.glb`（2.5MB）已在仓库里，不依赖 Blender
- 浏览器验证要 puppeteer-core：`PUPPETEER_PATH=E:/新建文件夹/_browser/node_modules/puppeteer-core`；`verify_he_wen.cjs` 里写死了 Chrome 路径，本机只有 Edge 时要改成 `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`

## 九、开工

先回一句执行计划（改哪几行、怎么验），然后直接开做，不要中途停下来问细节；缺资源就用占位，最后在报告里说明。
