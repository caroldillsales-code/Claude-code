const {chromium}=require('playwright');const {spawn}=require('child_process');
(async()=>{const FPS=30,DUR=25,NF=FPS*DUR;
const ff=spawn('ffmpeg',['-y','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-','-i','v1real/music.wav',
 '-c:v','libx264','-preset','slow','-crf','17','-pix_fmt','yuv420p','-profile:v','high','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart','v1real/reel_v1_real.mp4'],{cwd:__dirname,stdio:['pipe','ignore','inherit']});
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
await p.goto('file://'+__dirname+'/v1real/reel.html');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(800);
for(let i=0;i<NF;i++){await p.evaluate(t=>render(t),i/FPS);const buf=await p.screenshot({type:'jpeg',quality:95});
 if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r)); if(i%150==0)console.log('frame',i);}
ff.stdin.end();await b.close();ff.on('close',c=>console.log('ffmpeg done',c));})();
