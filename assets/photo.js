
/* ------------------------------------------------------------------
   PRESETS. This is the data that will later move into its own file.
   kind: "photo" frames the face; "sign" cleans up and trims a signature.
   Only set verified:true after checking the official notification.
------------------------------------------------------------------- */
/* PRESETS and EXAMS live in presets.js */

const $ = id => document.getElementById(id);
const sel = $("preset"), specEl = $("spec"), customEl = $("custom");
const cv = $("cv"), ctx = cv.getContext("2d");
let W = 200, H = 230, minKB = 20, maxKB = 50, kind = "photo";
let src = null;      // working copy of the uploaded image (canvas)
let base = null;     // image used for framing (cleaned + trimmed for signatures)
let s = 1, cx = 0, cy = 0, coverScale = 1;
let outURL = null, runId = 0, timer = null;
let wbOn = false, lastKey = null, whiteP = null, whiteSrc = null, segP = null, frame = "cover";

PRESETS.forEach((p,i)=>{ const o=document.createElement("option"); o.value=i; o.textContent=p.label; sel.appendChild(o); });
/* ?preset=ID in the address picks a preset (used by the exam checklist on the home page). */
(function(){ try{ const params=new URLSearchParams(location.search),q=params.get("preset"),k=params.get("kind"); if(q){ const i=PRESETS.findIndex(p=>p.id===q); if(i>=0) sel.value=String(i); } if(["photo","sign","document"].includes(k)) $("ctype").value=k; }catch(e){} })();

function currentSpec(){
  const p = PRESETS[+sel.value];
  if(p.custom){
    const selectedKind=$("ctype").value; return { kind:selectedKind, frame:selectedKind==="document"?"contain":"cover", w:+$("cw").value||200, h:+$("ch").value||230, minKB:+$("cmin").value||0, maxKB:+$("cmax").value||50, verified:false, person:selectedKind==="photo", source:p.source, sourceLabel:p.sourceLabel, note:(p.note?p.note+" ":"")+"Enter the numbers shown in the current form." };
  }
  return p;
}

function applySpec(){
  const p = currentSpec();
  W=Math.round(p.w); H=Math.round(p.h); minKB=p.minKB; maxKB=p.maxKB; kind=p.kind; frame=p.frame||(kind==="document"?"contain":"cover");
  const cur = PRESETS[+sel.value];
  const key = cur.id + (cur.custom ? ":" + p.kind : "");
  $("wbRow").classList.toggle("hidden", !p.person);
  if(key !== lastKey){ lastKey = key; $("wb").checked = !!p.whiteBg; $("wbNote").textContent = ""; }
  wbOn = !!p.person && $("wb").checked;
  customEl.classList.toggle("hidden", !PRESETS[+sel.value].custom);
  specEl.innerHTML = (p.pixelApprox?"Working canvas: ":"Size: ")+"<b>"+W+" x "+H+" px</b> &middot; File: <b>"+minKB+"-"+maxKB+" KB</b> &middot; Format: <b>JPG</b>"
    + (p.verified ? (p.checked ? '<span class="badge okb">official, checked '+p.checked+'</span>' : "") : '<span class="badge">check official notice</span>')
    + (p.note ? "<br>"+p.note : "")
    + (p.source ? '<br>Source: <a href="'+p.source+'" target="_blank" rel="noopener">'+p.sourceLabel+'</a>' : "");
  $("tip").textContent = kind==="sign"
    ? "Use your own signature in the style required by the notice. The tool cleans and trims it; inspect the preview to make sure no strokes were lost."
    : kind==="document" ? "Choose a clear scan of your own handwritten declaration or thumb impression. The tool only resizes, frames and compresses; it does not create handwriting or fingerprints."
    : "Use a recent, clear photo with your face facing the camera and a plain background. The app can centre your face; compare the result with the official example.";
  cv.width=W; cv.height=H;
  const up = Math.max(1, Math.min(3, 280 / W));
  cv.style.width = Math.round(W*up) + "px";
  if(base){ prepare().then(()=>schedule(0)); } else draw();
}

/* ---------- loading the image ---------- */
async function loadFile(file){
  let bmp;
  try{ bmp = await createImageBitmap(file, { imageOrientation:"from-image" }); }
  catch(e){
    bmp = await new Promise((res,rej)=>{ const u=URL.createObjectURL(file), im=new Image(); im.onload=()=>{URL.revokeObjectURL(u);res(im)}; im.onerror=rej; im.src=u; });
  }
  const iw=bmp.width||bmp.naturalWidth, ih=bmp.height||bmp.naturalHeight;
  const k=Math.min(1, 2000/Math.max(iw,ih));
  const c=document.createElement("canvas"); c.width=Math.max(1,Math.round(iw*k)); c.height=Math.max(1,Math.round(ih*k));
  c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);
  return c;
}

/* ---------- signature clean-up: white paper, trimmed edges ---------- */
function cleanSignature(c){
  const w=c.width, h=c.height;
  const t=document.createElement("canvas"); t.width=w; t.height=h;
  const tc=t.getContext("2d"); tc.drawImage(c,0,0);
  const d=tc.getImageData(0,0,w,h), px=d.data, n=w*h;
  const lum=new Uint8Array(n), hist=new Uint32Array(256);
  for(let i=0;i<n;i++){ const l=(px[i*4]*0.299+px[i*4+1]*0.587+px[i*4+2]*0.114)|0; lum[i]=l; hist[l]++; }
  const pct=p=>{ let a=0,t0=n*p; for(let v=0;v<256;v++){ a+=hist[v]; if(a>=t0) return v; } return 255; };
  const paper=pct(0.85), low=Math.min(pct(0.01), paper-40);
  const span=Math.max(30, paper*0.92-low);
  const colCount=new Uint32Array(w), rowCount=new Uint32Array(h);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    const i=y*w+x;
    let v=(lum[i]-low)/span; v=v<0?0:v>1?1:v;
    v=v*v*(3-2*v);
    const g=(v*255)|0;
    px[i*4]=px[i*4+1]=px[i*4+2]=g; px[i*4+3]=255;
    if(g<170){ colCount[x]++; rowCount[y]++; }
  }
  tc.putImageData(d,0,0);
  let x0=0,x1=w-1,y0=0,y1=h-1;
  while(x0<w && colCount[x0]<2) x0++;
  while(x1>x0 && colCount[x1]<2) x1--;
  while(y0<h && rowCount[y0]<2) y0++;
  while(y1>y0 && rowCount[y1]<2) y1--;
  if(x0>=x1 || y0>=y1) return t;
  const padX=Math.round((x1-x0)*0.04)+2, padY=Math.round((y1-y0)*0.08)+2;
  x0=Math.max(0,x0-padX); x1=Math.min(w-1,x1+padX); y0=Math.max(0,y0-padY); y1=Math.min(h-1,y1+padY);
  const o=document.createElement("canvas"); o.width=x1-x0+1; o.height=y1-y0+1;
  o.getContext("2d").drawImage(t,x0,y0,o.width,o.height,0,0,o.width,o.height);
  return o;
}

/* ---------- face centring (only where the browser supports it) ---------- */
async function findFace(c){
  if(!("FaceDetector" in window)) return null;
  try{
    const fd=new FaceDetector({ fastMode:true, maxDetectedFaces:1 });
    const f=await fd.detect(c);
    if(f && f[0]){ const b=f[0].boundingBox; return { x:b.x+b.width/2, y:b.y+b.height/2, h:b.height }; }
  }catch(e){}
  return null;
}

/* ---------- white background (AI model runs in the browser) ---------- */
const MP = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
const SEG_MODEL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

function getSegmenter(){
  if(!segP){
    segP = (async ()=>{
      const mod = await import(MP + "/vision_bundle.mjs");
      const vision = await mod.FilesetResolver.forVisionTasks(MP + "/wasm");
      const make = d => mod.ImageSegmenter.createFromOptions(vision, {
        baseOptions:{ modelAssetPath:SEG_MODEL, delegate:d },
        runningMode:"IMAGE", outputCategoryMask:false, outputConfidenceMasks:true });
      try{ return await make("GPU"); }catch(e){ return await make("CPU"); }
    })();
    segP.catch(()=>{ segP = null; });
  }
  return segP;
}

/* Only used if the model returns a single mask: the background touches the top and upper sides. */
function personIsHigh(data, mw, mh){
  let sum = 0, n = 0;
  const rows = Math.max(1, Math.round(mh*0.08)), cols = Math.max(1, Math.round(mw*0.08));
  for(let y=0; y<Math.round(mh*0.6); y++){
    for(let x=0; x<mw; x++){
      if(y<rows || x<cols || x>=mw-cols){ sum += data[y*mw+x]; n++; }
    }
  }
  return n ? (sum/n) < 0.5 : true;
}

async function whitenBackground(c){
  const seg = await getSegmenter();
  const k = Math.min(1, 512/Math.max(c.width, c.height));
  const small = document.createElement("canvas");
  small.width = Math.max(1, Math.round(c.width*k)); small.height = Math.max(1, Math.round(c.height*k));
  small.getContext("2d").drawImage(c, 0, 0, small.width, small.height);
  let res = seg.segment(small);
  if(res && typeof res.then === "function") res = await res;
  const masks = res && res.confidenceMasks;
  if(!masks || !masks.length) throw new Error("no mask");
  const m = masks.length > 1 ? masks[1] : masks[0];   /* index 1 is "person" */
  const mw = m.width, mh = m.height, data = m.getAsFloat32Array();
  const flip = masks.length > 1 ? false : !personIsHigh(data, mw, mh);
  const mc = document.createElement("canvas"); mc.width = mw; mc.height = mh;
  const mctx = mc.getContext("2d"), id = mctx.createImageData(mw, mh);
  let inside = 0;
  for(let i=0; i<mw*mh; i++){
    let v = data[i]; if(flip) v = 1 - v;
    if(v > 0.5) inside++;
    v = (v - 0.4) / 0.35; v = v < 0 ? 0 : v > 1 ? 1 : v; v = v*v*(3-2*v);
    id.data[i*4+3] = Math.round(v*255);
  }
  mctx.putImageData(id, 0, 0);
  try{ if(res.close) res.close(); }catch(e){}
  const frac = inside / (mw*mh);
  if(frac < 0.05 || frac > 0.97) throw new Error("no person");
  const person = document.createElement("canvas"); person.width = c.width; person.height = c.height;
  const pc = person.getContext("2d");
  pc.drawImage(c, 0, 0);
  pc.globalCompositeOperation = "destination-in";
  pc.imageSmoothingQuality = "high";
  pc.drawImage(mc, 0, 0, c.width, c.height);
  const out = document.createElement("canvas"); out.width = c.width; out.height = c.height;
  const oc = out.getContext("2d");
  oc.fillStyle = "#fff"; oc.fillRect(0, 0, out.width, out.height);
  oc.drawImage(person, 0, 0);
  return out;
}

function ensureWhite(){
  if(whiteP && whiteSrc === src) return whiteP;
  whiteSrc = src;
  const mine = src;
  $("msg").className = "msg";
  $("msg").textContent = "Making the background white. The first time, a small AI model (a few MB) downloads, so please wait a few seconds...";
  $("wbNote").textContent = "";
  whiteP = (async ()=>{
    try{ return await whitenBackground(mine); }
    catch(e){
      whiteP = null;
      $("wbNote").textContent = (e && e.message === "no person")
        ? "Could not tell the person from the background in this photo, so the background was left as it is."
        : "Could not make the background white (no internet, or this browser does not support it). The photo was resized with its original background.";
      return null;
    }
  })();
  return whiteP;
}

/* ---------- framing ---------- */
function clampPos(){
  const hw=base.width*s/2, hh=base.height*s/2;
  if(hw<W/2) cx=W/2; else cx=Math.min(hw, Math.max(W-hw, cx));
  if(hh<H/2) cy=H/2; else cy=Math.min(hh, Math.max(H-hh, cy));
}

async function prepare(){
  if(!src) return;
  const id=++runId;
  if(kind==="sign"){
    base=cleanSignature(src);
    coverScale=Math.max(W/base.width, H/base.height);
    s=Math.min((W*0.94)/base.width, (H*0.88)/base.height);
    cx=W/2; cy=H/2;
  }else{
    base=src;
    if(wbOn && kind==="photo"){
      const w = await ensureWhite();
      if(id!==runId) return;
      if(w) base = w;
    }
    coverScale=frame==="contain"?Math.min(W/base.width,H/base.height):Math.max(W/base.width,H/base.height);
    s=coverScale; cx=W/2; cy=H/2;
    if(kind==="photo"){
      const face=await findFace(base);
      if(id!==runId) return;
      if(face){
        s=Math.min(coverScale*2.5, Math.max(coverScale, 0.42*H/face.h));
        cx=W/2-(face.x-base.width/2)*s;
        cy=H*0.42-(face.y-base.height/2)*s;
        clampPos();
      }else if(frame!=="contain"){
        const excess=base.height*s-H;
        if(excess>0) cy=(base.height*s)/2-excess*0.25;
      }
    }
  }
  $("zoom").value=(s/coverScale).toFixed(2);
  draw();
}
function draw(){
  ctx.fillStyle="#fff"; ctx.fillRect(0,0,W,H);
  if(!base) return;
  const w=base.width*s, h=base.height*s;
  ctx.imageSmoothingQuality="high";
  ctx.drawImage(base, cx-w/2, cy-h/2, w, h);
}

/* ---------- events ---------- */
sel.addEventListener("change", applySpec);
$("wb").addEventListener("change", ()=>{
  wbOn = $("wb").checked; $("wbNote").textContent = "";
  if(src){ $("resultCard").classList.remove("hidden"); prepare().then(()=>schedule(0)); }
});
["cw","ch","cmin","cmax","ctype"].forEach(id=>$(id).addEventListener("input", applySpec));

$("file").addEventListener("change", async e=>{
  const f=e.target.files[0]; if(!f) return;
  const msg=$("msg"); $("resultCard").classList.remove("hidden");
  msg.className="msg"; msg.textContent="Preparing your image...";
  try{
    src=await loadFile(f);
    whiteP=null; whiteSrc=null; $("wbNote").textContent="";
    await prepare();
    schedule(0);
  }catch(err){
    msg.className="msg err"; msg.textContent="Could not open this image. Try a JPG or PNG.";
  }
});

$("zoom").addEventListener("input", e=>{ if(!base) return; s=coverScale*(+e.target.value); clampPos(); draw(); schedule(350); });
$("auto").addEventListener("click", async ()=>{ await prepare(); schedule(0); });
$("fit").addEventListener("click", ()=>{ if(!base) return; s=Math.min(W/base.width, H/base.height); cx=W/2; cy=H/2; $("zoom").value=(s/coverScale).toFixed(2); draw(); schedule(0); });

let drag=null;
cv.addEventListener("pointerdown", e=>{ if(!base) return; drag={x:e.clientX,y:e.clientY}; cv.setPointerCapture(e.pointerId); cv.style.cursor="grabbing"; });
cv.addEventListener("pointermove", e=>{
  if(!drag) return;
  const ratio=cv.clientWidth/cv.width;
  cx += (e.clientX-drag.x)/ratio; cy += (e.clientY-drag.y)/ratio;
  drag={x:e.clientX,y:e.clientY}; draw(); schedule(350);
});
const endDrag=()=>{ drag=null; cv.style.cursor="grab"; };
cv.addEventListener("pointerup", endDrag); cv.addEventListener("pointercancel", endDrag);

/* ---------- making the file ---------- */
const toBlob = q => new Promise(res=>cv.toBlob(res,"image/jpeg",q));

/* Insert harmless JPEG comment segments so the file reaches the minimum size. */
async function padJpeg(blob, targetBytes){
  const buf=new Uint8Array(await blob.arrayBuffer());
  let need=targetBytes-buf.length;
  if(need<=4) return blob;
  let pos=2;
  if(buf[2]===0xFF && buf[3]===0xE0){ pos=2+2+((buf[4]<<8)|buf[5]); }
  const parts=[buf.slice(0,pos)];
  while(need>4){
    const n=Math.min(65533, need-4);
    const seg=new Uint8Array(4+n);
    seg[0]=0xFF; seg[1]=0xFE; seg[2]=(n+2)>>8; seg[3]=(n+2)&255;
    seg.fill(0x20,4);
    parts.push(seg); need-=4+n;
  }
  parts.push(buf.slice(pos));
  return new Blob(parts,{type:"image/jpeg"});
}

function schedule(delay){ clearTimeout(timer); timer=setTimeout(generate, delay); }

async function generate(){
  if(!base) return;
  const msg=$("msg"); msg.className="msg"; msg.textContent="Creating your file...";
  draw();
  try{
    /* Safe window: works whether the portal counts 1 KB as 1000 or 1024 bytes. */
    const lo=minKB*1024, hi=maxKB*1000;
    if(hi<lo) throw new Error("Max size is smaller than min size. Check your numbers.");
    let a=0.05, b=1, best=null;
    const top=await toBlob(1);
    if(top.size<=hi){ best=top; }
    else{
      const low=await toBlob(a);
      if(low.size>hi) throw new Error("Cannot reach "+maxKB+" KB at "+W+" x "+H+" px with this image. Try a plainer background.");
      best=low;
      for(let i=0;i<9;i++){
        const m=(a+b)/2, bl=await toBlob(m);
        if(bl.size<=hi){ best=bl; a=m; } else { b=m; }
      }
    }
    if(best.size<lo) best=await padJpeg(best, Math.round(lo+(hi-lo)*0.25));
    if(outURL) URL.revokeObjectURL(outURL);
    outURL=URL.createObjectURL(best);
    $("result").src=outURL;
    const name=(PRESETS[+sel.value].id||"image")+"-"+W+"x"+H+".jpg";
    $("dl").href=outURL; $("dl").setAttribute("download",name);
    const kb=(best.size/1024).toFixed(1);
    msg.className="msg ok";
    msg.textContent="Ready: "+W+" x "+H+" px, "+kb+" KB (allowed "+minKB+"-"+maxKB+" KB). Check it against your notification before uploading.";
  }catch(err){
    msg.className="msg err"; msg.textContent=err.message||"Something went wrong.";
  }
}

applySpec();





