(() => {
  const $ = id => document.getElementById(id);
  const editor = $("editCanvas"), ectx = editor.getContext("2d", { willReadFrequently: true });
  let editorFile = null, editorBitmap = null, cutoutFile = null, cutoutBitmap = null, editorUrl = null, bgUrl = null, batchUrl = null, segPromise = null;
  const setStatus = (id, text, kind) => { const el=$(id); el.textContent=text; el.className="tool-msg"+(kind?" "+kind:""); };
  const fmtBytes = n => n < 1024 ? n+" B" : n < 1048576 ? (n/1024).toFixed(1)+" KB" : (n/1048576).toFixed(2)+" MB";
  function canvasImage(file, maxSide=12000) {
    return createImageBitmap(file,{imageOrientation:"from-image"}).then(b=>{
      if(Math.max(b.width,b.height)>maxSide){b.close();throw new Error("Image is too large to process safely in this browser.");}
      return b;
    });
  }
  const presets={square:[1080,1080],story:[1080,1920],post:[1200,630]};
  function syncPreset(){
    const value=$("sizePreset").value;
    if(presets[value]){$("editWidth").value=presets[value][0];$("editHeight").value=presets[value][1];}
    else if(value==="2x"||value==="3x"||value==="4x"){
      if(editorBitmap){const k=Number(value[0]);$("editWidth").value=Math.round(editorBitmap.width*k);$("editHeight").value=Math.round(editorBitmap.height*k);}
    }else if(value==="original"&&editorBitmap){$("editWidth").value=editorBitmap.width;$("editHeight").value=editorBitmap.height;}
    drawEditor(true);
  }
  function renderSource(bmp, canvas, width, height, preview){
    const ratio=preview?Math.min(1,700/Math.max(width,height)):1, w=Math.max(1,Math.round(width*ratio)),h=Math.max(1,Math.round(height*ratio));
    canvas.width=w;canvas.height=h;
    const angle=Number($("editRotate").value)*Math.PI/180, swap=Math.abs(Math.sin(angle))>.5, rw=swap?bmp.height:bmp.width,rh=swap?bmp.width:bmp.height;
    const fitScale=$("editFit")&&$("editFit").value==="contain"?Math.min(w/rw,h/rh):Math.max(w/rw,h/rh);
    const dw=rw*fitScale,dh=rh*fitScale,c=canvas.getContext("2d");
    const format=$("editFormat").value;
    c.fillStyle=format==="image/png"?"rgba(255,255,255,0)":"#fff";
    c.fillRect(0,0,w,h);
    c.save();c.translate(w/2,h/2);c.rotate(angle);
    c.filter="brightness("+$("editBrightness").value+"%) contrast("+$("editContrast").value+"%) saturate("+$("editSaturation").value+"%)";
    c.imageSmoothingEnabled=true;c.imageSmoothingQuality="high";
    c.drawImage(bmp,-dw/2,-dh/2,dw,dh);c.restore();c.filter="none";
    const text=$("editText").value.trim();
    if(text){const size=Math.max(16,Math.round(Math.min(w,h)*.045));c.font="600 "+size+"px system-ui, sans-serif";c.textAlign="right";c.textBaseline="bottom";c.lineJoin="round";c.lineWidth=Math.max(2,size*.12);c.strokeStyle="rgba(0,0,0,.68)";c.fillStyle="#fff";c.shadowColor="rgba(0,0,0,.55)";c.shadowBlur=size*.2;c.strokeText(text,w-size*.04,h-size*.04);c.fillText(text,w-size*.04,h-size*.04);}
    if($("editSharpen").checked)sharpen(canvas,w,h);
    return canvas;
  }
  function sharpen(c,w,h){
    const ctx=c.getContext("2d",{willReadFrequently:true}),src=ctx.getImageData(0,0,w,h),out=ctx.createImageData(w,h),a=src.data,b=out.data;
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=(y*w+x)*4;for(let k=0;k<3;k++){const v=5*a[i+k]-a[i-4+k]-a[i+4+k]-a[i-w*4+k]-a[i+w*4+k];b[i+k]=Math.max(0,Math.min(255,v));}b[i+3]=a[i+3];}
    for(let x=0;x<w;x++){for(let y of [0,h-1]){const i=(y*w+x)*4;for(let k=0;k<4;k++)b[i+k]=a[i+k];}}
    for(let y=0;y<h;y++)for(let x of [0,w-1]){const i=(y*w+x)*4;for(let k=0;k<4;k++)b[i+k]=a[i+k];}
    ctx.putImageData(out,0,0);
  }
  function drawEditor(preview){
    if(!editorBitmap)return;
    let w=Number($("editWidth").value),h=Number($("editHeight").value);
    if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1)return;
    
    const temp=document.createElement("canvas");renderSource(editorBitmap,temp,w,h,preview);
    if(preview){editor.width=temp.width;editor.height=temp.height;ectx.clearRect(0,0,editor.width,editor.height);ectx.drawImage(temp,0,0);}
  }
  $("editorFile").addEventListener("change",async e=>{
    if(editorBitmap)editorBitmap.close();editorBitmap=null;editorFile=e.target.files[0]||null;$("exportImage").disabled=!editorFile;$("editorDownload").classList.add("hidden");
    if(!editorFile)return;
    try{editorBitmap=await canvasImage(editorFile);$("editWidth").value=editorBitmap.width;$("editHeight").value=editorBitmap.height;$("sizePreset").value="original";$("editorInfo").textContent=editorFile.name+" · "+editorBitmap.width+" × "+editorBitmap.height+" px · "+fmtBytes(editorFile.size);drawEditor(true);setStatus("editorStatus","Ready to edit.");}
    catch(err){setStatus("editorStatus",err.message||"Could not open that image.","error");}
  });
  $("sizePreset").addEventListener("change",syncPreset);
  ["editWidth","editHeight","editBrightness","editContrast","editSaturation","editRotate","editText","editFormat","editSharpen"].forEach(id=>$(id).addEventListener(id.startsWith("edit")&&["editWidth","editHeight"].includes(id)?"input":"input",()=>drawEditor(true)));
  if($("editFit"))$("editFit").addEventListener("change",()=>drawEditor(true));
  $("exportImage").addEventListener("click",async()=>{
    if(!editorBitmap)return;
    const w=Number($("editWidth").value),h=Number($("editHeight").value),btn=$("exportImage"),type=$("editFormat").value;
    if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1){setStatus("editorStatus","Enter positive whole-number dimensions.","error");return;}
    btn.disabled=true;setStatus("editorStatus","Rendering full-resolution image...");
    try{const out=document.createElement("canvas");renderSource(editorBitmap,out,w,h,false);const blob=await new Promise(r=>out.toBlob(r,type,type==="image/png"?undefined:Number($("editQuality")?.value||88)/100));if(!blob)throw new Error("The browser could not export this image.");if(editorUrl)URL.revokeObjectURL(editorUrl);editorUrl=URL.createObjectURL(blob);const a=$("editorDownload"),ext=type.split("/")[1].replace("jpeg","jpg");a.href=editorUrl;a.download=(editorFile.name.replace(/\.[^.]+$/,"")||"image")+"-"+w+"x"+h+"."+ext;a.classList.remove("hidden");setStatus("editorStatus","Exported "+w+" × "+h+" px · "+fmtBytes(blob.size)+".","success");}
    catch(err){setStatus("editorStatus",err.message||"Could not export the image.","error");}
    finally{btn.disabled=false;}
  });

  $("bgFile").addEventListener("change",async e=>{
    if(cutoutBitmap)cutoutBitmap.close();cutoutFile=e.target.files[0]||null;cutoutBitmap=null;$("removeBg").disabled=!cutoutFile;$("bgDownload").classList.add("hidden");
    if(!cutoutFile)return;
    try{cutoutBitmap=await canvasImage(cutoutFile);const c=$("bgCanvas"),ratio=Math.min(1,700/Math.max(cutoutBitmap.width,cutoutBitmap.height));c.width=Math.round(cutoutBitmap.width*ratio);c.height=Math.round(cutoutBitmap.height*ratio);c.getContext("2d").drawImage(cutoutBitmap,0,0,c.width,c.height);setStatus("bgStatus",cutoutBitmap.width+" × "+cutoutBitmap.height+" px · ready.");}
    catch(err){setStatus("bgStatus",err.message||"Could not open this image.","error");}
  });
  $("bgMethod").addEventListener("change",()=>{$("colorControls").classList.toggle("hidden",$("bgMethod").value!=="color");});
  async function loadSegmenter(){
    if(!segPromise){segPromise=(async()=>{
      const base="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
      const mod=await import(base+"/vision_bundle.mjs");
      const files=await mod.FilesetResolver.forVisionTasks(base+"/wasm");
      const make=d=>mod.ImageSegmenter.createFromOptions(files,{baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",delegate:d},runningMode:"IMAGE",outputCategoryMask:false,outputConfidenceMasks:true});
      try{return await make("GPU");}catch(_){return await make("CPU");}
    })();segPromise.catch(()=>{segPromise=null;});}
    return segPromise;
  }
  async function personCutout(bmp){
    const k=Math.min(1,512/Math.max(bmp.width,bmp.height)),small=document.createElement("canvas");small.width=Math.max(1,Math.round(bmp.width*k));small.height=Math.max(1,Math.round(bmp.height*k));small.getContext("2d").drawImage(bmp,0,0,small.width,small.height);
    const seg=await loadSegmenter();let res=seg.segment(small);if(res&&typeof res.then==="function")res=await res;
    const masks=res&&res.confidenceMasks;if(!masks||!masks.length)throw new Error("The model returned no person mask.");
    const m=masks.length>1?masks[1]:masks[0],mw=m.width,mh=m.height,data=m.getAsFloat32Array(),mask=document.createElement("canvas");mask.width=mw;mask.height=mh;
    const ctx=mask.getContext("2d"),id=ctx.createImageData(mw,mh);let sum=0;
    for(let i=0;i<mw*mh;i++){const v=Math.max(0,Math.min(1,(data[i]-.30)/.38));id.data[i*4]=255;id.data[i*4+1]=255;id.data[i*4+2]=255;id.data[i*4+3]=Math.round(v*v*(3-2*v)*255);sum+=v;}
    if(res.close)res.close();if(sum/(mw*mh)<.02)throw new Error("No clear person was found. Try the flat-color method.");
    ctx.putImageData(id,0,0);const out=document.createElement("canvas");out.width=bmp.width;out.height=bmp.height;const oc=out.getContext("2d");oc.drawImage(bmp,0,0);oc.globalCompositeOperation="destination-in";oc.imageSmoothingQuality="high";oc.drawImage(mask,0,0,out.width,out.height);return out;
  }
  function colorCutout(bmp){
    const c=document.createElement("canvas");c.width=bmp.width;c.height=bmp.height;const x=c.getContext("2d",{willReadFrequently:true});x.drawImage(bmp,0,0);const id=x.getImageData(0,0,c.width,c.height),p=id.data,hex=$("keyColor").value,r0=parseInt(hex.slice(1,3),16),g0=parseInt(hex.slice(3,5),16),b0=parseInt(hex.slice(5,7),16),t=Number($("keyTolerance").value)*4,fade=t*.42;
    for(let i=0;i<p.length;i+=4){const d=Math.sqrt((p[i]-r0)**2+(p[i+1]-g0)**2+(p[i+2]-b0)**2);let a=Math.max(0,Math.min(1,(d-(t-fade))/(fade||1)));p[i+3]=Math.round(p[i+3]*a);}
    x.putImageData(id,0,0);return c;
  }
  $("removeBg").addEventListener("click",async()=>{
    if(!cutoutBitmap)return;const btn=$("removeBg");btn.disabled=true;$("bgDownload").classList.add("hidden");
    try{setStatus("bgStatus",$("bgMethod").value==="person"?"Loading the portrait segmentation model (first use downloads it)...":"Removing the selected color...");const c=$("bgMethod").value==="person"?await personCutout(cutoutBitmap):colorCutout(cutoutBitmap);const preview=$("bgCanvas"),scale=Math.min(1,700/Math.max(c.width,c.height));preview.width=Math.round(c.width*scale);preview.height=Math.round(c.height*scale);preview.getContext("2d").drawImage(c,0,0,preview.width,preview.height);const blob=await new Promise(r=>c.toBlob(r,"image/png"));if(!blob)throw new Error("Could not export transparent PNG.");if(bgUrl)URL.revokeObjectURL(bgUrl);bgUrl=URL.createObjectURL(blob);$("bgDownload").href=bgUrl;$("bgDownload").download=(cutoutFile.name.replace(/\.[^.]+$/,"")||"image")+"-cutout.png";$("bgDownload").classList.remove("hidden");setStatus("bgStatus","Cutout ready · "+fmtBytes(blob.size)+". Inspect hair and edges before using it.","success");}
    catch(err){const message=err&&err.message||"";const userMessage=$("bgMethod").value==="person"?(/no person mask/i.test(message)?"No clear person was found. Try a front-facing portrait, or choose the flat-color method.":"Could not load or run the person-cutout model. Check your connection and try again, or choose the flat-color method."):message||"Could not remove that background color. Try a clearer image.";setStatus("bgStatus",userMessage,"error");}
    finally{btn.disabled=false;}
  });

  $("ocrImage").addEventListener("change",e=>{$("runImageOCR").disabled=!e.target.files.length;$("imageOCRText").value="";$("copyImageOCR").disabled=true;setStatus("imageOCRStatus",e.target.files.length?"Ready. The OCR model runs on this device.":"");});
  $("runImageOCR").addEventListener("click",async()=>{
    const file=$("ocrImage").files[0];if(!file)return;const btn=$("runImageOCR");btn.disabled=true;$("imageOCRText").value="";$("copyImageOCR").disabled=true;let worker;
    try{setStatus("imageOCRStatus","Loading OCR engine and language data. The first load may take a minute...");worker=await Tesseract.createWorker($("ocrLanguage").value,1,{logger:m=>{if(m.status){const pct=Number.isFinite(m.progress)?" "+Math.round(m.progress*100)+"%":"";setStatus("imageOCRStatus",m.status+pct+" · processing in your browser");}}});const result=await worker.recognize(file);$("imageOCRText").value=(result.data.text||"").trim();$("copyImageOCR").disabled=!$("imageOCRText").value;setStatus("imageOCRStatus",result.data.text?"Recognition complete. Review spelling and line breaks before copying.":"No text was detected. Try a sharper, more closely cropped image.","success");}
    catch(err){setStatus("imageOCRStatus","Could not load the OCR engine or language data. Check your internet connection and try again.","error");}
    finally{if(worker)await worker.terminate();btn.disabled=false;}
  });
  $("copyImageOCR").addEventListener("click",async()=>{try{await navigator.clipboard.writeText($("imageOCRText").value);setStatus("imageOCRStatus","Text copied.");}catch(_){$("imageOCRText").select();setStatus("imageOCRStatus","Text selected. Use Ctrl+C to copy.");}});

  let batchFiles=[];$("batchImages").addEventListener("change",e=>{batchFiles=Array.from(e.target.files||[]);$("runBatchImages").disabled=!batchFiles.length;setStatus("batchImageStatus",batchFiles.length?batchFiles.length+" image(s) selected."+(batchFiles.length>25?" Large batches may take several minutes; progress appears for each image.":""):"");});
  $("runBatchImages").addEventListener("click",async()=>{
    const btn=$("runBatchImages");btn.disabled=true;setStatus("batchImageStatus","Resizing images and creating a ZIP...");const zip=new JSZip(),names=new Set(),wlim=Number($("batchWidth").value),hlim=Number($("batchHeight").value),type=$("batchFormat").value,q=Number($("batchQuality").value)/100;
    try{
      if(!Number.isInteger(wlim)||!Number.isInteger(hlim)||wlim<1||hlim<1)throw new Error("Enter positive whole-number maximum dimensions.");

      for(let i=0;i<batchFiles.length;i++){const f=batchFiles[i];const bmp=await canvasImage(f),scale=Math.min(1,wlim/bmp.width,hlim/bmp.height),c=document.createElement("canvas");c.width=Math.max(1,Math.round(bmp.width*scale));c.height=Math.max(1,Math.round(bmp.height*scale));const cx=c.getContext("2d");if(type==="image/jpeg"){cx.fillStyle="#fff";cx.fillRect(0,0,c.width,c.height);}cx.imageSmoothingEnabled=true;cx.imageSmoothingQuality="high";cx.drawImage(bmp,0,0,c.width,c.height);bmp.close();const blob=await new Promise(r=>c.toBlob(r,type,type==="image/png"?undefined:q));if(!blob)throw new Error("Could not convert "+f.name);let base=f.name.replace(/\.[^.]+$/,"")||"image",ext=type==="image/jpeg"?"jpg":type==="image/png"?"png":"webp",name=base+"."+ext,n=2;while(names.has(name.toLowerCase()))name=base+"-"+(n++)+"."+ext;names.add(name.toLowerCase());zip.file(name,blob);setStatus("batchImageStatus","Processed "+(i+1)+" of "+batchFiles.length+" images...");}
      const blob=await zip.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:6}});if(batchUrl)URL.revokeObjectURL(batchUrl);batchUrl=URL.createObjectURL(blob);$("batchImageDownload").href=batchUrl;$("batchImageDownload").classList.remove("hidden");setStatus("batchImageStatus","ZIP ready · "+fmtBytes(blob.size)+".","success");
    }catch(err){setStatus("batchImageStatus",err.message||"Could not process this batch.","error");}
    finally{btn.disabled=!batchFiles.length;}
  });
  window.addEventListener("beforeunload",()=>[editorUrl,bgUrl,batchUrl].filter(Boolean).forEach(URL.revokeObjectURL));
})();