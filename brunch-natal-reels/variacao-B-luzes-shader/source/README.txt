Source da Variação B. Precisa de: ../../source/assets e ../../source/fonts (symlink como assets/ e fonts/), node_modules/three@0.160.0.
Render: python3 music.py && node render.js && ffmpeg -i video_only.mp4 -i music.wav -c:v copy -c:a aac -shortest reel_B.mp4

Versão FOTOS REAIS (reel2.html / main2.js / music2.py / render2.js):
- real_assets/ = derivados das fotos da cliente (upscale + unsharp das verticais, versões desfocadas, logo 600px).
- Render: python3 music2.py && node render2.js && ffmpeg -i video_only2.mp4 -i music2.wav -c:v libx264 -crf 20 -maxrate 9M -bufsize 18M -c:a aac -shortest brunch-natal-variacao-B-fotos-reais.mp4
