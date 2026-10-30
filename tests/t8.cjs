const { chromium } = require('playwright'); const http=require('http'),fs=require('fs');
const srv=require('./serve.cjs')(8990);
(async()=>{ const b=await chromium.launch(); let ok=0,bad=0; const T=(c,m)=>{c?ok++:bad++;console.log((c?'OK   ':'FOUT ')+m)};
 for(const sc of ['light','dark']){ const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,colorScheme:sc,hasTouch:true}); await c.route('**/fonts.g*/**',rt=>rt.abort()); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8990/'); await p.waitForTimeout(700); const tg=sc[0];
  await p.click('nav >> text=Instellingen'); await p.waitForTimeout(250); await p.screenshot({path:`g_${tg}_1_inst.png`});
  T(await p.locator('section[aria-label="Je profiel"] h2:text-is("Sam")').count()===1&&await p.locator('section[aria-label="Je profiel"] button:has-text("Profiel bewerken")').count()===1,`[${tg}] profielkaart bovenaan`);
  T(await p.locator('[role=switch]').count()===4,'4 schakelaars');
  if(sc==='light'){
   await p.fill('#set-q','thema'); await p.waitForTimeout(150); T(await p.locator('section:not([aria-label])').count()===1,'zoeken filtert'); await p.screenshot({path:'g_l_2_zoek.png'}); await p.fill('#set-q','');
   const before=await p.evaluate(()=>JSON.parse(localStorage.getItem('gymmaat-nieuw.demo')).profiles['u-sam'].sound);
   await p.click('#sw-sound'); await p.waitForTimeout(100); T(await p.evaluate(()=>JSON.parse(localStorage.getItem('gymmaat-nieuw.demo')).profiles['u-sam'].sound)===false,'schakelaar geluid bewaard');
   // veeglijn aanzetten
   await p.click('#sw-nav'); await p.waitForTimeout(250); T(await p.locator('nav[aria-label=Hoofdmenu]').count()===0,'menu weg'); 
   const bar=p.locator('[aria-label^="Pagina\'s: tik"]'); T(await bar.count()===1,'veeglijn zichtbaar'); await p.screenshot({path:'g_l_3_lijn.png'});
   const bb=await bar.boundingBox(); const swipe=async(dx)=>{ await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2); await p.mouse.down(); await p.mouse.move(bb.x+bb.width/2+dx,bb.y+bb.height/2,{steps:6}); await p.mouse.up(); await p.waitForTimeout(250); };
   await swipe(-120); T(await p.locator('h1:text-is("Home")').count()+await p.locator('text=GOEDENACHT').count()+await p.locator('h1').filter({hasText:/GOED/i}).count()>0,'veeg links: volgende pagina (Home)'); await p.screenshot({path:'g_l_4_home.png'});
   await swipe(-120); T(await p.locator('h1:text-is("Schema")').count()===1,'veeg links: Schema');
   await swipe(120); T(await p.locator('h1').filter({hasText:/GOED/i}).count()===1,'veeg rechts: terug naar Home');
   await bar.click(); await p.waitForTimeout(250); T(await p.locator('[role=dialog][aria-label="Pagina\'s"]').count()===1,'tik: overzicht van pagina\'s'); await p.screenshot({path:'g_l_5_overzicht.png'});
   await p.click('[role=dialog] button:has-text("Badges")'); await p.waitForTimeout(250); T(await p.locator('[role=region][aria-label=Badges]').count()===1,'naar Badges via overzicht');
   await bar.click(); await p.click('[role=dialog] button:has-text("Start training")'); await p.waitForTimeout(300); T(await p.locator('[role=dialog][aria-label^="Training"]').count()===1,'training starten via overzicht');
   await p.keyboard.press('Escape'); await p.waitForTimeout(200);
   await p.evaluate(()=>localStorage.setItem('gymmaat-nieuw.nav','menu'));
  }
  T(!errs.length,`[${tg}] geen JS-fouten ${errs.join('|')}`); await c.close() }
 console.log(`\n${ok} OK, ${bad} FOUT`); await b.close(); srv.close() })();
