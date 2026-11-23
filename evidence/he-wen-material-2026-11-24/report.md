# 何文人物材质与光照交付报告（2026-11-24）

## 结论

- 本轮只改材质、shader 与两个统计/加载缺陷；未改 GLB、几何、相机逻辑、`scenes/` 或王贵加载流程。
- 何文仍为 42 个网格、20 个材质、29,139 三角面；mesh 名与材质名未改。
- WebGL 与强制 WebGPU 均完成加载验收：无控制台 error、无失败请求，WebGPU 的皮肤四个 TSL 节点和四个毛发 `emissiveNode` 均存在。
- **持续帧率验收未通过最终复测**：首轮改后为 32.14 fps，达到门槛；最终同代码复测为 11.97 fps，低于基线的 90%（27.30 fps）。本机后续 headless Chrome 出现临时 profile 锁残留与关闭延迟，性能环境不稳定，因此不能宣称稳定性能达标。

## 环境说明

- 任务给定 HEAD 为 `d8e4789`，开工实际 HEAD 为 `b6b46dc`，工作区干净；未回退仓库。
- 8080 返回的是另一套旧站点，实测 44 网格 / 24 材质 / 235,430 面，已废弃该组数据。
- 有效基线与改后数据均来自当前仓库的 8081 服务，模型为 `changzheng/assets/characters/he-wen/he-wen-web.glb`。

## A. 材质审计

原始 20 个材质全部 `doubleSided=true`。贴图尺寸直接解析 GLB 内嵌图像，不读取图片到对话。最终保留 8 个双面薄片材质，12 个实体材质改 FrontSide。

| 材质 | 所属网格/节点 | 原 doubleSided | alphaMode | baseColor | normal | 目标 side |
|---|---|---:|---|---|---|---|
| HeWen_DullBuckle | HeWen_BeltBuckle、.001、.002、.003 | 是 | OPAQUE | — | — | FrontSide |
| HeWen_WornCotton | HeWen_BreastPocket、.001、HeWen_CapVisor、HeWen_EightPanelCap、HeWen_ShoulderStrap、.001、HeWen_StandCollar、HeWen_UpperTunic | 是 | OPAQUE | 1024×1024 | 1024×1024 | FrontSide |
| HeWen_BrowStrandHair | HeWen_BrowStrands | 是 | OPAQUE | — | — | DoubleSide |
| HeWen_RedClothTabs | HeWen_CapRedStar、HeWen_CollarTab、.001 | 是 | OPAQUE | — | — | FrontSide |
| HeWen_TunicCotton | HeWen_Clothes | 是 | OPAQUE | 1024×1024 | 1024×1024 | FrontSide |
| HeWen_MatteButtons | HeWen_CollarHook、HeWen_ShoulderButton、.001、HeWen_TunicButton、.001～.005 | 是 | OPAQUE | — | — | FrontSide |
| HeWen_Skin.eyebrow001 | HeWen_Eyebrows | 是 | BLEND | — | — | DoubleSide |
| HeWen_LashHair | HeWen_Eyelashes | 是 | OPAQUE | — | — | DoubleSide |
| HeWen_Skin.high-poly | HeWen_Eyes | 是 | BLEND | — | — | FrontSide |
| HeWen_Skin.short04 | HeWen_Hair | 是 | BLEND | — | — | DoubleSide |
| HeWen_HairStrandDark | HeWen_HairStrands | 是 | OPAQUE | — | — | DoubleSide |
| HeWen_HairStrandLight | HeWen_HairStrandsLight | 是 | OPAQUE | — | — | DoubleSide |
| HeWen_WornLeatherBelt | HeWen_LeatherBelt | 是 | OPAQUE | 1024×1024 | 512×512 | FrontSide |
| HeWen_TrimFlap | HeWen_PocketFlap、.001 | 是 | OPAQUE | 512×256 | 512×256 | DoubleSide |
| HeWen_ClothShoes | HeWen_Shoes | 是 | OPAQUE | — | — | FrontSide |
| HeWen_SkinPBR | HeWen_Skin（glTF mesh：base.001） | 是 | OPAQUE | 1024×1024 | 1024×1024 | FrontSide |
| HeWen_TearLine | HeWen_TearLineL、HeWen_TearLineR | 是 | OPAQUE | — | — | DoubleSide |
| HeWen_Skin.teeth_base | HeWen_Teeth | 是 | BLEND | — | — | FrontSide |
| HeWen_Skin.tongue01 | HeWen_Tongue | 是 | BLEND | 256×256 | — | FrontSide |
| HeWen_TrimPlacket | HeWen_TunicClosure | 是 | OPAQUE | 64×1024 | 64×1024 | FrontSide |

审计工具：`changzheng/tools/audit_he_wen_materials.mjs`。

## B. 皮肤

- `changzheng/march-world/engine/character-preview.js:151-184`：生成共享 64×64 预积分皮肤 LUT；为程序生成数据，不是外部贴图。
- `changzheng/march-world/engine/character-preview.js:258-272`：`MeshPhysicalMaterial` 参数、粗糙度贴图保留、`clearcoat=0.03`、`sheen=0`、主法线 `normalScale=0.6`。
- `changzheng/march-world/engine/character-preview.js:363-378`：WebGPU TSL 的 1× 主法线与 30× 微法线、0.45～0.60 粗糙度、AO 反相厚度和仅红通道透光。
- `changzheng/march-world/engine/character-preview.js:424-426`：WebGL 预积分 BRDF 采样函数。
- `changzheng/march-world/engine/character-preview.js:495-504`：同一微法线贴图 30× 采样，`normalScale=0.25`，主法线保持 1×；粗糙度限制为 0.45～0.60，并保留面部油光分区。
- `changzheng/march-world/engine/character-preview.js:506-523`：曲率/AO 厚度近似，预积分 directDiffuse 混合；边缘透光只写 `outgoingLight.r`，主系数 0.35，未向绿/蓝通道补透光。
- `changzheng/march-world/engine/character-preview.js:670-695`：双面分类；皮肤、牙齿、舌头改 OPAQUE；眉毛 `alphaTest=0.25`、`depthWrite=true`。
- `changzheng/march-world/engine/character-preview.js:915`：释放 LUT。

## C. 毛发

- `changzheng/march-world/engine/character-preview.js:202-257`：四个目标材质的 Kajiya-Kay 切线高光，双切线偏移均为 0.1；WebGL 与 WebGPU 分别实现，不新增发片或切线几何属性。
- `changzheng/march-world/engine/character-preview.js:203-208`：`alphaTest=0.35`、`depthWrite=true`、支持的后端开启 `alphaToCoverage`，关闭 BLEND。
- `changzheng/march-world/engine/character-preview.js:680-696`：眉毛卡片 0.25、发片 0.35，四个毛发材质接入 Kajiya-Kay。

## D. 布料与配件

- `changzheng/march-world/engine/character-preview.js:185-201`：仅在需要时把 Standard 材质升级为同名 Physical 材质，保留贴图、颜色和网格绑定。
- `changzheng/march-world/engine/character-preview.js:668-669`：所有材质贴图使用 WebGL `renderer.capabilities.getMaxAnisotropy()`；WebGPU 无该 API，使用 16× 后备。
- `changzheng/march-world/engine/character-preview.js:697-700`：两种棉布 `sheen=0.35`、`sheenRoughness=0.6`、暖白 `#fff1dc`。
- `changzheng/march-world/engine/character-preview.js:702-705`：皮带 `clearcoat=0.15`，保留原粗糙度磨损贴图。
- `changzheng/march-world/engine/character-preview.js:706-711`：扣具与纽扣 `metalness=1`，显式使用现有 `environment.texture`（PMREM），不是纯色伪造反射。
- 未新增外部贴图，无需修改 `THIRD-PARTY-NOTICES.md`；唯一新增 GPU 纹理为程序生成的 64×64 LUT。

## E. 两个缺陷

- `changzheng/march-world/engine/actors3d.js:27`：删除王贵不存在的 `lodUrl`。本体只有 9,034 面，约 8k LOD 没有有效减面收益，还会增加请求与 404。
- `changzheng/march-world/engine/renderer3d.js:54`：删除 3D 路径永不置真的 `stats.artReady` 字段，没有伪造新的就绪状态。
- `evidence/he-wen-material-2026-11-24/cleanup-mobile.json`：390×844 移动端第 1 章真实挂载通过；请求 `wang-gui-web.glb`，未请求 `wang-gui-lod.glb`，无 404/error，stats 不含 `artReady`。

## 指标对照

测试视口 1280×800、DPR 1，连续 120 帧平均。`renderer.info.autoReset=false` 后按帧归一，因此 calls/renderTriangles 包含阴影、GTAO 与 composer 全管线；模型面数单列，避免把全管线三角形误认为 GLB 面数。

| 指标 | 改前 baseline | 改后最终 after-final | 判定 |
|---|---:|---:|---|
| `renderer.info.render.calls` / 帧 | 178 | 175 | 通过，未增加 |
| 模型三角面 | 29,139 | 29,139 | 通过，几何冻结 |
| `renderer.info.render.triangles` / 帧（全管线） | 118,785 | 116,689 | 下降 2,096 |
| `renderer.info.memory.textures` | 38 | 39 | +1，程序皮肤 LUT |
| fps | 30.338 | 11.973 | **未通过，门槛 27.304** |
| 首轮改后 fps（同一 WebGL 业务实现） | 30.338 | 32.144 | 首轮曾通过，+5.96% |

证据：`baseline.json`、`after-materials-draft.json`、`after-final.json`。后续低帧率复测没有被删除或替换成较早高值。

## 近景与双后端

- 图片路径：`evidence/he-wen-material-2026-11-24/front-closeup.jpg`
- 1280×800、JPEG q80、50,801 字节；头部顶点投影占完整视口高度 62.24%。
- 强制 WebGPU：`after-webgpu.json`，29,139 面 / 42 网格 / 20 材质，无 error/失败请求；皮肤 `colorNode`、`normalNode`、`roughnessNode`、`emissiveNode` 均存在，四个毛发 `emissiveNode` 均存在。
- 移动端缺陷清理：`cleanup-mobile.json` 通过。

## 没做到的项与原因

1. **最终持续帧率不低于基线 −10%：未做到。** 首轮改后 32.144 fps 通过，但最终同代码复测 11.973 fps 未通过。后续本机 headless Chrome 出现锁残留和关闭延迟，性能环境不稳定；需要在干净、稳定环境中重测，不能用较早高值替代。
2. **毛孔、油光不均、发丝边缘透光的肉眼对照签收：未由 Agent 完成。** 为遵守 06 禁止读图/附图，只保存指定 JPEG 和投影/文件尺寸数值，未声称肉眼已看到这些细节；需用户对照 `evidence/wang-gui-final-1122/` 同角度图。
3. **驱动级 `X4008 floating point division by zero` 警告：未消除。** WebGL 无 error，但改后仍有该警告；一次毛发零向量 epsilon 试验无效且已撤回，需下轮用完整 shader 行号定位。基线已有的 `X4122` 与 Clock 弃用警告也保留。
4. **三层眼球：按本轮约束未做。** 不新增球体/角膜/虹膜网格，避免与 6 个面部 morph 的对齐和穿模风险，留待几何允许调整的下轮。

## 本地提交

- `193d20f`：`test(render): 记录何文材质审计与渲染基线`
- `94c5bad`：`feat(render): 何文皮肤预积分/毛发各向异性/布料 sheen，收敛双面与混合`
- `ca8c4f6`：`fix(render): 移除失效王贵 LOD 与常驻假 artReady`

未推送 GitHub。