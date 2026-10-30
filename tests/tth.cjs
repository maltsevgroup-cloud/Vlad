const { chromium } = require('playwright'); const http=require('http'),fs=require('fs');
const srv=require('./serve.cjs')(8985);
(async()=>{ const b=await chromium.launch(); const shots=[];
 for(const [acc,sc] of [['roze','light'],['roze','dark'],['grijs','light'],['grijs','dark']]){ const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,colorScheme:sc}); await c.route('**/fonts.g*/**',rt=>rt.abort());
  await c.addInitScript(a=>{try{localStorage.setItem('gymmaat-nieuw.accent',a)}catch(e){}},acc); const p=await c.newPage(); await p.goto('http://localhost:8985/'); await p.waitForTimeout(700);
  await p.screenshot({path:`th_${acc}_${sc}.png`}); shots.push(`th_${acc}_${sc}.png`);
  if(acc==='roze'&&sc==='light'){ await p.click('button[aria-label^="Chat met Noor"]'); await p.waitForTimeout(300); await p.fill('#chat-pop-text','Test'); const w=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,fs:getComputedStyle(document.getElementById('chat-pop-text')).fontSize})); console.log('chat',w); await p.screenshot({path:'th_chat.png'}); shots.push('th_chat.png');
    await p.keyboard.press('Escape'); await p.click('nav >> text=Instellingen'); await p.click('button:has-text("Weergave")'); await p.waitForTimeout(250); await p.screenshot({path:'th_weergave.png'}); shots.push('th_weergave.png'); }
  await c.close() }
 await b.close(); srv.close() })();
