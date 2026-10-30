const { chromium } = require('playwright'); const http=require('http'),fs=require('fs');
const srv=require('./serve.cjs')(8992);
(async()=>{ const b=await chromium.launch(); let ok=0,bad=0; const T=(c,m)=>{c?ok++:bad++;console.log((c?'OK   ':'FOUT ')+m)};
 for(const sc of ['light','dark']){ const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,colorScheme:sc}); await c.route('**/fonts.g*/**',rt=>rt.abort()); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8992/'); await p.waitForTimeout(700);
  // zonder sets afronden: geen streak-venster
  await p.click('button[aria-label="Training starten"]'); await p.waitForTimeout(300); await p.click('text=Training afronden zonder alles'); await p.waitForTimeout(200); await p.click('button:has-text("Opslaan")'); await p.waitForTimeout(800);
  T(await p.locator('[role=dialog][aria-label$="op rij"]').count()===0,`[${sc[0]}] geen streak-venster zonder gedane sets`);
  // deels: één set
  await p.click('button[aria-label="Training starten"]'); await p.waitForTimeout(300);
  T(await p.locator('[role=dialog][aria-label^="Training"]').count()===1,'nieuwe training open');
  await p.locator('button[aria-label="Set 1 afvinken"]').first().click(); await p.waitForTimeout(200); const v=p.locator('[role=timer] >> text=Verder'); if(await v.count()) await v.click();
  await p.click('text=Training afronden zonder alles'); await p.waitForTimeout(200); await p.click('button:has-text("Opslaan")'); await p.waitForTimeout(800);
  T(await p.locator('[role=dialog][aria-label$="op rij"]').count()===1,'streak-venster na deels gedane training');
  T(await p.locator('[role=dialog] ol[aria-label="Deze week"] li').count()===7,'week met 7 dagen');
  await p.screenshot({path:`sp_${sc}.png`});
  await p.click('[role=dialog] button:has-text("Verder")'); await p.waitForTimeout(400);
  T(!errs.length,`[${sc[0]}] geen JS-fouten ${errs.join('|')}`); await c.close() }
 console.log(`\n${ok} OK, ${bad} FOUT`); await b.close(); srv.close() })();
