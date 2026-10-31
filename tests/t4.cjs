const { chromium } = require('playwright'); const http=require('http'),fs=require('fs');
const srv=require('./serve.cjs')(8981);
(async()=>{ const b=await chromium.launch(); let ok=0,bad=0; const T=(c,m)=>{c?ok++:bad++;console.log((c?'OK   ':'FOUT ')+m)};
 for(const sc of ['light','dark']){ const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,colorScheme:sc,hasTouch:true}); await c.route('**/fonts.g*/**',rt=>rt.abort()); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8981/'); await p.waitForTimeout(800); const tg=sc[0];
  await p.screenshot({path:`h_${tg}_1.png`,fullPage:true});
  if(sc==='light'){
   T(await p.locator('header button[aria-label^="Streak:"]').count()===1,'streak bovenaan naast profiel');
   T(await p.evaluate(()=>{const t=document.querySelector('main button[aria-expanded]'),s=document.querySelector('section[aria-label=Streak]');return !!(t.compareDocumentPosition(s)&Node.DOCUMENT_POSITION_FOLLOWING)}),'training staat boven de week');
   T(await p.locator('header >> text=GYMMAAT').count()===0,'geen logo bovenaan');
   T(await p.locator('section[aria-label=Streak] [aria-label^="Deze week"] button').count()===7,'weekstrook in het streakblok');
   T(await p.locator('main >> text=/Records|Gewicht/').count()===0,'geen records en gewicht op Home');
   T(await p.locator('main >> text=/\\d kg/').count()===0,'geen gewichten op Home');
   T(await p.locator('section[aria-label=Badges] button').count()===4,'3 badges bijna binnen + Alle');
   const exb=p.locator('button[aria-expanded]:has-text("oefeningen")'); T(await exb.getAttribute('aria-expanded')==='false','oefeningen standaard dicht');
   await exb.click(); T(await p.locator('main li >> text=Squat').count()===1,'oefeningen klappen open'); await exb.click();
   T(/Noor traint nu, oefening \d+ van \d+ gedaan/.test(await p.locator('header button[aria-label^="Noor"]').getAttribute('aria-label')),'Noor traint: in de kopregel met oefeningen');
   // dag aantikken: een afgelopen dag met training
   const past=await p.evaluate(()=>{const b=[...document.querySelectorAll('[aria-label^="Deze week"] button')].find(x=>/getraind/.test(x.getAttribute('aria-label')));b&&b.click();return b&&b.getAttribute('aria-label')});
   await p.waitForTimeout(300); T(past&&await p.locator('[role=dialog] >> text=Training openen').count()===1,'afgelopen dag toont training: '+past);
   await p.screenshot({path:'h_l_2_dag.png'});
   // venster naar beneden vegen
   const box=await p.locator('[role=dialog] .rounded-t-\\[22px\\]').boundingBox();
   await p.evaluate(({x,y})=>{const el=document.querySelector('[role=dialog] .rounded-t-\\[22px\\]');const mk=(t,yy)=>new TouchEvent(t,{bubbles:true,touches:t==='touchend'?[]:[new Touch({identifier:1,target:el,clientX:x,clientY:yy})],changedTouches:[new Touch({identifier:1,target:el,clientX:x,clientY:yy})]});el.dispatchEvent(mk('touchstart',y));el.dispatchEvent(mk('touchmove',y+60));el.dispatchEvent(mk('touchmove',y+160));el.dispatchEvent(mk('touchend',y+160));},{x:box.x+100,y:box.y+20});
   await p.waitForTimeout(300); T(await p.locator('[aria-modal=true]').count()===0,'venster sluit door naar beneden te vegen');
   // toekomstige/rust dag
   const fut=await p.evaluate(()=>{const b=[...document.querySelectorAll('[aria-label^="Deze week"] button')].reverse().find(x=>/gepland|rustdag/.test(x.getAttribute('aria-label')));b.click();return b.getAttribute('aria-label')}); await p.waitForTimeout(250);
   T(await p.locator('[role=dialog]').count()===1,'komende dag opent: '+fut); await p.screenshot({path:'h_l_3_toekomst.png'}); await p.keyboard.press('Escape');
   // streak pauze
   await p.click('header button[aria-label^="Streak:"]'); await p.waitForTimeout(200); await p.screenshot({path:'h_l_4_streak.png'});
   await p.click('button:has-text("Ik ben ziek voor de training")'); await p.waitForTimeout(250); T(await p.locator('text=Ziek gemeld. Je reeks blijft staan').count()===1,'ziek gemeld voor één training');
   T(await p.evaluate(()=>{const d=JSON.parse(localStorage.getItem('gymmaat-nieuw.demo'));return d.pauses.length===1&&d.pauses[0].from===d.pauses[0].to}),'ziekmelding geldt voor één datum');
   await p.click('header button[aria-label^="Streak:"]'); await p.click('button:has-text("Toch niet ziek")'); await p.waitForTimeout(200); T(await p.locator('text=Ziek gemeld. Je reeks blijft staan').count()===0,'ziekmelding ingetrokken');
   // badge
   await p.locator('section[aria-label=Badges] button').nth(1).click(); await p.waitForTimeout(200); T(await p.locator('[role=dialog] ol[aria-label=Levels] li').count()===4,'badge toont 4 levels'); await p.screenshot({path:'h_l_5_badge.png'}); await p.keyboard.press('Escape');
   await p.click('section[aria-label=Badges] button:has-text("Alle")'); await p.waitForTimeout(300); T(await p.locator('[role=region][aria-label=Badges]').count()===1,'badgepagina'); await p.screenshot({path:'h_l_6_badges.png',fullPage:false});
   T(await p.locator('text=Geheime badge').count()>=1,'geheime badges als vraagteken');
   // terugvegen
   await p.evaluate(()=>{const mk=(t,x)=>new TouchEvent(t,{bubbles:true,touches:t==='touchend'?[]:[new Touch({identifier:2,target:document.body,clientX:x,clientY:400})],changedTouches:[new Touch({identifier:2,target:document.body,clientX:x,clientY:400})]});window.dispatchEvent(mk('touchstart',8));window.dispatchEvent(mk('touchend',160));});
   await p.waitForTimeout(250); T(await p.locator('[role=region][aria-label=Badges]').count()===0,'terugvegen sluit pagina');
   // voortgang via profiel
   await p.click('nav >> text=Instellingen'); await p.click('button:has-text("Voortgang")'); await p.waitForTimeout(300); T(await p.locator('[role=region][aria-label=Voortgang]').count()===1,'Voortgang onder Instellingen'); await p.screenshot({path:'h_l_7_voortgang.png'});
   T(await p.evaluate(()=>document.documentElement.scrollWidth)<=390,'geen zijwaartse scroll');
   await p.click('[aria-label=Terug]'); await p.waitForTimeout(200);
   // middenknop
   await p.click('button[aria-label="Training starten"], button[aria-label="Training verderzetten"]'); await p.waitForTimeout(400);
   T(await p.locator('[role=dialog][aria-label^="Training"]').count()===1,'middenknop start training'); await p.screenshot({path:'h_l_8_training.png'});
   await p.evaluate(()=>{const mk=(t,x)=>new TouchEvent(t,{bubbles:true,touches:t==='touchend'?[]:[new Touch({identifier:3,target:document.body,clientX:x,clientY:400})],changedTouches:[new Touch({identifier:3,target:document.body,clientX:x,clientY:400})]});window.dispatchEvent(mk('touchstart',6));window.dispatchEvent(mk('touchend',170));});
   await p.waitForTimeout(250); T(await p.locator('[role=dialog][aria-label^="Training"]').count()===0,'terugvegen uit training');
   T(await p.locator('button[aria-label="Training verderzetten"]').count()===1,'middenknop toont lopende training');
   await p.click('nav >> text=Home'); await p.waitForTimeout(200); await p.screenshot({path:'h_l_9_home_bezig.png'});
   // nieuwe gebruiker: eerste training geeft een badge
   await p.click('nav >> text=Instellingen'); await p.click('button:has-text("Account en afmelden")'); await p.click('[role=region] button:has-text("Afmelden")'); await p.fill('#login-email','test@voorbeeld.be'); await p.click('text=Stuur inlogcode'); await p.fill('#login-code','123456'); await p.waitForTimeout(300);
   await p.fill('#ob-name','Lien'); for(let k=0;k<5;k++){ await p.click('button:has-text("Verder")'); await p.waitForTimeout(80); } await p.click('text=Start met dit schema'); await p.waitForTimeout(400);
   await p.screenshot({path:'h_l_11_nieuw_home.png',fullPage:true});
   await p.click('button[aria-label="Training starten"]'); await p.waitForTimeout(300);
   for(let k=0;k<60;k++){ const bt=p.locator('button[aria-label$="afvinken"]:not([disabled])').first(); if(!await bt.count())break; await bt.click(); await p.waitForTimeout(50);
     const q=p.locator('[aria-modal=true] button:has-text("Goed")'); if(await q.count()) await q.click(); }
   console.log('nog af te vinken:', await p.locator('button[aria-label$="afvinken"]').count(), await p.evaluate(()=>{const d=JSON.parse(localStorage.getItem('gymmaat-nieuw.demo'));const s=Object.values(d.sessions)[0];return s.items.map(i=>i.exId+':'+i.sets.filter(z=>z.done&&z.r>0).length+'/'+i.sets.length).join(' ')}));
   await p.locator('button:has-text("Training afronden")').first().click(); await p.waitForTimeout(250); await p.click('[aria-modal=true] button[aria-pressed]:text-is("5")'); await p.click('button:has-text("Opslaan")'); await p.waitForTimeout(800);
   T(await p.locator('[role=dialog][aria-label$="op rij"]').count()===1,'streak-venster na training'); await p.screenshot({path:'h_l_streakpop.png'}); await p.click('[role=dialog] button:has-text("Verder")'); await p.waitForTimeout(700);
   T(await p.locator('[role=dialog][aria-label="Nieuwe badge"]').count()===1,'nieuwe badge gevierd na eerste training'); await p.screenshot({path:'h_l_10_nieuw.png'});
  }
  T(!errs.length,`[${tg}] geen JS-fouten ${errs.join('|')}`); await c.close() }
 const p=await b.newPage({viewport:{width:320,height:640}}); await p.goto('http://localhost:8981/'); await p.waitForTimeout(600); T(await p.evaluate(()=>document.documentElement.scrollWidth)<=320,'320px past');
 console.log(`\n${ok} OK, ${bad} FOUT`); await b.close(); srv.close() })();
