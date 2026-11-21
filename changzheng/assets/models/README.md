# 场景模型

Poly Haven `rock_07`、`wooden_crate_01`、`tree_small_02` 与 `fern_02`，CC0-1.0。原始地址、逐文件 SHA256 和大小见 manifest.json。1k 贴图全部本地缓存，不依赖远程 CDN。

树木运行时采用 tree-cinema.glb：原始模型减面后按完整叶簇抽稀，再清理闲置顶点。衍生产物哈希、三角形数与大小记录于 manifest.runtime；实例化批量绘制，避免为每棵树复制网格。它是通用植被资产，不表明遗址当年的具体树种与植被分布。

岩石为自然物件扫描，木箱为无人物、无标识的通用布景；均不作为长征文物或遗址复原证据。用于剧情近景，不改变 WGS84 地理锚点。雪山与草地不套用裸岩模型，以免改变场景语义。

加载器来自 Three.js 0.160.1 官方包，许可见 js/vendor/three-LICENSE.txt。three-bridge.js 共享现有渲染器实例，避免重复加载运行库。
