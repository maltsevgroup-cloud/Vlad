const { chromium } = require('playwright'); const http=require('http'),fs=require('fs');
const srv=require('./serve.cjs')(8989);
(async()=>{ const b=await chromium.launch(); let ok=0,bad=0; const T=(c,m)=>{c?ok++:bad++;console.log((c?'OK   ':'FOUT ')+m)};
 const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true}); await c.route('**/fonts.g*/**',rt=>rt.abort()); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8989/'); await p.waitForTimeout(700); await p.screenshot({path:'p_1home.png'});
 const bw=()=>p.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('gymmaat-nieuw.demo')).bw).length);
 await p.click('nav >> text=Instellingen'); await p.click('button:has-text("Voortgang")'); await p.click('[role=region] [role=radio]:has-text("Lichaamsgewicht")'); await p.waitForTimeout(200);
 const n0=await bw(); await p.locator('button[aria-label^="Meting van"]').first().click(); await p.waitForTimeout(200); T(await bw()===n0-1,'meting gewist');
 T(await p.locator('button:text-is("Ongedaan maken")').count()===1,'melding met Ongedaan maken'); await p.screenshot({path:'p_2undo.png'});
 await p.click('button:text-is("Ongedaan maken")'); await p.waitForTimeout(200); T(await bw()===n0,'meting hersteld');
 await p.click('[aria-label=Terug]'); await p.click('nav >> text=Schema'); await p.waitForTimeout(200);
 T(await p.locator('button[aria-label$="omhoog"]').count()===0,'schema rustig: geen pijltjes'); await p.screenshot({path:'p_3schema.png'});
 await p.click('button:has-text("Volgorde")'); await p.waitForTimeout(150); T(await p.locator('button[aria-label$="omhoog"]').count()>3,'volgorde-modus toont pijltjes'); await p.screenshot({path:'p_4volgorde.png'});
 const first=await p.locator('ul li b').first().textContent(); await p.locator('button[aria-label$="omlaag"]').first().click(); await p.waitForTimeout(150); T((await p.locator('ul li b').nth(1).textContent())===first,'oefening verplaatst');
 await p.click('button:has-text("Klaar")');
 // chatknop schuift opzij bij scrollen
 await p.click('nav >> text=Home'); await p.mouse.move(150,400); await p.mouse.wheel(0,300); await p.waitForTimeout(120);
 await p.evaluate(()=>window.scrollTo(0,0)); await p.click('button[aria-label="Training starten"]'); await p.waitForTimeout(300); await p.locator('button[aria-label="Set 1 afvinken"]').first().click(); await p.waitForTimeout(300); await p.screenshot({path:'p_6training.png'});
 T(!errs.length,'geen JS-fouten '+errs.join('|')); console.log(`\n${ok} OK, ${bad} FOUT`); await b.close(); srv.close() })();
