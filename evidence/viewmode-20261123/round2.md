# 第一/第三人称切换后续修复 · round2

日期：2026-11-23
基线：本地 `e2a417e`（保留 `bd5555b`、`b55d5ab`、`e2a417e`）
范围：只修输入链暴露的问题；未重做视角切换，未改 `scenes/`、相机按钮、UI 或何文材质。

## 结论与状态

- **第 3 章 P0 根因已定位并修复**：四选一归为 **状态残留 / 瞬时输入状态采样丢失**。长任务把 `keydown` 与 `keyup` 压到两个 `scene.tick` 之间，瞬时 `keys` 集合在移动采样前已被清空。不是碰撞、焦点丢失、V 切换解绑监听，也不是暂停/对话状态残留。
- **第 3 章原验收通过**：Three.js 第一人称 `moved.distance=9.83m > 1.0m`，`errors=[]`。
- **P1 五项全部通过**：数值见下文与 `round2-p1.json`。
- **第 2 章功能未坏，但历史 9.57m 绝对值未复现**：三次原脚本为 9.21、9.27、9.11m，`errors=[]`、速度与人称状态正常；yaw 和帧调度与历史样本不同。严格按“必须复现 9.57m”判定，此项仍是**未达项**，不以较好一次替换最终证据。
- **P2 未做**：P0 的冷启动回退排查、长帧复现及两章/P1 回归已耗尽本会话时间预算；未导出 fragment、未改 shader/材质，X4008 留待下轮。

## 1. P0 排查顺序与证据

### 1.1 碰撞：3 出生点 × 3 朝向，真实 KeyW 2600ms

测试只在大样本开始前用玩家已有 `setPos` 布置起点；按键期间不写坐标，全部位移由真实 `KeyW` 产生。完整数据：`round2-p0-diagnostics.json`。

| 起点 | 朝向 | 位移 m | 按住时速度 m/s | 说明 |
|---|---:|---:|---:|---|
| (16,58) | 北 | 10.54 | 4 | 通过 |
| (16,58) | 东 | 1.96 | 4 | 低帧样本仍 >1 |
| (16,58) | 南 | 8.90 | 4 | 通过 |
| (32,58) | 北 | 5.38 | 0（最终） | 先移动，后碰既有阻挡 |
| (32,58) | 东 | 8.96 | 4 | 通过 |
| (32,58) | 南 | 10.62 | 4 | 通过 |
| (50,58) | 北 | 5.38 | 0（最终） | 先移动，后碰既有阻挡 |
| (50,58) | 东 | 8.49 | 4 | 通过 |
| (50,58) | 南 | 4.56 | 0（最终） | 先移动，后碰既有阻挡 |

所有样本均满足：`activeElement=#world`、keydown/keyup 到达、按住时 `vector=(0,-1)`、`viewMode/cameraMode` 与当前人称一致。不存在某个出生点全方向不动。

### 1.2 焦点与监听

- 九组第一人称及第三人称对照的 `worldFocused` 全为 `true`。
- `KeyW`/`KeyV` 均送达窗口监听器；移动时 `hasKeyboard=true`，排除事件未达 `controls86.js`。
- V 切换没有 dispose/recreate 输入控制器。P1 连续五轮前后监听净数量均为 `keydown=2`、`keyup=1`。

### 1.3 模式与暂停状态

- 第一人称样本均为 `viewMode=first`、`cameraMode=first`、`cameraDistance=0`。
- 第三人称对照为 `viewMode=third`、`cameraMode=shoulder`、距离约 6.2m。
- P1 对话暂停能清零速度，恢复后能移动；没有暂停残留。

### 1.4 第三人称对照与同点长帧复现

- 同起点 `(16,58)` 第三人称真实 W 位移 **7.22m**，第一人称九组均可移动，排除该点固有全向碰撞。
- 修复前长帧探针：主线程阻塞约 3500ms，真实 W 仍只按 2600ms；起点/终点均 `(16,58)`，**distance=0**、frameDelta=6、焦点和模式正确、keydown/keyup 均到达。见 `round2-longframe-before.json`。
- 这复现了旧证据“errors 空但 0m”的机制：不是事件没监听，而是事件间没有移动采样。

## 2. 最小修复

### `changzheng/march-world/engine/controls86.js`

- **第 6 行**：新增 `polledKeys`、`pendingTaps`、`tapTokens`，区分“物理仍按住”“已被移动帧采样”“尚未采样就松开”。
- **第 55 行**：`reset()` 同步清理上述状态；失焦、暂停、切换控制模式不会留下方向。
- **第 72 行**：新 keydown 清除同键旧 pending/token，避免快速重按被旧回调误删。
- **第 78–86 行**：若方向键在任意 `vector()` 采样前已 keyup，则把方向保留到下一次 `requestAnimationFrame`；token 防止旧回调清除新按键。
- **第 112–113 行**：`vector()` 合并当前键与未采样 pending，并标记已采样键；`hasKeyboard/wantsRun` 同时考虑 pending。

不做长帧位移补偿、不直接改玩家坐标、不放宽碰撞。正常持续按住 W 时，帧循环已把键标为 sampled，不进入 pending 分支。

### 新增验证脚本

- `tools/viewmode_round2_diag.cjs:1`：九组碰撞/焦点/状态/第三人称诊断及长帧探针。
- `tools/verify_viewmode_round2_p1.cjs:1`：P1 五项真实事件回归，无截图。
- 原 `tools/verify_viewmode.cjs` **未修改**，断言与 2600ms 时长均保持原样。

## 3. 修复后验证

### 3.1 长帧探针

- 修复前：0m；修复后：**0.022m**，最终 speed=0。
- 这证明原先被整段吞掉的输入能进入移动链；0.022m 是恢复后一帧的正常固定步长位移，不是把阻塞期间位移瞬移补上。
- 修复后原始数据：`round2-longframe-probe.json`。

### 3.2 原 `verify_viewmode.cjs`

第 3 章，证据 `round2/ch3/chapter-3-verify.json`：

- first：`viewMode=first`、`cameraMode=first`、`cameraDistance=0`、`pinHidden=true`。
- third：`cameraMode=shoulder`、`cameraDistance=6.2`。
- back：第一人称状态正确恢复。
- look：yawBefore=0、yawAfter=-0.776、delta=-0.776。
- moved：`(16,58) → (18.46,48.48)`，**distance=9.83m**。
- `errors=[]`。

第 2 章，最终证据 `round2/ch2/chapter-2-verify.json`，历史对照 `round2-ch2-runs.json`：

- 人称切换、pin、第三人称 7.941m、errors 均正常。
- 三次 moved.distance：9.21 / 9.27 / **9.11m（最终保留）**；均大于 1m，但没有复现历史 9.57m。
- 历史 yaw=-0.198；本轮三次 yaw=-0.473 / -0.345 / -0.345。即使同为 -0.345，结果也为 9.27 / 9.11m，说明固定墙钟等待下帧调度会改变转向路径与位移。
- 本轮没有改 `player.js`、碰撞、相机或第 2 章场景；正常持续 W 不触发新增 pending 分支。**功能回归通过，但“9.57m 绝对值不退化”仍标记待稳定复验。**

## 4. P1 第一人称交互回归

完整数值：`round2-p1.json`，汇总 `passed=true`、`errors=[]`。

1. **NPC 导引**：真实 W 走到「情报互相矛盾 · 指导员何文」旁，最终距离 **1.96m**；`playerPinHidden=true`、`guidePinHidden=true`、`cameraDistance=0`，交互按钮为“交谈”。
2. **对话停走**：点击交互前 speed=2.167；收到目标 anchor 的 `czmarch:interact` 并 `pause('dialogue')` 后 speed=0，暂停时再按 W 的位移=0；`resume('dialogue')` 后真实 W 恢复到 speed=4。
3. **步行/冲刺**：C 后 `walking=true`、speed=**1.5m/s**；Shift 后 `running=true`、speed=**7m/s**。
4. **跳跃回落**：Space 后 airborne 样本 17 个，观察起跳区间 **611.9ms**，peakJumpHeight=**0.7587m**；最终 `airborne=false`、`jumpHeight=0`，即 `jumpTime` 已回到非跳跃区间。
5. **V 连续五轮**：每轮 third=`shoulder`/6.2m，back=`first`/0m，切回时 speed=0；监听器净数量始终 keydown=2/keyup=1，最后真实 W 松开后 speed=0，无累积或速度残留。

## 5. P2 与边界

- **P2 未做 + 原因**：为遵守单会话时间上限，把剩余预算用于复核第 2 章基线与整理可复现证据；没有硬上 X4008，也没有读取/附加大图。
- 未生成 `evidence/he-wen-material-2026-11-24/he-wen-fragment.glsl`，未运行材质测量，未改材质参数。
- 本轮自动生成的 9 张 PNG 已删除，只提交文本/JSON 数值证据。
- 工作区原有遵义室内、`player.js`、`renderer3d.js` 等未提交改动保持原样，不属于本轮修复，不纳入本轮 commit。
- 只创建本地 commit，不执行推送、force push 或 reset。