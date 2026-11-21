# 开源组件与素材来源

本表区分运行时依赖、原始素材与离线制作工具。模型权重、字体文件、作者云端凭据不包含在分发目录内。

| 项目 | 许可与记录 | 用途及修改 |
|---|---|---|
| Three.js及加载器 | MIT；完整文本见 js/vendor/three-LICENSE.txt；加载器版本0.160.1见 assets/models/README.md | 浏览器3D；本轮未修改3D实现 |
| Poly Haven模型与PBR材质 | CC0-1.0；资产链接、逐文件哈希见 assets/models/manifest.json 与 assets/pbr/manifest.json | 通用布景；开发目录保留原始资源，分发仅排除三份未被运行时引用的树模型中间文件 |
| 地图底图 | 原工程提供 map_base.jpg，图面审图号GS(2023)2767；原图来源/使用许可仍需维护者补充取得记录 | 原图保留于source-assets/maps；运行时只使用2560×1817的map-web.webp，教学路线标注独立于底图 |
| 作者NPC剧本 | 用户提供的NPC对话文档，整理为 assets/npc-scripts/scripts-v1.json | 虚构基层角色；72组，只有12-02参与角色元数据本轮补正 |
| SVG分镜与页面美术 | 项目作者生成；场景为艺术表现 | 不作为历史影像或遗址测绘证据 |
| OBS视频片段 | 用户提供并上传至自有OBS；清单 assets/obs-video-catalog.json | 权属与制作记录由维护者保存；不是历史影像 |
| ChatTTS代码与模型 | 官方代码AGPLv3+，模型CC BY-NC 4.0，见 https://github.com/2noise/ChatTTS 与 https://huggingface.co/2Noise/ChatTTS | 离线教育研究制作工具；不随包分发代码/权重；新版38条音频为通用音色合成，不是真人或历史人物录音 |
| DUDULab本地整合包 | 用户已安装的制作工具，目录 DUDULab_ChatTTS_Ench_WIN_v3.0 | 本轮直接使用已安装本地快照；整合包及附带组件不随游戏分发 |
| FFmpeg | 以本地安装包附带的构建许可为准；构建信息可由 ffmpeg -version 核对 | 离线编码与混音工具，不随游戏分发 |
| 系统字体 | 使用Windows中已安装的Microsoft YaHei、SimSun等 | 网页调用系统字体，未打包字体文件；PPT保留可编辑文本 |
| 战地预告与个人行记背影 | 本地素材剪辑、原创合成音效、合成旁白；AI艺术背影 | 中速预告见 assets/competition-v4/trailer-sources.json；音轨时间表 voice-timeline.json；三份未引用树模型中间文件保留于source-assets/models，运行GLB不改动 |
| FastAPI、Uvicorn、Requests、python-dotenv、OBS SDK | 安装版本由server/requirements.txt约束，安装时保留各包自带许可 | 可选服务端依赖，分发源代码及依赖清单，不打包解释器或site-packages |

该清单记录已知来源，不替代缺失的素材取得证明。公开提交前仍需补齐底图、用户视频及原始音色文件的取得记录。

第六轮新增10段本地原创行动图解：由tools/build_support_films.py绘制、编码，清单assets/story-media/manifest.json；无原片声音、无历史影像宣称，未使用3D资源。OBS人工复核覆盖8个对象，标注见assets/media-curation.json；7个仅作为通用行军情境，1个因画面含义不明确停用。视频取得记录仍由作者保存。

第七轮原创分镜由内置imagegen生成匿名虚构角色和艺术场景，原图与提示方向保留在assets/chapter-cinema；三段8秒影片只是动态分镜，不是历史影像、遗址证明或3D测绘。新版v5重点配音继续使用本地ChatTTS与已有通用男声嵌入，未克隆真实人物；无时长拉伸/降调。微软云端试听返回403，没有把其音频或引擎打进发行目录。

第八轮离线配音制作采用[hexgrad/Kokoro-82M-v1.1-zh](https://huggingface.co/hexgrad/Kokoro-82M-v1.1-zh)（模型卡标注Apache-2.0）、Kokoro代码与Misaki中文前端。使用其通用zm_011音色，用户选择方案A；不以真实人物身份演出。模型及依赖隔离在.tools，不随游戏分发；输出录音保留合成配音说明。头像由内置imagegen生成，方向和图集信息见assets/portraits/provenance.json；匿名虚构角色，非历史照片。


## 用户交付 SRTM 与 WebGPU 包（第40轮）
地形：NASA/NGA SRTM GL1，OpenTopography 分发；来源见 assets/geography/provenance/ 和 SRTM-SOURCES.md。水系 © OpenStreetMap contributors，ODbL 1.0：https://www.openstreetmap.org/copyright 。现代区域数据不是1935年实测复原，256网格实际采样约200米。WebGPU 地形使用单独的 three r186.1 模块实例，MIT 许可见 assets/webgpu40/vendor/three/LICENSE；原艺术场景的 GLSL 渲染路径保留 WebGL。


## Optional edge inference (42)
Qwen2.5-0.5B-Instruct (Qwen Team, Apache-2.0), ONNX conversion supplied via onnx-community/Qwen2.5-0.5B-Instruct. Model card: https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct . Transformers.js (Apache-2.0) and ONNX Runtime (MIT) license copies are included under assets/edge-ai/licenses. Derived worker module only rewrites two local import specifiers; model weights are unchanged.
