# 长征星火 · 3D 未完修复交接包

《长征·星火》网页游戏 12 章实时 3D 可行走场景的**续修交接包**。原开发在 Qoder 上进行，因额度用尽转交其他 agent 继续；相机取景（P0）与 NPC 独立人物（P1）尚未完成。

## 先读

| 文件 | 内容 |
|---|---|
| [00_先读我.md](00_先读我.md) | 5 分钟跑起来、30 秒复现 bug、包内结构、约束 |
| [01_未完成清单.md](01_未完成清单.md) | P0/P1/P2 逐条：现象、代码行号、实测数据、验收标准 |
| [02_文件清单与校验.md](02_文件清单与校验.md) | 收录范围、文件数、关键文件 sha256 |
| [03_复现与验证.md](03_复现与验证.md) | 探针用法、手工复现、验证脚本改法、验收口径 |

## 快速启动

```bash
node serve.cjs 8080
```

- 3D 行走场景：http://localhost:8080/march-world/preview.html?3d=1
- 人物样板（何文）：http://localhost:8080/march-world/character-preview.html
- 3D 场景画廊：http://localhost:8080/world3d-gallery.html

> 必须从 `changzheng/` 起服务：3D 代码里资源是 `/assets/...` 绝对路径，站点根错了会 404 并回退 2D Canvas。

## 目录

- `changzheng/march-world/` — 3D 行走模块全部源码（`renderer3d.js` 是相机问题所在）、章节场景、预览页、验证脚本
- `changzheng/assets/` — PBR 材质、扫描道具、`models-v03`（36 个 GLB）、何文人物样板、three.js、地形数据
- `evidence/` — 现场截图与验证 JSON
- `tools/probe-camera.cjs` — 相机探针，自动复现并打印 `cameraDistance`

## 当前结论（实测）

第 3 章锚点「情报互相矛盾 · 指导员何文」北侧 `(84,40)` 聚焦时，`cameraDistance` 从正常 **15.381** 掉到 **1.043**、`cameraOccluded=true`，NPC 后背占满画面；同一锚点南侧 7 个位置全部正常。根因在 `march-world/engine/renderer3d.js:1245-1267 placeCamera()` 的遮挡收缩，叠加目标高度写死 1.05（胸口）。

## 更新记录

- **2026-11-22**：何文人物建模更新为 CodeArts 版 —— `he-wen-study-v1.glb` 25.2MB（42 meshes / 20 内嵌贴图 / 2 动画 / 1 骨骼），贴图增至 23 个文件共 82.6MB；`character-preview.html` 与 `engine/character-preview.js` 同步升级（新增皱眉/微笑形态、眉睫发丝、呼吸与注视微动、WebGPU/WebGL2 双后端自适应）。`00`～`03` 四份文档仍描述 11-20 的打包快照，未随本次模型更新重算。

---

czstar.cc.cd
