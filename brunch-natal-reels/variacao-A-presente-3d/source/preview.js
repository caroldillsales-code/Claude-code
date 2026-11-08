const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:1080,height:1920}});
p.on('console',m=>console.log('console',m.text()));p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://localhost:8765/varA/index.html');await p.waitForFunction(()=>window.READY===true,null,{timeout:120000});
const ts=process.argv.slice(2).map(Number);
for(const t of ts){const s=Date.now();await p.evaluate(t=>render(t),t);await p.screenshot({path:__dirname+`/prev/f_${t}.jpg`,type:'jpeg',quality:70});console.log(t,Date.now()-s,'ms');}
await b.close();})();
