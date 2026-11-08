const {chromium}=require('playwright');const {spawn}=require('child_process');
(async()=>{const FPS=30,DUR=27.5,NF=Math.round(FPS*DUR);
const srv=spawn('python3',['-m','http.server','8791','--bind','127.0.0.1'],{cwd:__dirname,stdio:'ignore'});await new Promise(r=>setTimeout(r,800));
const ff=spawn('ffmpeg',['-y','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','slow','-crf','17','-pix_fmt','yuv420p','-profile:v','high','video_only.mp4'],{cwd:__dirname,stdio:['pipe','ignore','ignore']});
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:1080,height:1920}});
p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://127.0.0.1:8791/reel.html');await p.waitForFunction(()=>window.ready===true,null,{timeout:60000});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(500);
for(let i=0;i<NF;i++){await p.evaluate(t=>render(t),i/FPS);const buf=await p.screenshot({type:'jpeg',quality:95});
 if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r)); if(i%75==0)console.log('frame',i,new Date().toISOString());}
ff.stdin.end();ff.on('close',c=>{console.log('ffmpeg done',c);srv.kill();});await b.close();})();
