# march-world · A方交付说明（场景与行走）

《长征·星火》立体场景模块。分层 2.5D：高位斜俯视、近大远小、手绘低饱和（土黄/青灰/灰绿）。
本目录为 A 方全部交付物；不修改 B 方 `march-story/` 与旧入口 `index.html`，不启动小游戏、不判通关、不写存档。

## 资源加载顺序（供 B 方接入旧入口 index.html）

**状态：B 方已完成接入**（index.html 第 53 行 + 第 988-1010 行，顺序与本节一致，另在 input.js 后插入了并行开发的 `engine/controls86.js` 增强摇杆/方向键控件——input.js 检测到该模块即自动委托，属可选增强，缺失时回退到我的基础输入实现）。

全部 classic script（与 march-story 一致，依赖 `defer` 或放在 `march-story/story.js` 之前即可）：

```html
<link rel="stylesheet" href="march-world/world.css">
<script defer src="march-world/engine/projection.js"></script>
<script defer src="march-world/engine/painter.js"></script>
<script defer src="march-world/engine/pathfind.js"></script>
<script defer src="march-world/engine/input.js"></script>
<script defer src="march-world/engine/player.js"></script>
<script defer src="march-world/engine/anchors.js"></script>
<script defer src="march-world/engine/ambient.js"></script>
<script defer src="march-world/engine/renderer.js"></script>
<script defer src="march-world/scenes/kit.js"></script>
<script defer src="march-world/scenes/chapter-01.js"></script>
…（chapter-02 至 chapter-12，共12个）…
<script defer src="march-world/world.js"></script>
```

挂载方式：B 方 `CZMarchStory.boot({container, world: window.CZMarchWorld, chapterId})` 自动读取
`window.CZMarchWorldManifest`（由 world.js 依据 12 个场景文件自动生成）。无需手动传 sceneManifest。

## 全局导出（仅两个，符合协议）

- `window.CZMarchWorld`：`mount / snapshot / pause / resume / applyState / destroy` + 只读 `mounted` + `manifest`
- `window.CZMarchWorldManifest`：`{version, coordinateSystem, scenes:[{chapterId,sceneId,title,spawn,anchors,passages}]}`
- 引擎内部件挂在 `CZMarchWorld._`（非新增全局名）

## 协议实现要点（与约定逐条对应）

| 约定 | 实现 |
|---|---|
| `mount(container,{chapterId,sceneId,spawn,anchors})` | 挂载前自动 `destroy()` 旧场景；校验 sceneId↔chapterId 归属；B 传入 anchors 中若有未登记 anchorId 立即抛错 |
| `spawn` 可空 `{x,y,facing}` | `facing` 支持弧度数值或 `'n'/'s'/'e'/'w'`；spawn 落在阻挡区时回退场景默认出生点 |
| `snapshot()` | 仅 mounted 后可调，否则抛错「场景尚未挂载或已销毁」；返回 `{chapterId,sceneId,x,y,facing}`，facing 为弧度数值（B 方 state.js 的 position() 接受数值） |
| `pause(reason)/resume(reason)` | 原因集合语义：多原因并存时全部解除才恢复移动；暂停期间冻结移动/交互、环境动画减速为 0.25 倍、画面加暗角；未挂载时为安全空操作 |
| `applyState({enabledAnchorIds,completedAnchorIds,openPassageIds})` | 未列入 enabled 的锚点变暗且不可交互；completed 显示 ✓；openPassageIds 预留给 passages（当前 12 章均为单场景，`passages:[]`，后续若拆分子区域按清单登记即可，向后兼容） |
| `destroy()` | 幂等；释放画布/离屏缓存、输入监听、ResizeObserver、rAF、DOM 标签层 |
| `czmarch:interact` | 用户按 E / 空格 / 触屏按钮 / 点按锚点时派发，`detail:{chapterId,sceneId,anchorId}`；暂停时不派发 |
| 坐标系 | 场景地面坐标，x 向东、y 向南（北=远景），1 单位≈1m；清单与 anchors-map.json 一致 |

## 输入

- 电脑：WASD / 方向键行走；E / 空格 / Enter 交互；鼠标点击地面 A* 寻路移动；点按锚点自动走近后触发
- 手机：左下虚拟摇杆（按压左侧区域唤出）；靠近锚点出现右下交互按钮；点按地面寻路移动
- 横竖屏自适应：zoom 按容器高度取「可见地面高约 46 世界单位」，宽场景由镜头跟随滚动展示，不硬缩进窄屏；镜头限制在世界边界内

## 碰撞 / 遮挡 / 透视

- 碰撞：1 单位栅格（可走多边形 − 阻挡圆/矩形/多边形），角色半径 0.62，沿墙滑动；A* 禁止切角 + 视线拉直
- 遮挡：实体（道具/NPC/角色）按 y 画家算法排序，树、石墙、房屋为遮挡体，角色北行入树后即被部分遮蔽
- 透视：地面纵向压缩 PITCH=0.6 + 深度缩放（北缘 0.72× → 南缘 1.28×），建筑侧面按斜俯视绘制

## 每章空间锚点清单

见 `anchors-map.json`（由 `node march-world/tools/build-anchors-map.cjs` 从场景文件生成，含 chapterId/sceneId/spawn/全部锚点坐标）。
与 B 方 `march-story/anchor-requests.json` 交叉校验：**283 项请求绑定 → 281 个锚点，缺失 0**（B 方有 2 对 storyId 共用同一锚点）。

各章空间分区（区域名与锚点注释在场景源码内逐条标注）：

| 章 | sceneId | 空间 |
|---|---|---|
| 1 | chapter-1/scene-ruijin | 送行路口/晒谷场/补给仓库/于都河浮桥/研学档案区 |
| 2 | chapter-2/scene-xiangjiang | 入口山路/队伍集结处/接应区域/河岸与渡口（浮桥）/南岸 |
| 3 | chapter-3/scene-zunyi | 西牌坊/石板主街/会议会址院落/电台室/菜市 |
| 4 | chapter-4/scene-chishui | 西北山道/土城吊脚楼/一渡渡口/二渡渡口/东岸高地 |
| 5 | chapter-5/scene-jinsha | 北山旱道/彝海结盟林/皎平渡石滩（七船意象）/指挥山洞 |
| 6 | chapter-6/scene-dadu | 安顺场村/鹅卵石滩/渡船点/浮桥/南岸接应/东高地碉楼 |
| 7 | chapter-7/scene-luding | 西桥头亭/铁索桥（桥面可行走）/北崖栈道/东岸县城 |
| 8 | chapter-8/scene-snowmount | 山脚营地/垭口检查站（石墙木门经幡）/之字雪路/丰碑点/北垭口 |
| 9 | chapter-9/scene-grassland | 西入口向导点/草丘沼泽（5处水洼绕行）/宿营篝火/野菜地/夜营地 |
| 10 | chapter-10/scene-lazikou | 西营地/峡谷隘道/腊子河木桥/隘口碉堡遗迹/之字山径 |
| 11 | chapter-11/scene-wuqi | 北路进镇/窑洞台地/门楼广场（红旗）/档案小屋/直罗镇道 |
| 12 | chapter-12/scene-huining | 西城门/会师门楼/中心广场三旗/腰鼓场/南场 |

## 美术状态（占位 vs 最终）

**2026-10-29 整合88更新**：已替换为原创手绘远景图集、透明树木/瓦房/帐篷/渡船原画，结合按原场景几何绘制的地表纹理、其余建筑与道具。资源在 `assets/world-art88/`，提示词与美术边界见该目录说明；流畅度与真实验证见 `readme/剧情美术与流畅度88.md`。下述2026-10-28记录为A方原始交付检查，不冒充本轮性能实测。
用户提供的 6 张章节参考图（雪山/湘江/遵义/赤水/腊子口/金沙江）作为构图与配色基准已实现到场景布局。
最终美术替换路径：在 `painter.js` 的 `paintTerrain/paintBackdrop/spriteFor` 三处按 sceneId 挂真实贴图即可，场景定义无需改动。

## 验证

```bash
node march-world/tools/build-anchors-map.cjs   # 锚点映射 + 与B方请求交叉校验（零缺失）
node march-world/tools/verify-walkable.cjs     # 12场景出生点→全部锚点可达（281/281）
npm run dev                                    # 起服务后访问 /march-world/preview.html
```

preview.html 为 A 方独立预览：章节切换挂载、暂停/恢复、applyState 模拟、snapshot、幂等 destroy、交互事件日志。
预览里的日志面板仅用于验证触发，不是成品 UI。

## 实际检查结果（本仓库环境，2026-10-28 实测）

自动化校验（Node）：
- `build-anchors-map.cjs`：12 章 / 281 锚点 ↔ B 方 283 项绑定，**缺失 0 / 场景不符 0 / 坐标非法 0**；12 章均有 exit
- `verify-walkable.cjs`：12/12 场景出生点 A* 可达全部锚点（281/281）

浏览器实跑（Edge headless，`verify-browser.cjs`，截图在 `_shots/`）——**15/15 通过、全程无 pageerror**：
- 12 章依次挂载 + snapshot 章节一致（桌面 1280×800 逐章截图）
- 键盘移动方向正确；北山阻挡区不可穿入（停在 y=15.5，阻挡带 y<5.5）
- 点击地面 A* 寻路位移 16.8 单位
- pause 冻结移动；多原因集合语义正确（残留原因不恢复）；全部解除后恢复
- 接近 NPC 按 E 派发 `czmarch:interact`（detail 含 chapterId/sceneId/anchorId）；暂停时按 E 不派发
- applyState：禁用后提示全隐、恢复后 exit 常驻 + 完成 ✓ 标记
- destroy ×2 幂等、销毁后 snapshot 明确抛错
- 竖屏 390×844 取景正常（湘江/雪山/会宁截图）
- 像素探针：天空 [168,182,185] / 远山 [149,160,152] / 中景 [115,114,91] / 近景 [125,117,87]，四层色带分明
- 遮挡验证：`ch02-occlusion.png` 角色位于近景树北侧被树冠遮蔽

真实入口集成冒烟（`verify-integration.cjs`，index.html 全链路）——**通过**：
- index.html 同时就绪 `CZMarchWorld` + 12 场景清单 + `CZMarchEntry` + `GameState`
- 选岗位后 `CZMarchEntry.launch(1)` → 瑞金场景挂载成功（`integration-ch01-live.png`）
- 开场序章对话自动 `pause('dialogue')`（B 方编排，符合协议）；关闭对话后行走恢复（Δy=5.1）
- `CZMarchStory.destroy()` → 场景与 DOM 完全释放；无 march-world 相关页面错误

镜头说明：北缘镜头允许越界 22 世界单位，玩家走近地图北侧时露出天空+三层远山地平线（空气透视），符合参考图"远景山峦天空"层次；深场景内部顶部为更远的地面，符合跟随镜头惯例。

参考链接情况：h5.metaapp.cn 参考玩法可访问（HTTP 200，打包 H5 无法提取实现细节，以 6 张参考图为准）；czstar.cc.cd 从本环境不可达（HTTP 000），未做线上比对。

## 与 B 方的协议差异说明

无字段改动。仅补充两项向后兼容行为：(1) `facing` 同时接受弧度数值与四方向字符串；(2) `CZMarchWorld.mounted` 只读状态位，便于预览页自检，B 方可忽略。
