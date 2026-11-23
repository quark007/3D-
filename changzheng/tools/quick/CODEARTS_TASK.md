# CodeArts 任务说明：长征星火 3D（2026-11-22 晚）

> 这份说明由 Quick 写，放在分支 `feat/quick-zunyi-life` 的 `tools/quick/CODEARTS_TASK.md`。
> 仓库：https://github.com/quark007/3D- ・ 坐标、单位、术语与 `00_先读我.md` 一致（逻辑坐标 x 向东、y 向南，1 单位≈1 米）。
> **做完每个任务都要回传：提交哈希 + 下文「验收」里要求的截图 / JSON。没有在浏览器里实际看过的，请明确写「未实测」。**

## 背景：现在仓库是什么状态
| 分支 | 状态 |
|---|---|
| `main`（`f537df4`） | 已合入你的 P0 相机修复、王贵/何文独立人物、遵义 1:1 街景、WASD 控制 |
| `feat/quick-zunyi-life` | Quick 的改动，基于 `main@f537df4`，**未经浏览器测试**，见该分支的 PR 描述 |
| `3D人物优化` | 停在 `9d65bd2`，**落后 main 10 个提交**，没有新提交 |

Quick 改动的范围（你接手前务必先看一遍 diff）：
- `engine/renderer3d.js`：第 3 章街景的天空/雾/环境光/阴影、街景第三人称相机、五种材质去重复着色器、摊位与招牌
- `engine/actors3d.js`：街市行人和摊主、平民模型加载、**剧情人物走动（王贵）**、表情驱动、远景模型回退、做旧模块接入
- `engine/character-weathering.js`（新）：王贵的程序化皱纹、胡茬、泥渍、褶皱（绑定空间，只支持 WebGL）
- `engine/character-preview.js`：王贵预览加载做旧模块
- `scenes/chapter-03.js`：`streetLife` 数据
- 资源：`zunyi_street.glb`（12.5→4.8MB）、`characters/civilians/*.glb`（新）、`wang-gui-web.glb`（加了 Walk 动画和法线贴图）

## 规则
1. **不要直接推 `main`**，所有改动走 PR。今天 main 的 10 个提交被整体重写过一次（哈希从 `58fd1e9` 变成 `f537df4`），请避免再强推。
2. 一个任务一个分支，分支名用 `codearts/<任务名>`，基于 `feat/quick-zunyi-life`（任务 0 除外）。
3. 不要改 B 方协议（`world.js` 顶部注释里的 `mount / snapshot / pause / resume / applyState / destroy` 和 `czmarch:interact` 事件）。
4. `actors3d.js`、`renderer3d.js` 是两边都在改的文件。动这两个文件之前先在 PR 里说明改哪几个函数，避免互相覆盖。
5. 测不了的就写「未实测」，不要写「已修复」。

---

## 任务 0：先把 `3D人物优化` 分支对齐（5 分钟）
- 如果这个分支上有你**本地没推送**的改动：先推送，再 `git rebase origin/main`，冲突时以 main 为准，在 PR 里列出冲突文件。
- 如果没有改动：删掉这个分支，后续任务都按规则 2 新开分支。
- **回传**：分支的处理方式 + 如果 rebase 了，冲突文件列表。

## 任务 1（最高优先）：在浏览器里实测 `feat/quick-zunyi-life`
Quick 那边跑不了浏览器，这一步只有你能做。
1. 检出分支，`node serve.cjs 8080`（站点根必须是 `changzheng/`）。
2. 打开 `http://localhost:8080/march-world/preview.html?3d=1`，F12 控制台粘贴 `tools/quick/test-ch3.js` 的全部内容，等约 30 秒。
3. 打开 `march-world/character-preview.html?char=wang-gui&renderer=webgl`，切到 `Walk`、`Talk` 动画各看一遍。
4. 第 7 章：控制台粘贴 `tools/quick/test-wanggui-walk.js`，按它最后打印的提示手动跑过铁索桥。
5. 用你的 Puppeteer 环境（`march-world/tools/verify-browser.cjs`）跑一遍 12 章 × 桌面 1280×800 + 竖屏 390px。

**发现问题时**：小问题（拼写、明显的变量名错、着色器编译错误）可以直接在 `codearts/fix-quick-zunyi-life` 分支上修，并在 PR 里逐条写清楚改了哪一行、为什么。**设计层面的问题不要改，先回传。**

**回传**（这是 Quick 下一步工作的依据）：
- `test-ch3.js` 输出的完整 JSON（控制台会自动复制到剪贴板）
- `test-wanggui-walk.js` 输出的 JSON
- 控制台里所有红色报错和带 `[zunyi]`、`[人物做旧]`、`[剧情人物走动]` 前缀的日志
- 截图 8 张（放 `evidence/quick-verify/`）：
  1. 第 3 章出生点主街全景（看天空、雾、阴影、石板是否还有格子）
  2. 一面青砖墙近景（**砖层是横的还是竖的**——Quick 对 UV 方向是推断的）
  3. 灰瓦屋面
  4. 木铺面正面（门板）
  5. 招牌和摊位（字是否清楚、是否插进墙里或悬空）
  6. 走近一个平民（穿模情况）
  7. 王贵预览页正脸（皱纹、胡茬位置是否在脸上对的地方）
  8. 院落北侧 (84,40) 原贴脸点
- `verify-browser.cjs` 的结果 JSON，并更新 `_shots/march-world-3d-browser.json` 基线（交接文档 P2-4）

## 任务 2：跑王贵的 Blender 精修脚本
需要 Blender 3.6+，你可以用 Blender MCP。
```
blender -b --factory-startup -P tools/quick/wang-gui-refine.py -- --in changzheng/assets/characters/wang-gui/wang-gui-web.glb --out-dir tools/quick/out
```
脚本会：加 5 个表情形态（`browDownLeft/Right`、`browUpLeft/Right`、`smile`），前臂加粗 12%、腿加粗 5%、肩顶压平，导出完整版；再减到约 8000 面导出 `wang-gui-lod.glb`；最后写 `wang-gui-refine-report.json`。
**这个脚本一次都没运行过**，第一次很可能报错。报错请把完整报错堆栈回传；能看出原因的小错可以直接修，在 PR 里说明。

验收：
- 报告里 `problems` 为空
- 7 张检查图（`tools/quick/out/wang-gui-refine-check/`）：皱眉时眉头往中间往下、挑眉只动一侧、微笑嘴角上提，都**没有穿模、眼皮没有穿进眼球**
- 预览页「皱眉」「微笑」滑块有效果
- 远景版在游戏里离远看时和完整版没有明显差别，面数 ≤ 10000
- 通过后，把 `out/wang-gui-web.glb`、`out/wang-gui-lod.glb` 复制到 `changzheng/assets/characters/wang-gui/`，开 PR
- 幅度不合适时可调参数：`--forearm 0.08`、`--leg 0.03`、`--shoulder 0.2`

**回传**：报告 JSON、7 张检查图、你最终用的参数。

## 任务 3：更新交接文档
`01_未完成清单.md` 与代码已经不一致，下一个接手的人会被误导：
- P0-1 / P0-2：代码里已经是 `MIN_CAM_DIST = 1.1`、`FOCUS_HEIGHT = 1.52`，按任务 1 的实测结果标成「已修复」或「部分修复」，并写上实测数值
- P1-3：现在已有何文、王贵两个独立人物，以及 3 个平民模型；王贵剧情走动的机制写一段
- `02_文件清单与校验.md`：按当前 main 重算文件数和关键文件 sha256
- README 的「更新记录」补今天的条目

## 任务 4：仓库体积（可选，先列清单、不要删）
列出 `changzheng/` 下**游戏运行时从来不加载**的大文件（例如 `he-wen-study-v1.glb` 26MB、`he-wen-skin-base.png` 20MB、同一张贴图的 PNG 和 JPG 两份、两个 `.blend`），连同大小和你判断「没被引用」的依据（`grep` 结果），提议迁到 Git LFS 或单独的资源仓库。**等确认后再动。**

---

## 回传格式
每个任务完成后，回一条消息，按这个格式：
```
任务 N：完成 / 部分完成 / 未完成
分支 / PR：
提交：
实测了什么：（没实测的写「未实测」）
发现的问题：（逐条，附截图或日志）
需要 Quick 决定的事：
```
