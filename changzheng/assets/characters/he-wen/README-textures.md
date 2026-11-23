# 何文贴图目录说明（重要：有大文件）

这里的 PNG 是 `tools/build_he_wen.py` 生成贴图时**顺手落盘的产物**，已经全部内嵌进 `he-wen-study-v1.glb`。
前端和 GLB 都不引用这些独立文件，删掉不影响运行（但重建时会再生成）。

## 不要直接用图片方式打开这些 PNG

| 文件 | 体积 | 尺寸 |
|---|---:|---|
| `he-wen-skin-base.png` | **19.5 MB** | 4096² |
| `skin-authored-micro-normal.png` | **7.8 MB** | 2048² |
| `tunic-cotton-normal.png` | **6.3 MB** | 2048² |
| `skin-authored-roughness.png` | **4.5 MB** | 2048² |
| `tunic-cotton-base.png` | 3.4 MB | 2048² |
| `he-wen-short-hair.png` | 2.9 MB | 1024² |
| `belt-leather-normal.png` | 2.7 MB | 2048² |
| `he-wen-dark-brown-eyes.png` | 0.8 MB | 1024² |

**单张超过 6 MB 的图片，如果作为图片塞进 AI 请求，会直接被平台拒绝**
（报错：`请求参数无效，可能是图片过大（超过6M限制）`），整轮任务作废。
超过 6 MB 的有 4 张：皮肤基色、微观法线、布料法线、粗糙度。

## 要看纹理，请用 `preview/`

`preview/` 下是同一批贴图的缩略图，长边 1200 px、JPEG q82，**每张 10–220 KB**：

```
preview/he-wen-skin-base.jpg
preview/skin-authored-micro-normal.jpg
...
```

需要放大看细节时，用 PIL 裁一块局部另存，不要整张读入：

```python
from PIL import Image
Image.open('he-wen-skin-base.png').crop((1024, 1024, 2048, 2048)).resize((800, 800)).save('/tmp/skin-crop.jpg', quality=85)
```

## 前端引用情况

`march-world/engine/*.js` 与 `march-world/*.html` 都没有引用这些 PNG —— 运行时只用 GLB 内嵌贴图。
