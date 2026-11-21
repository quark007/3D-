# 地理数据与精度

本目录提供可追溯的WGS84地标和数字高程资料，不代表1935年的测绘成果。

- `places.json`：十二章地理锚点，包含实际匹配名称、OSM要素ID、原始来源和精度说明。县域中心仅标为“区域参考点”；现代纪念园不当作整个战场的中心。
- `terrain-N.json`：地形网格、高程范围、经纬度边界、下载地址与处理说明。一般章节使用256×256原始瓦片采样，间距约30—35米；赤水区域视图由9张瓦片拼接，使用513×513网格，间距约101米。
- `terrain-manifest.json`：所有DEM的元数据，不包含高程数组。
- `waterways-N.geojson`：现今OSM河道中心线。赤水数据为土城、太平渡、茅台附近的已取得线段，缺口未通过插值或手画补齐；草地范围未取到河流要素时保持空数据。
- 赤水主锚点使用二郎滩渡口的现代OSM要素，土城镇政府仅保留为区域参考点。异地同名渡口已按川黔赤水河范围排除，数据生成脚本包含范围与瓦片数量约束。
- `verified-landmarks.json`：从OSM具体要素查询取得的原始地标记录。
- `dem-zoom-x-y.png`：公开Terrarium格式高程瓦片原件，可核对渲染数据。

## 精度边界

地标的小数位数不等于实际定位精度。OSM要素中心、地名库桥梁锚点和行政中心应分别理解；皎平渡使用Getty TGN的桥梁地理锚点，不声称该点就是1935年渡船靠岸位置。夹金山采用OSM的宝兴—小金交界垭口，排除了康定同名山峰。于都采用长征第一渡现址，而不是于都县域中心。

地形按1:1水平与垂直比例显示，每个场景单位等于60米。经纬度与网格使用同一Mercator瓦片公式。原始像素中心映射到网格端点会产生半个像素级边界误差；公开DEM本身也存在原始数据年代、插值、植被、建筑与接缝误差，不能用于导航、测量或历史现场定界。

于都瓦片发现两处孤立负高程尖刺。显示网格使用周围有效像素中位数修补，`display_repairs`记录原值和替换值；原始PNG保留未修改，`raw_min`保留原始最低值。

## 来源和许可

- Terrain Tiles / Mapzen：[AWS公开数据登记](https://registry.opendata.aws/terrain-tiles/)。访问日期：2026-10-17。原始来源及归属说明：[Tilezen attribution](https://github.com/tilezen/joerd/blob/master/docs/attribution.md)。不同地区底层数据源与精度可能不同，未将整个数据集统一声称为单一SRTM产品。
- © OpenStreetMap contributors，ODbL：[版权说明](https://www.openstreetmap.org/copyright)。OSM衍生数据与代码分别保存。
- 皎平渡桥梁锚点：Getty Thesaurus of Geographic Names，TGN 8066741，ODC-BY：[地名记录](https://www.getty.edu/vow/TGNFullDisplay?subjectid=8066741)。

重建命令：`python tools/fetch_world_assets.py all`。公共服务故障不会自动生成假坐标。
