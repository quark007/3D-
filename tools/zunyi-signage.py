"""Build shared artwork for the street's period-style notices."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
from random import Random

root = Path(__file__).resolve().parents[1]
target = root / 'assets/clean-kit/zunyi/notices.jpg'
font_dir = Path('C:/Windows/Fonts')
font = ImageFont.truetype(str(font_dir / 'simkai.ttf'), 52)
small = ImageFont.truetype(str(font_dir / 'simkai.ttf'), 23)
rng = Random(1935)
image = Image.new('RGB', (512, 256))
draw = ImageDraw.Draw(image)
for i in range(3):
    left = i * 170 + 5
    draw.rounded_rectangle((left, 17, left+158, 236), 7, fill=(161,143,110), outline=(104,87,64), width=6)
    for k in range(3400):
        v = rng.randrange(112,173)
        draw.point((rng.randrange(left+6,left+152),rng.randrange(23,231)), fill=(v,v-13,v-35))
    for j,line in enumerate([('工農','紅軍'),('擴大','紅軍'),('軍民','團結')][i]):
        draw.text((left+78+rng.randint(-4,4),58+j*60),line,font=font,anchor='mt',fill=(90,51,40),stroke_width=0)
    draw.line((left+23,191,left+136,188),fill=(125,103,77),width=2)
    draw.text((left+78,200),'布告',font=small,anchor='mt',fill=(96,75,58))
image.filter(ImageFilter.GaussianBlur(.32)).save(target,quality=88,optimize=True)
