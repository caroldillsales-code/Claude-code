const {chromium}=require('playwright');const {spawn}=require('child_process');
(async()=>{const srv=spawn('python3',['-m','http.server','8790','--bind','127.0.0.1'],{cwd:__dirname,stdio:'ignore'});await new Promise(r=>setTimeout(r,800));
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:1080,height:1920}});
p.on('console',m=>console.log('console',m.text()));p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://127.0.0.1:8790/reel.html');await p.waitForFunction(()=>window.ready===true,null,{timeout:60000});await p.evaluate(()=>document.fonts.ready);
const ts=process.argv.slice(2);let t0=Date.now();
for(const t of ts){await p.evaluate(t=>render(t),Number(t));await p.screenshot({path:__dirname+`/prev/f_${t}.jpg`,type:'jpeg',quality:70});}
console.log('ms/frame',(Date.now()-t0)/ts.length);
await b.close();srv.kill();})();
