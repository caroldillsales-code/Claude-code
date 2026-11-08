Source da Variação B. Precisa de: ../../source/assets e ../../source/fonts (symlink como assets/ e fonts/), node_modules/three@0.160.0.
Render: python3 music.py && node render.js && ffmpeg -i video_only.mp4 -i music.wav -c:v copy -c:a aac -shortest reel_B.mp4
