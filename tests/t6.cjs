const { chromium } = require('playwright'); const http=require('http'),fs=require('fs');
const srv=require('./serve.cjs')(8983);
const swipe=(p,x1,x2,y=420)=>p.evaluate(({x1,x2,y})=>{const el=document.elementFromPoint(x1,y)||document.body;const mk=(t,x)=>new TouchEvent(t,{bubbles:true,touches:t==='touchend'?[]:[new Touch({identifier:7,target:el,clientX:x,clientY:y})],changedTouches:[new Touch({identifier:7,target:el,clientX:x,clientY:y})]});el.dispatchEvent(mk('touchstart',x1));el.dispatchEvent(mk('touchend',x2));},{x1,x2,y});
(async()=>{ const b=await chromium.launch(); let ok=0,bad=0; const T=(c,m)=>{c?ok++:bad++;console.log((c?'OK   ':'FOUT ')+m)};
 for(const sc of ['light','dark']){ const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,colorScheme:sc,hasTouch:true}); await c.route('**/fonts.g*/**',rt=>rt.abort()); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8983/'); await p.waitForTimeout(700); const tg=sc[0];
  await p.click('nav >> text=Instellingen'); await p.waitForTimeout(200); T(await p.locator('h1:text-is("Instellingen")').count()===1,`[${tg}] tab Instellingen`);
  await p.screenshot({path:`s_${tg}_1.png`,fullPage:true});
  await p.click('[aria-label="Bekijk je profiel"]'); await p.waitForTimeout(250); T(await p.locator('[role=region][aria-label=Profiel]').count()===1,'profielpagina'); await p.screenshot({path:`s_${tg}_2_profiel.png`,fullPage:false});
  if(sc==='light'){
   T(await p.locator('[aria-label=Terug]').count()===1,'terugpijl staat er');
   await p.click('[role=region] button:has-text("Profiel bewerken")'); await p.setInputFiles('#pf-photo',require('path').join(__dirname,'foto.png')); await p.waitForTimeout(500);
   T(await p.evaluate(()=>/^data:image\/jpeg/.test(JSON.parse(localStorage.getItem('gymmaat-nieuw.demo')).profiles['u-sam'].photo||'')),'profielfoto bewaard als vierkante jpeg');
   console.log('DBG', await p.locator('[aria-modal=true]').count(), await p.evaluate(()=>[...document.querySelectorAll('[role=dialog] button')].map(b=>b.textContent).join('|')), await p.evaluate(()=>document.querySelector('[role=status]')?.textContent));
   await p.locator('[role=dialog] button:has-text("Klaar")').click({timeout:5000}).catch(e=>console.log('KLIK',e.message.split('\n').slice(0,12).join(' // ')));  await p.waitForTimeout(200); T(await p.locator('[role=region][aria-label=Profiel] img').count()>=1,'foto zichtbaar op profiel'); await p.screenshot({path:'s_l_3_foto.png'});
   // vegen in het midden, naar rechts
   await swipe(p,150,300); await p.waitForTimeout(250); T(await p.locator('[role=region]').count()===0,'vegen naar rechts (midden) = terug');
   await p.locator('button:has-text("Delen en privacy")').click({timeout:5000}).catch(e=>console.log('KLIK2',e.message.split('\n').slice(0,14).join(' // '))); await p.waitForTimeout(200); await p.screenshot({path:'s_l_4_delen.png'});
   await p.uncheck('#share-badges'); await p.uncheck('#share-records'); await p.click('[role=region] button:has-text("Bekijk je profiel")'); await p.waitForTimeout(250);
   T(await p.locator('text=Badges deel je niet').count()===1,'eigen profiel toont wat je niet deelt'); await p.screenshot({path:'s_l_5_verborgen.png',fullPage:false});
   // vegen naar links
   await swipe(p,300,120); await p.waitForTimeout(250); T(await p.locator('[role=region][aria-label=Delen]').count()===1,'vegen naar links = één pagina terug');
   await p.click('[aria-label=Terug]'); await p.waitForTimeout(200);
   for(const t of ['Weergave','Rusttijd en progressie','Trainingsmaat','Gegevens en back-up','Account en afmelden','Over Gymmaat']){ await p.click(`button:has-text("${t}")`); await p.waitForTimeout(150); T(await p.locator('[role=region]').count()===1,`pagina ${t}`); await p.click('[aria-label=Terug]'); await p.waitForTimeout(120); }
   // profiel van maat: records niet gedeeld
   await p.click('nav >> text=Samen'); await p.click('[aria-label="Profiel van Noor"]'); await p.waitForTimeout(250);
   T(await p.locator('[role=region][aria-label=Noor]').count()===1,'profiel van maat'); T(await p.locator('[role=region] h3:text-is("Records")').count()===0,'maat deelt geen records: niet zichtbaar'); await p.screenshot({path:'s_l_6_noor.png',fullPage:false});
   // stepper vegen gaat niet terug
   await p.click('[aria-label=Terug]'); await p.click('nav >> text=Instellingen'); await p.click('button:has-text("Rusttijd en progressie")'); await p.waitForTimeout(200);
   const sb=await p.locator('#pf-rest').boundingBox(); await swipe(p,sb.x+10,sb.x+200,sb.y+10); await p.waitForTimeout(200); T(await p.locator('[role=region][aria-label=Trainen]').count()===1,'vegen over een stepper gaat niet terug');
   T(await p.evaluate(()=>document.documentElement.scrollWidth)<=390,'geen zijwaartse scroll');
  }
  T(!errs.length,`[${tg}] geen JS-fouten ${errs.join('|')}`); await c.close() }
 console.log(`\n${ok} OK, ${bad} FOUT`); await b.close(); srv.close() })();
