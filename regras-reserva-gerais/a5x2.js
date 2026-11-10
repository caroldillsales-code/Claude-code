const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();
const p=await b.newPage({viewport:{width:1754,height:1240},deviceScaleFactor:2});
await p.goto('file://'+__dirname+'/a5x2.html');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(400);
await p.screenshot({path:__dirname+'/a5x2.png'});
await p.pdf({path:__dirname+'/a5x2.pdf',width:'297mm',height:'210mm',printBackground:true,scale:1123/1754,margin:{top:0,right:0,bottom:0,left:0},pageRanges:'1'});
await b.close()})();
