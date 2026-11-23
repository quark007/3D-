# 第 2 章位移基线稳定化 · round3

日期：2026-11-23
基线提交：`3a9903a` 之后的当前工作区（含外部 `a7f0fe1`、`452ff66`）
范围：只增加可重复验收脚本与数值证据；没有修改运行时 JS、场景、相机、按钮、UI 或材质。

## 结果

**第 2 章历史 9.57m 基线已恢复并可重复。**

| 最终运行 | 距离 | 运动帧 | 自然鼠标 yaw 增量 | 校准后运动起点 yaw / target | 结果 |
|---|---:|---:|---:|---:|---|
| run10 | 9.58m | 65 | -0.335 | -0.198 / -0.972 | passed |
| run11 | 9.58m | 65 | -0.176 | -0.198 / -0.972 | passed |
| run12 | 9.57m | 65 | -0.649 | -0.198 / -0.972 | passed |

三次范围 9.57–9.58m，均值 9.577m；`errors=[]`、`failedRequests=[]`、Three.js 后端、第一人称状态均正确。自然鼠标增量仍随原生帧调度变化，但运动阶段的初始视角和 dt 序列已被固定，不再影响基线。

第 3 章使用未修改的 `tools/verify_viewmode.cjs` 对照：**9.76m**，`cameraDistance=0`，第三人称距离 6.2m，`errors=[]`。

## 根因

原脚本以墙钟时间替代动画进度：

1. 鼠标事件后固定等待 900ms，实际 `orbitYaw` 可能停在 -0.198、-0.345、-0.473 或其他值。
2. 第一人称移动每帧读取当前 `orbitYaw`，所以不同的运动起点 yaw 会产生不同行走路径。
3. W 虽固定按住 2600ms，但渲染器把单帧 dt 上限设为 80ms；长帧和不同帧数会改变有效固定步长序列。
4. 因而旧脚本即使相同 yaw 也会得到不同距离，不能把绝对位移波动直接归因于输入修复或角色速度退化。

上一轮 9.21 / 9.27 / 9.11m 与历史 9.57m 的差异是**验收时钟不确定**，不是需要通过改玩家、碰撞或相机产品代码修复的问题。

## 方案选择与排除过程

- 只校准运动前 yaw：9.54 / 9.44 / 9.30m，仍存在有效帧数差异，不能单独作为稳定基线。
- 原生 rAF 限到 25fps：9.46m，仍受长任务影响，不采用。
- CDP 虚拟时间：两种策略分别只有约 38 / 20 个有效运动帧，3.24 / 1.69m，不采用。
- **手动 rAF 时钟**：真实 KeyW 按下后，逐帧执行 65 个渲染回调，每帧时间戳增加 40ms，动画内总时长严格为 2600ms；初次重复为 9.58 / 9.57 / 9.57m，整理后的最终三次为 9.58 / 9.58 / 9.57m，采用。

没有放宽 `distance >= 9.57` 门槛，没有把 W 的游戏内时长延长到 2600ms 以上，没有直接写玩家坐标。

## 文件与实现位置

新增 `tools/verify_ch2_stable_baseline.cjs`：

- **1–2 行**：明确测试只校准视角和动画时钟，不生成截图、不改生产代码。
- **8–12 行**：默认 run、显式探索开关及证据目录；默认 `CZ_MANUAL !== '0'`，即手动 65 帧模式。
- **21–32 行**：只包装现有 `view.create` 捕获验收视图，利用已有 `setLook` 接口。
- **65–71 行**：保留原始 alt + pointermove 真实鼠标事件并记录自然 yaw。
- **72–92 行**：接管后续 rAF，先执行一个无输入 priming 帧；没有可执行回调时立即失败。
- **93–101 行**：校准历史 `yaw=-0.198`、`target=-0.972`，真实 KeyW 下执行 65×40ms。
- **118–127 行**：校验距离 ≥9.57m、实际运动帧=65、Three.js、人称状态、第三人称 7.941m、errors 与失败请求。

原 `tools/verify_viewmode.cjs` 未修改；运行时代码变更清单为空。

## 证据

- `round3-ch2-summary.json`：最终三次汇总及第 3 章对照。
- `round3/ch2-run10/chapter-2-verify.json`
- `round3/ch2-run11/chapter-2-verify.json`
- `round3/ch2-run12/chapter-2-verify.json`
- `round3/ch3/chapter-3-verify.json`

探索性 run1–9 与自动生成的 PNG 已删除，只保留最终数值证据。

## 复现

```bash
node serve.cjs 8082
CZ_RUN=10 node tools/verify_ch2_stable_baseline.cjs 8082
CZ_RUN=11 node tools/verify_ch2_stable_baseline.cjs 8082
CZ_RUN=12 node tools/verify_ch2_stable_baseline.cjs 8082
CZ_EVIDENCE=viewmode-20261123/round3/ch3 node tools/verify_viewmode.cjs 8082 9333 chapter-3/scene-zunyi
```

本轮只创建本地提交，不推送。