// app.js - AI-ready VidGen frontend (proxy-first, optional in-browser key)
const $ = (s,r=document)=> r.querySelector(s);
const $$ = (s,r=document)=> Array.from((r||document).querySelectorAll(s));

// DOM
const aiPrompt = $('#aiPrompt'), tone = $('#tone'), genCopy = $('#genCopy'), genImage = $('#genImage');
const titleIn = $('#title'), descIn = $('#description'), ctaIn = $('#cta'), applyBtn = $('#applyBtn');
const adCanvas = $('#adCanvas'), insertGen = $('#insertGen'), exportPNG = $('#exportPNG'), exportHTML = $('#exportHTML');
const settingsBtn = $('#settingsBtn'), settingsModal = $('#settingsModal'), proxyBase = $('#proxyBase'), openaiKey = $('#openaiKey');
const saveSettings = $('#saveSettings'), closeSettings = $('#closeSettings');
const galleryModal = $('#galleryModal'), openGallery = $('#openGallery'), closeGallery = $('#closeGallery'), galleryList = $('#galleryList');

let lastGenerated = { headline:'', sub:'', cta:'', image:'' };
let cachedImageDataUrl = null;

// settings load
const SETTINGS_KEY = 'vidgen_ai_settings';
function loadSettings(){ const s = JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}'); proxyBase.value = s.proxyBase||''; openaiKey.value = s.openaiKey||''; }
function saveSettingsFn(){ const s = { proxyBase: proxyBase.value.trim(), openaiKey: openaiKey.value.trim() }; localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); alert('AI settings saved'); settingsModal.classList.add('hidden'); }
loadSettings();

// open settings
settingsBtn.addEventListener('click', ()=> settingsModal.classList.remove('hidden'));
closeSettings.addEventListener('click', ()=> settingsModal.classList.add('hidden'));
saveSettings.addEventListener('click', saveSettingsFn);

// generate copy (proxy-first, fallback to in-browser key)
genCopy.addEventListener('click', async ()=> {
  const prompt = aiPrompt.value.trim(); if(!prompt) return alert('Enter prompt');
  const toneVal = tone.value;
  genCopy.disabled = true; genCopy.textContent = 'Generating...';
  try {
    const res = await callAiForCopy(prompt, toneVal);
    lastGenerated.headline = res.headline || res.title || '';
    lastGenerated.sub = res.sub || res.subheadline || '';
    lastGenerated.cta = res.cta || res.button || 'Shop now';
    alert('Copy generated. Click "Insert Generated" to apply.');
  } catch (e) { alert('Copy generation failed: '+e.message); console.error(e); }
  finally { genCopy.disabled=false; genCopy.textContent='Generate Copy'; }
});

// generate image
genImage.addEventListener('click', async ()=> {
  const prompt = aiPrompt.value.trim(); if(!prompt) return alert('Enter prompt');
  genImage.disabled = true; genImage.textContent = 'Generating...';
  try {
    const imgUrl = await callAiForImage(prompt);
    lastGenerated.image = imgUrl;
    // if it's a remote URL, try fetch and convert to dataURL for offline export compatibility
    try { cachedImageDataUrl = await urlToDataUrl(imgUrl); } catch(e){ cachedImageDataUrl = imgUrl; }
    alert('Image generated. Click "Insert Generated" to apply.');
  } catch (e) { alert('Image generation failed: '+e.message); console.error(e); }
  finally { genImage.disabled=false; genImage.textContent='Generate Image'; }
});

// insert generated into canvas fields
insertGen.addEventListener('click', ()=> {
  if (!lastGenerated.headline && !lastGenerated.image) return alert('No generated content yet');
  titleIn.value = lastGenerated.headline || titleIn.value;
  descIn.value = lastGenerated.sub || descIn.value;
  ctaIn.value = lastGenerated.cta || ctaIn.value;
  if (cachedImageDataUrl) { renderPreview({ title: titleIn.value, description: descIn.value, image: cachedImageDataUrl }); }
});

// apply manual to canvas
applyBtn.addEventListener('click', ()=> {
  renderPreview({ title: titleIn.value.trim(), description: descIn.value.trim(), image: cachedImageDataUrl });
});

// render preview
function renderPreview(ad) {
  adCanvas.innerHTML = '';
  const block = document.createElement('div'); block.className='ad-block';
  if (ad.image) block.style.backgroundImage = `url(${ad.image})`; else block.style.background = '#f7f7f7';
  const t = document.createElement('div'); t.className='ad-title'; t.textContent = ad.title||'';
  const d = document.createElement('div'); d.className='ad-desc'; d.textContent = ad.description||'';
  const c = document.createElement('div'); c.className='ad-cta'; c.textContent = ctaIn.value||'Shop now';
  block.appendChild(t); block.appendChild(d); block.appendChild(c);
  adCanvas.appendChild(block);
}

// export PNG and HTML
exportPNG.addEventListener('click', async ()=> {
  try { const cnv = await html2canvas(adCanvas,{backgroundColor:'#ffffff',scale:2}); cnv.toBlob(b=>{ const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download='ad.png'; document.body.appendChild(a); a.click(); a.remove(); }); }
  catch(e){ alert('Export failed: '+e.message); }
});
exportHTML.addEventListener('click', ()=> {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ad</title><style>body{margin:0} .wrap{width:100vw;height:100vh;background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center}</style></head><body><div class="wrap">${adCanvas.innerHTML}</div></body></html>`;
  const blob = new Blob([html],{type:'text/html'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='ad.html'; document.body.appendChild(a); a.click(); a.remove();
});

// simple gallery (local projects)
openGallery.addEventListener('click', ()=> { renderGallery(); galleryModal.classList.remove('hidden'); });
closeGallery.addEventListener('click', ()=> galleryModal.classList.add('hidden'));

function renderGallery(){
  const arr = JSON.parse(localStorage.getItem('vidgen_projects')||'[]'); galleryList.innerHTML='';
  arr.forEach(p=>{ const el=document.createElement('div'); el.className='gallery-item'; el.innerHTML=`<div><strong>${escapeHtml(p.title)}</strong><div class="small">${escapeHtml(p.tags||'')}</div></div>`;
    const actions=document.createElement('div'); const load=document.createElement('button'); load.textContent='Load'; load.className='btn alt'; load.onclick=()=> loadProject(p);
    const del=document.createElement('button'); del.textContent='Delete'; del.className='btn'; del.onclick=()=> { if(confirm('Delete?')) deleteProject(p.id); };
    actions.appendChild(load); actions.appendChild(del); el.appendChild(actions); galleryList.appendChild(el);
  });
}

function loadProject(p){ titleIn.value=p.title; descIn.value=p.description; ctaIn.value=p.cta; cachedImageDataUrl=p.image; renderPreview(p); galleryModal.classList.add('hidden'); }
function deleteProject(id){ let arr=JSON.parse(localStorage.getItem('vidgen_projects')||'[]'); arr=arr.filter(x=>x.id!==id); localStorage.setItem('vidgen_projects', JSON.stringify(arr)); renderGallery(); }

// save project locally when Save clicked
$('#saveBtn').addEventListener('click', async ()=> {
  const p = { id:'p_'+Date.now(), title:titleIn.value.trim(), description:descIn.value.trim(), cta:ctaIn.value.trim(), tags:$('#tags').value.trim(), image: cachedImageDataUrl };
  if (!p.title) return alert('Title required'); const arr=JSON.parse(localStorage.getItem('vidgen_projects')||'[]'); arr.unshift(p); localStorage.setItem('vidgen_projects', JSON.stringify(arr)); alert('Saved'); renderGallery();
});

// utility: convert URL to dataURL (for remote images)
async function urlToDataUrl(url){ try{ const resp=await fetch(url); const blob=await resp.blob(); return await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(blob); }); }catch(e){ throw e; } }

// ----------------- AI calls -----------------
// call proxy (preferred) otherwise use in-browser OpenAI key (dev only)
async function callAiForCopy(prompt, tone){ const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}'); const proxy = settings.proxyBase||''; const key = settings.openaiKey||'';
  if (proxy) {
    const url = proxy.replace(/\/$/,'') + '/generate-copy';
    const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prompt, tone }) });
    if (!r.ok) throw new Error('Proxy failed '+r.status);
    return await r.json();
  } else if (key) {
    // in-browser OpenAI Chat call (developer/testing only)
    const api = 'https://api.openai.com/v1/chat/completions';
    const sys = 'You are an expert ad copywriter. Return JSON: {headline, sub, cta}';
    const body = { model:'gpt-4o-mini', messages:[{role:'system',content:sys},{role:'user',content:`Prompt: ${prompt}\nTone: ${tone}\nReturn JSON only.`}], max_tokens:200, temperature:0.7 };
    const r = await fetch(api, { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+key}, body: JSON.stringify(body) });
    if (!r.ok) throw new Error('OpenAI text failed '+r.status);
    const j = await r.json(); const txt = j.choices?.[0]?.message?.content||'';
    try { return JSON.parse(txt); } catch(e){ // naive parse
      const lines = txt.split('\n').filter(Boolean); return { headline: lines[0]||'', sub: lines[1]||'', cta: lines[2]||'Shop now' };
    }
  } else { // fallback local
    return localCopyFallback(prompt);
  }
}

async function callAiForImage(prompt){
  const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}'); const proxy = settings.proxyBase||''; const key = settings.openaiKey||'';
  if (proxy) {
    const url = proxy.replace(/\/$/,'') + '/generate-image';
    const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prompt }) });
    if (!r.ok) throw new Error('Proxy image failed '+r.status);
    const j = await r.json(); return j.imageUrl || j.image || j.url;
  } else if (key) {
    // in-browser OpenAI images (v1/images/generations)
    const api = 'https://api.openai.com/v1/images/generations';
    const r = await fetch(api, { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+key}, body: JSON.stringify({ prompt, n:1, size:'1024x1024' }) });
    if (!r.ok) throw new Error('OpenAI image failed '+r.status);
    const j = await r.json(); if (j.data && j.data[0]){ if(j.data[0].url) return j.data[0].url; if(j.data[0].b64_json) return 'data:image/png;base64,'+j.data[0].b64_json; }
    throw new Error('No image returned');
  } else {
    // fallback - placeholder picsum
    return 'https://picsum.photos/seed/'+encodeURIComponent(prompt)+'/900/600';
  }
}

// local fallback copy generator
function localCopyFallback(prompt){ const p = prompt.toLowerCase(); let headline='Introducing our product'; if(p.includes('sale')) headline='Huge Sale — Up to 50% OFF'; else if(p.includes('new')) headline='New Arrival — Limited Stock'; let sub='High quality, great value.'; if(p.includes('women')) sub='Designed for women.'; return { headline, sub, cta:'Shop now' }; }

// helper to convert URL->dataURL (used when generating images remotely)
async function urlToDataUrl(url){ try{ const resp=await fetch(url); const blob=await resp.blob(); return await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(blob); }); }catch(e){ return url; } }

function escapeHtml(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// settings key global
const SETTINGS_KEY = 'vidgen_ai_settings';

// load settings on start
(function(){ if(!localStorage.getItem(SETTINGS_KEY)) localStorage.setItem(SETTINGS_KEY, JSON.stringify({proxyBase:'', openaiKey:''})); loadSettings(); function loadSettings(){ const s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}'); proxyBase.value=s.proxyBase||''; openaiKey.value=s.openaiKey||''; } })();

// utility: attach save settings on click
document.getElementById('saveSettings').addEventListener('click', ()=> { const s={proxyBase: proxyBase.value.trim(), openaiKey: openaiKey.value.trim()}; localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); alert('Saved settings'); settingsModal.classList.add('hidden'); });

