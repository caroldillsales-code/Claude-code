const {chromium}=require('playwright');const {spawn}=require('child_process');
(async()=>{const FPS=30,DUR=25,NF=FPS*DUR;
const ff=spawn('ffmpeg',['-y','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-','-i','audio.wav',
 '-c:v','libx264','-preset','slow','-crf','18','-pix_fmt','yuv420p','-profile:v','high','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart','varA.mp4'],{cwd:__dirname,stdio:['pipe','ignore','ignore']});
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:1080,height:1920}});
p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://localhost:8765/varA/index.html');await p.waitForFunction(()=>window.READY===true,null,{timeout:120000});
for(let i=0;i<NF;i++){await p.evaluate(t=>render(t),i/FPS);const buf=await p.screenshot({type:'jpeg',quality:94});
 if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r)); if(i%75==0)console.log('frame',i,new Date().toISOString());}
ff.stdin.end();await b.close();ff.on('close',c=>console.log('ffmpeg done',c));})();
