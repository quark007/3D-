# 第1–5章共享3D资源统一优化报告

日期：2026-11-23
范围：地形、道路、水面、地域色与性能审查；只实施视觉等价的共享资源优化。

## 结论

**通过：几何与材质参数完全等价，五章道路未引用顶点归零，水面材质按章共享。**

- 五章桌面道路顶点合计：**631,433 → 12,322**，减少 **619,111（98.05%）**。
- 道路有序三角形仍为 **21,142** 个；优化前后展开后的 `position/normal/uv/uv1` 哈希完全一致。
- 主地形高度哈希、地形几何哈希、水面几何与参数均一致。
- 每章一个水面材质和 flow uniform：五次完整章节运行合计 **14 → 5**；水 mesh 仍为 14 个。
- 桌面与 390×844 竖屏各五章，共 10 组对照全部 `geometryEqual=true`，`errors=[]`、`failedRequests=[]`。
- 第 2 章稳定位移回归：**9.57m / 65帧 / passed=true**。
- **不宣称稳定帧提速**：两轮 A/B 的 renderMs 有正有负，环境噪声尚未排除到足以证明性能提升。

## 保留的章节差异

五章继续保留各自的地形高度、地域色、雾距、曝光、灯光方向、植被与第 3 章街景 override。没有把五章统一成同一地貌或同一套颜色。

| 章 | 地域/地形 | 主地形顶点，不变 | 道路顶点 before → after | 减少 | 水材质 before → after |
|---|---|---:|---:|---:|---:|
| 1 于都 | village / 河阶 | 42,840 | 171,360 → 3,611 | 167,749 | 3 → 1 |
| 2 湘江 | river / 坡地 | 36,708 | 183,540 → 3,259 | 180,281 | 3 → 1 |
| 3 遵义 | town / 街景 | 1,189 | 4,756 → 206 | 4,550 | 1 → 1 |
| 4 赤水 | redrock / 曲谷 | 39,928 | 159,712 → 3,038 | 156,674 | 5 → 1 |
| 5 皎平渡 | dryvalley / 干热阶崖 | 37,355 | 112,065 → 2,208 | 109,857 | 2 → 1 |
| **合计** | — | — | **631,433 → 12,322** | **619,111** | **14 → 5** |

按 `position(3)+normal(3)+uv(2)+uv1(2)` 共 10 个 Float32、每顶点 40B 估算，单章属性数组减少约 **0.17–6.88MiB**。这是理论数组大小，不是显存实测，也不表示五章同时常驻。

## 实现

### `changzheng/march-world/engine/renderer3d.js`

1. **812–837 行**：每章只创建一个 `waterMaterial` 和 `waterFlow`；所有水 mesh 继续独立存在，保留透明排序、局部正弦起伏、原颜色与 Physical 参数。
2. **889–904 行**：道路以原 index 的出现顺序建立旧顶点→新顶点映射，只复制实际引用顶点的全部属性，再写入映射后的原有序 index。没有删三角形、改变绕序或合并道路。
3. **2211–2213 行**：每个水 mesh 仍更新局部 Y 起伏；共享 flow 只写一次，流速公式与章节分支不变。

`releaseResources()` 已用 Set 去重几何、材质和纹理，共享材质 dispose 不需要额外特殊处理。

### `tools/verify_chapter3d_unified.mjs`

新增 ES 模块验收入口，无截图：

- 同一浏览器依次覆盖第1–5章桌面与移动竖屏。
- 记录实际执行源码 SHA-256；`CZ_RENDERER_REV=HEAD` 可仅在测试请求中供给旧 renderer，用于同机 A/B，工作区不回滚。
- 对主地形、道路和水面建立几何签名；道路签名按有序三角形展开，因此顶点重映射不能靠删面通过。
- 每章每设备连续采样45帧，输出 median/p95/mean；不把单帧瞬时值当作稳定性能。
- after 对比强制要求：几何等价、道路未引用顶点为0、道路顶点减少、水 mesh 数不变、每章水材质与 flow 都为1。

## 性能复核

第二轮同机 A/B 的 median renderMs 如下，单位为 ms：

| 章 | 桌面 HEAD → 优化后 | 移动 HEAD → 优化后 |
|---|---:|---:|
| 1 | 6.4 → 6.2 | 5.0 → 4.8 |
| 2 | 6.9 → 6.0 | 5.3 → 5.1 |
| 3 | 3.9 → 3.6 | 2.4 → 3.5 |
| 4 | 7.3 → 8.6 | 5.4 → 5.8 |
| 5 | 4.1 → 3.6 | 3.5 → 4.1 |

部分章节改善、部分章节上升；第一轮与第二轮也有明显波动。因此性能结论仅为**资源占用下降已证明，帧时间变化未定**。移动阴影规则、美术参数均未调整；后续若要关闭移动阴影，应另开视觉/性能方向，不混入本次等价优化。

## 证据

- `baseline.json`、`after.json`：第一轮完整基线与对照。
- `baseline-repeat.json`、`after-repeat.json`：第二轮同机 A/B；baseline-repeat 实际执行 HEAD renderer 并记录对应哈希。
- `summary.json`：合计与验收结论。
- `../viewmode-20261123/round3/ch2-run13/chapter-2-verify.json`：优化后的第 2 章 9.57m 稳定位移回归。

## 复现

```bash
node serve.cjs 8082
CZ_PHASE=baseline node tools/verify_chapter3d_unified.mjs
CZ_PHASE=after CZ_COMPARE=1 node tools/verify_chapter3d_unified.mjs
CZ_PHASE=baseline-repeat CZ_RENDERER_REV=HEAD node tools/verify_chapter3d_unified.mjs
CZ_PHASE=after-repeat CZ_COMPARE=1 node tools/verify_chapter3d_unified.mjs
CZ_RUN=13 node tools/verify_ch2_stable_baseline.cjs 8082
```

本轮只创建本地提交，不推送。