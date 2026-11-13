# BaiLian 摄影拼贴素材

本目录包含本次通过内置 imagegen 生成的两份透明资产，未使用参考刊物的照片或人物素材。原始输出直接复制到项目中，保留 alpha；人物是生成的示意角色。

| 文件 | 尺寸 | 用途 |
|---|---|---|
| reader-at-desk.png | 1254 × 1254，透明 PNG | 男生、桌面和静止书本主组；书页纹理同时用于 CSS 翻动层 |
| reading-cup.png | 1254 × 1254，透明 PNG | 独立咖啡杯；蒸汽另以 SVG 绘制 |

## 主体生成提示词

Use case: photorealistic-natural. Create ONE original premium editorial paper-collage cutout asset for the cover of a literary/learning magazine, with true transparent background. An adult East Asian man in his late twenties with natural short black hair, wearing a textured light gray knit sweater, seated at a modest wooden desk, leaning forward slightly and looking down attentively at an open book. Front three-quarter view with his whole head, torso, forearms, hands, chair edge and tabletop visible, natural anatomy. The scene feels quiet, intelligent, candid, unposed. Refined grayscale photographic textures, soft daylight from upper left, thin irregular warm-white torn-paper outline around the outer silhouette. The tabletop is seen from slightly above. An open cream-colored book lies centered at the front of the desk, unobscured by his hands, symmetrically readable as two open pages with its central spine approximately vertical in the image; his hands rest to its left and right, leaving the page area completely free so we can overlay independently animated paper leaves in HTML. Keep the book mostly blank with very faint illegible ink strokes, no readable text. Restrained deep ink-blue cloth binding on the book is the only saturated color. NO cup, no plant, no extra books, no room background, no colored background circle, no typography, no lettering, no logo, no watermark. The entire man-desk-book silhouette fits comfortably in a square canvas with a small transparent margin, no cropped head or fingers. Sophisticated real photography collage, excellent facial and hand details, realistic tactile fabric and wood, NOT cartoon, NOT vector. Output transparent alpha, not a checkerboard drawing.

## 咖啡杯生成提示词

Use case: photorealistic-natural. One isolated original editorial paper-collage cutout: a small white ceramic coffee cup on a thin saucer, viewed slightly from above, handle on the right, dark coffee visible, a subtle dark ink-blue stripe around the cup. Refined grayscale photography with only the restrained ink-blue stripe in color. Natural soft daylight from upper left. Very thin irregular warm-white paper cut edge, realistic ceramic and fine paper texture, subtle contact shadow attached to the saucer. Entire cup and saucer fully inside frame with generous true transparent alpha margin. No steam (steam will be animated separately), no desk, no background, no extra objects, no letters, no logo, no watermark. Not a cartoon or vector. Square asset intended as a small independently movable object in a sophisticated reading magazine cover.

## 分层参数

主图中的书脊约位于 x=49.8%，纸页顶端约 y=79.3%；动画纸叶框为主图宽度的 26.5%、高度的 14.2%。CSS 背景从同一主图呈现对应纸页纹理，因此不会用纯白占位片覆盖暖色纸页。三个独立纸叶以 9 秒为总周期、错开 3 秒启动；人物不漂移。咖啡杯以 6.7 秒轻微运动，蒸汽以 3.8 秒独立变化。

这些坐标针对本次资产，换图后必须重新校准。不要把它们作为所有人物图的通用坐标。图片需要独立编辑时使用图像工具；布局、纹理显示窗口和动效保留在 HTML/CSS 中。
