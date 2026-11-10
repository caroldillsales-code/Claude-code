const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();
const p=await b.newPage({viewport:{width:1240,height:1754},deviceScaleFactor:2});
await p.goto('file://'+__dirname+'/a4.html');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(400);
console.log(await p.evaluate(()=>{const w=document.querySelector('.wrap');return [...w.children].map(c=>c.getBoundingClientRect()).reduce((m,r)=>[Math.min(m[0],r.top),Math.max(m[1],r.bottom)],[9999,0])}));
await p.screenshot({path:__dirname+'/a4.png'});
await p.pdf({path:__dirname+'/a4.pdf',width:'210mm',height:'297mm',printBackground:true,scale:794/1240,margin:{top:0,right:0,bottom:0,left:0},pageRanges:'1'});
await b.close()})();
