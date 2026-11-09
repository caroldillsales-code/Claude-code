const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
await p.goto('file://'+__dirname+'/regras.html');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(400);
console.log(await p.evaluate(()=>document.querySelector('.wrap').getBoundingClientRect().bottom));
await p.screenshot({path:__dirname+'/regras.png'});await b.close()})();
