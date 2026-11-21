# 长征·星火：真实地形交付物

这是独立数据工具包，不包含也不创建游戏工程。

## 直接集成

把 `data/terrain-1.json` 至 `terrain-12.json` 和 `data/waterways-{1,2,4,5,6,7,9}.geojson` 复制到游戏当前地形数据目录，保持文件名。JSON仅包含契约规定的字段，来源信息放在单独的 `provenance/`，无需修改 geography.js 的数据解析代码。

需求中的水系数量有冲突：明确排除3/8/10/11/12后，只有7个节点需要水系。这里以逐节点表及排除清单为准，不额外生成第8个空文件。

## 在Windows上重建

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe build_terrain.py --strict-srtm --workers 8
.\.venv\Scripts\python.exe build_waterways.py
.\.venv\Scripts\python.exe verify.py
# 单节点重跑
.\.venv\Scripts\python.exe build_terrain.py --id 8 --strict-srtm
.\.venv\Scripts\python.exe build_waterways.py --id 7
```

默认优先使用环境变量 `OPENTOPOGRAPHY_API_KEY` 调用官方API（有密钥时）；没有密钥时从OpenTopography官方公开GL1目录下载。公开目录和API都是SRTM GL1源数据。`--strict-srtm`禁止降到AWS混合DEM；省略该选项时，官方源失败后可退到AWS Terrain Tiles z11，来源会明确标为混合DEM，不能宣称是纯SRTM 30米。

下载有缓存、重试和HTTP Range断点续传。`--workers`控制并行下载数量，重采样最多4个并行任务。Overpass公共服务顺序查询，缓存原始响应；网络与公共服务负载会影响全量耗时，不承诺五分钟完成。

## 数值与地理边界

- SRTMGL1：1角秒（赤道附近约30米），不是SRTMGL30（30角秒）。范围仍使用任务给定的±0.3°经度/±0.25°纬度。
- 网格256×256，端点采样，首行北、末行南，首列西、末列东。双线性重采样，输出保留1位小数，min/max为舍入后数组的真实极值。
- 源数据与输出网格精度不同：区域宽度约50km，输出间距约200m；不能标为最终网格30m。
- 输出无效值用8邻域迭代均值填补，记录样本数；若全无有效值则报错。SRTM v3本身也包含源级填洞。
- 数据不进行高程截断、压平或局部造山。草地范围包含周边山地时会如实保留，详见terrain-summary.md。
- 地标来自任务中心坐标，是区域锚点；未核对精确桥址、渡口、垭口测量坐标。
- SRTM反映2000年前后地貌；OSM水系为当前地图走向，均不是1935年的地形、水位或河床复原。

## 验证与来源

`verify.py`检查12+7文件集合、字段、大小、方向、边界、有限数、极值；用已知倾斜平面的合成栅格验证北南/东西顺序，并检查穿越边界的线段裁剪。它不替代实地测绘。

数据表、实测耗时见 `terrain-summary.md` 与 `waterways-summary.md`；逐文件时间、SHA256、来源和查询见 `provenance/`。大体积GeoTIFF缓存和本机虚拟环境不纳入轻量交付压缩包。

来源：NASA/NGA SRTM，由OpenTopography公开分发；[官方产品及引用说明](https://portal.opentopography.org/raster?opentopoID=OTSRTM.082015.4326.1)。现代水系 © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)，ODbL 1.0；请在游戏数据署名处保留该署名与许可链接。若采用AWS备选，请额外遵循其[混合数据源署名要求](https://github.com/tilezen/joerd/blob/master/docs/attribution.md)。
