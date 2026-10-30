const { chromium } = require('playwright'); const http=require('http'),fs=require('fs');
const srv=require('./serve.cjs')(8991);
(async()=>{ const b=await chromium.launch(); const out=[];
 for(const [acc,sc] of [['roze','light'],['blauw','dark']]){ const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,colorScheme:sc,hasTouch:true}); await c.route('**/fonts.g*/**',rt=>rt.abort());
  await c.addInitScript(a=>{try{localStorage.setItem('gymmaat-nieuw.accent',a);localStorage.setItem('gymmaat-nieuw.nav','lijn')}catch(e){}},acc); const p=await c.newPage(); await p.goto('http://localhost:8991/'); await p.waitForTimeout(700);
  await p.mouse.wheel(0,400); await p.waitForTimeout(1500);
  const head=await p.locator('button[aria-label^="Chat met"]').boundingBox(); const line=await p.evaluate(()=>{const s=document.querySelector('[aria-label^="Pagina\'s: tik"] span');const r=s.getBoundingClientRect();return {w:r.width,h:r.height,bg:getComputedStyle(s).backgroundColor,op:getComputedStyle(s).opacity}});
  console.log(acc,sc,'chatknop x',Math.round(head.x),'rechterrand',Math.round(head.x+head.width),'lijn',JSON.stringify(line));
  await p.screenshot({path:`ln_${acc}_${sc}.png`}); out.push(`ln_${acc}_${sc}.png`); await c.close() }
 await b.close(); srv.close() })();
