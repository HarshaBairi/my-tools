(function(){
  const $=id=>document.getElementById(id), input=$("textInput"), metrics=$("textMetrics"), status=$("textStatus");
  function count(){const s=input.value, words=s.trim()?s.trim().split(/\s+/u).length:0, chars=Array.from(s).length, lines=s.length?s.split(/\r?\n/).length:0;metrics.textContent=words+" words · "+chars+" characters · "+lines+" lines";}
  input.addEventListener("input",count);
  document.querySelectorAll("[data-text-action]").forEach(button=>button.addEventListener("click",async()=>{
    const action=button.dataset.textAction, lines=input.value.split(/\r?\n/);
    if(action==="upper")input.value=input.value.toLocaleUpperCase();
    if(action==="lower")input.value=input.value.toLocaleLowerCase();
    if(action==="title")input.value=input.value.toLocaleLowerCase().replace(/(^|\s)([^\s])/gu,(m,a,b)=>a+b.toLocaleUpperCase());
    if(action==="trim")input.value=lines.map(x=>x.trim()).join("\n");
    if(action==="blank")input.value=lines.filter(x=>x.trim()).join("\n");
    if(action==="dedupe")input.value=Array.from(new Set(lines.map(x=>x.trim()).filter(Boolean))).join("\n");
    if(action==="replace"){const find=$("findText").value;if(!find){status.textContent="Enter the text to find.";return;}input.value=input.value.split(find).join($("replaceText").value);}
    if(action==="clear")input.value="";
    if(action==="copy"){try{await navigator.clipboard.writeText(input.value);status.textContent="Copied.";}catch(e){status.textContent="Select the text and copy it from your browser.";}}
    if(action!=="copy")status.textContent="Updated.";count();
  }));
  function copyButton(buttonId,areaId,statusId){$(buttonId).addEventListener("click",async()=>{try{await navigator.clipboard.writeText($(areaId).value);$(statusId).textContent="Copied.";}catch(e){$(statusId).textContent="Select the result and copy it from your browser.";}});}
  function formatJson(minify){const out=$("jsonOutput"), s=$("jsonInput").value, state=$("jsonStatus");try{const value=JSON.parse(s);out.value=JSON.stringify(value,null,minify?0:2);state.textContent="Valid JSON.";state.className="tool-msg success";}catch(e){out.value="";state.textContent="Invalid JSON: "+e.message;state.className="tool-msg error";}}
  $("jsonFormat").addEventListener("click",()=>formatJson(false));$("jsonMinify").addEventListener("click",()=>formatJson(true));copyButton("jsonCopy","jsonOutput","jsonStatus");
  function bytesToBase64(s){const bytes=new TextEncoder().encode(s);let binary="";for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);}
  function base64ToText(s){const binary=atob(s.replace(/\s+/g,""));const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));return new TextDecoder("utf-8",{fatal:true}).decode(bytes);}
  $("codecRun").addEventListener("click",()=>{const mode=$("codecMode").value, s=$("codecInput").value, state=$("codecStatus");try{let out="";if(mode==="url-encode")out=encodeURIComponent(s);if(mode==="url-decode")out=decodeURIComponent(s);if(mode==="base64-encode")out=bytesToBase64(s);if(mode==="base64-decode")out=base64ToText(s);$("codecOutput").value=out;state.textContent="Done.";state.className="tool-msg success";}catch(e){$("codecOutput").value="";state.textContent="Could not convert this input. Check the encoding and try again.";state.className="tool-msg error";}});copyButton("codecCopy","codecOutput","codecStatus");
  $("compareRun").addEventListener("click",()=>{const a=$("compareA").value.split(/\r?\n/),b=$("compareB").value.split(/\r?\n/),out=[];if($("compareA").value===$("compareB").value){$("compareStatus").textContent="The two versions match exactly.";$("compareOutput").textContent="";return;}const n=Math.max(a.length,b.length);for(let i=0;i<n;i++){if(a[i]===b[i]){if(a[i]!==undefined)out.push("  "+a[i]);}else{if(a[i]!==undefined)out.push("- "+a[i]);if(b[i]!==undefined)out.push("+ "+b[i]);}}$("compareOutput").textContent=out.join("\n");$("compareStatus").textContent="Lines marked - are from the original; + are from the updated version.";});
  count();
})();