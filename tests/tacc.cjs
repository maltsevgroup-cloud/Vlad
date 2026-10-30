const { chromium } = require('playwright'); const http=require('http'),fs=require('fs');
const srv=require('./serve.cjs')(8987);
const AUDIT=()=>{ const L=c=>{const m=c.match(/[\d.]+/g);if(!m)return null;const [r,g,b,a]=m.map(Number);return {rgb:[r,g,b],a:a===undefined?1:a}};
  const lum=([r,g,b])=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
  const bgOf=el=>{let e=el;const stack=[];while(e){const c=L(getComputedStyle(e).backgroundColor);if(c&&c.a>0){stack.push(c);if(c.a>=1)break}e=e.parentElement}
    let col=[255,255,255]; if(stack.length&&stack[stack.length-1].a>=1)col=stack.pop().rgb; else col=L(getComputedStyle(document.body).backgroundColor).rgb;
    for(let i=stack.length-1;i>=0;i--){const s=stack[i];col=col.map((v,j)=>v*(1-s.a)+s.rgb[j]*s.a)} return col};
  const out={small:[],contrast:[],targets:[],unnamed:[]}; const seen=new Set();
  document.querySelectorAll('body *').forEach(el=>{ const r=el.getBoundingClientRect(); if(!r.width||!r.height)return; const cs=getComputedStyle(el); if(cs.visibility==='hidden'||+cs.opacity===0)return;
    const own=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()); 
    if(own){ const fs=parseFloat(cs.fontSize), fg=L(cs.color); if(fs<12) out.small.push(fs+'px "'+el.textContent.trim().slice(0,30)+'"');
      if(fg){ const bg=bgOf(el), fgc=fg.a<1?fg.rgb.map((v,j)=>v*fg.a+bg[j]*(1-fg.a)):fg.rgb, l1=lum(fgc),l2=lum(bg), cr=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
        const large=fs>=24||(fs>=18.66&&+cs.fontWeight>=700), need=large?3:4.5; const k=el.textContent.trim().slice(0,28);
        if(cr<need&&!seen.has(k)){seen.add(k);out.contrast.push(cr.toFixed(2)+' (nodig '+need+') '+fs+'px "'+k+'"')} } }
    if(el.matches('button,a,input,select,textarea,summary,[role=radio],[role=tab]')){ if((r.width<44||r.height<44)&&!(el.closest('input')))out.targets.push(Math.round(r.width)+'x'+Math.round(r.height)+' '+(el.getAttribute('aria-label')||el.textContent.trim().slice(0,24)||el.tagName));
      if(el.matches('button')&&!el.textContent.trim()&&!el.getAttribute('aria-label'))out.unnamed.push(el.outerHTML.slice(0,80)); } });
  return out };
(async()=>{ const b=await chromium.launch(); let tot=0;
 for(const acc of ['roze','blauw','grijs']) for(const sc of ['light','dark']){ const c=await b.newContext({viewport:{width:390,height:844},colorScheme:sc}); await c.route('**/fonts.g*/**',rt=>rt.abort());
  await c.addInitScript(a=>{try{localStorage.setItem('gymmaat-nieuw.accent',a)}catch(e){}},acc); const p=await c.newPage(); await p.goto('http://localhost:8987/'); await p.waitForTimeout(700);
  const res=[]; res.push(await p.evaluate(AUDIT));
  await p.click('nav >> text=Instellingen'); await p.waitForTimeout(200); res.push(await p.evaluate(AUDIT));
  await p.click('button:has-text("Weergave")'); await p.waitForTimeout(200); res.push(await p.evaluate(AUDIT)); await p.click('[aria-label=Terug]');
  await p.click('button[aria-label^="Chat met Noor"]'); await p.waitForTimeout(300); res.push(await p.evaluate(AUDIT)); await p.keyboard.press('Escape');
  await p.click('button[aria-label="Training starten"]'); await p.waitForTimeout(300); await p.locator('button[aria-label="Set 1 afvinken"]').first().click(); await p.waitForTimeout(200); res.push(await p.evaluate(AUDIT));
  const cs=[...new Set(res.flatMap(r=>r.contrast))]; tot+=cs.length; const tc=await p.evaluate(()=>document.querySelector('meta[name=theme-color]')?.content);
  console.log(acc,sc,'contrastproblemen:',cs.length, cs.slice(0,4).join(' | '),'statusbalk',tc); await c.close() }
 console.log('totaal',tot); await b.close(); srv.close() })();
