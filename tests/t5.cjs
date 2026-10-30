const { chromium } = require('playwright'); const http=require('http'),fs=require('fs');
const srv=require('./serve.cjs')(8982);
(async()=>{ const b=await chromium.launch(); let ok=0,bad=0; const T=(c,m)=>{c?ok++:bad++;console.log((c?'OK   ':'FOUT ')+m)};
 for(const sc of ['light','dark']){ const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,colorScheme:sc,hasTouch:true}); await c.route('**/fonts.g*/**',rt=>rt.abort()); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8982/'); await p.waitForTimeout(800); const head=p.locator('button[aria-label^="Chat met Noor"]');
  T(await head.count()===1,`[${sc}] chatknop zichtbaar`); T(/1 ongelezen bericht/.test(await head.getAttribute('aria-label')),'1 ongelezen bij start');
  T(await p.locator('button[aria-label="Training starten"] span').count()===0,'geen 0/20 op trainingsknop');
  T(await p.locator('nav [aria-label="1 ongelezen"]').count()===1,'Samen in menu toont 1');
  await p.screenshot({path:`m_${sc[0]}_1.png`});
  if(sc==='light'){
   await p.waitForTimeout(20500); T(/2 ongelezen/.test(await head.getAttribute('aria-label')),'nieuw bericht: teller naar 2');
   T(await p.locator('button[aria-label^="Nieuw bericht van Noor"]').count()===1,'ballon met voorbeeld van het bericht'); await p.screenshot({path:'m_l_2_ballon.png'});
   await head.click(); await p.waitForTimeout(300); T(await p.locator('[role=dialog][aria-label="Chat met Noor"]').count()===1,'chat opent als venster');
   T(await p.locator('nav [aria-label$="ongelezen"]').count()===0,'teller weg na openen');
   await p.fill('#chat-pop-text','Ik kom eraan!'); await p.press('#chat-pop-text','Enter'); await p.waitForTimeout(1800);
   T(await p.locator('[aria-label="Noor typt"]').count()===1,'Noor typt…'); await p.screenshot({path:'m_l_3_typt.png'});
   await p.waitForTimeout(3200); T(await p.locator('text=Gezien door Noor').count()===1,'gezien na antwoord'); await p.screenshot({path:'m_l_4_chat.png'});
   await p.keyboard.press('Escape'); await p.waitForTimeout(200); T(!/ongelezen/.test(await head.getAttribute('aria-label')),'gelezen terwijl venster open was');
   const bx=await head.boundingBox(); await p.mouse.move(bx.x+30,bx.y+30); await p.mouse.down(); await p.mouse.move(150,500,{steps:5}); await p.mouse.move(40,450,{steps:5}); await p.mouse.up(); await p.waitForTimeout(400);
   const nb=await head.boundingBox(); T(nb.x<60,'chatknop versleept naar links ('+Math.round(nb.x)+')'); await p.screenshot({path:'m_l_5_links.png'});
   T(await p.locator('[role=dialog]').count()===0,'slepen opent de chat niet');
   await p.click('button[aria-label="Training starten"]'); await p.waitForTimeout(300); T(await head.count()===1,'chatknop ook tijdens training'); await p.screenshot({path:'m_l_6_training.png'});
  }
  T(!errs.length,`[${sc}] geen JS-fouten ${errs.join('|')}`); await c.close() }
 console.log(`\n${ok} OK, ${bad} FOUT`); await b.close(); srv.close() })();
