(() => {
  const $=id=>document.getElementById(id), status=(id,t,k)=>{const e=$(id);e.textContent=t;e.className="tool-msg"+(k?" "+k:"");};
  const initial=new Date();for(const id of ["dateStart","dateEnd"]){$(id).value=new Date(Date.UTC(initial.getFullYear(),initial.getMonth(),initial.getDate())).toISOString().slice(0,10);}
  $("makeQR").addEventListener("click",()=>{
    const value=$("qrText").value.trim();if(!value){status("qrStatus","Enter a link or text first.","error");return;}
    try{const qr=qrcode(0,$("qrCorrection").value);qr.addData(value,"Byte");qr.make();const scale=Number($("qrSize").value),encoded=qr.createDataURL(scale,scale*4),source=new Image();
      source.onload=()=>{const c=document.createElement("canvas");c.width=source.naturalWidth;c.height=source.naturalHeight;const x=c.getContext("2d");x.imageSmoothingEnabled=false;x.drawImage(source,0,0);const png=c.toDataURL("image/png"),img=document.createElement("img");img.src=png;img.alt="QR code for the text you entered";img.width=Math.min(400,c.width);img.height=Math.min(400,c.height);$("qrPreview").textContent="";$("qrPreview").appendChild(img);$("qrDownload").href=png;$("qrDownload").classList.remove("hidden");status("qrStatus","PNG QR code ready. Scan it to confirm the destination.","success");};
      source.onerror=()=>status("qrStatus","Could not render that QR code. Try shorter text.","error");source.src=encoded;
    }catch(e){status("qrStatus","That content is too long for a QR code. Shorten it and try again.","error");}
  });  function dateDelta(){
    const a=$("dateStart").value,b=$("dateEnd").value,box=$("dateDifference");if(!a||!b){box.textContent="Choose two dates.";return;}
    const start=new Date(a+"T00:00:00Z"),end=new Date(b+"T00:00:00Z"),days=Math.round((end-start)/86400000),lo=days<0?end:start,hi=days<0?start:end;let weekdays=0;
    for(let d=new Date(lo);d<hi;d.setUTCDate(d.getUTCDate()+1)){const day=d.getUTCDay();if(day!==0&&day!==6)weekdays++;}
    box.textContent=Math.abs(days)+" calendar day(s) apart · "+weekdays+" weekdays"+(days<0?" · end date is before start date":"");
  }
  ["dateStart","dateEnd"].forEach(id=>$(id).addEventListener("change",dateDelta));dateDelta();
  function partsAt(date,zone){const p=new Intl.DateTimeFormat("en-GB",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(date);const o={};p.forEach(x=>{if(x.type!=="literal")o[x.type]=Number(x.value);});return o;}
  function localInputInZone(value,zone){
    const m=value.match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)$/);if(!m)throw new Error("Choose a date and time.");
    const want={year:+m[1],month:+m[2],day:+m[3],hour:+m[4],minute:+m[5],second:0},target=Date.UTC(want.year,want.month-1,want.day,want.hour,want.minute,0);let guess=target;
    for(let i=0;i<3;i++){const seen=partsAt(new Date(guess),zone),seenUtc=Date.UTC(seen.year,seen.month-1,seen.day,seen.hour,seen.minute,seen.second);guess+=target-seenUtc;}
    const actual=partsAt(new Date(guess),zone);if(actual.year!==want.year||actual.month!==want.month||actual.day!==want.day||actual.hour!==want.hour||actual.minute!==want.minute)throw new Error("That local time is ambiguous or skipped by daylight-saving time. Try another time.");
    return new Date(guess);
  }
  $("convertZone").addEventListener("click",()=>{
    try{const date=localInputInZone($("localDateTime").value,$("sourceZone").value.trim());const out=new Intl.DateTimeFormat("en-IN",{timeZone:$("targetZone").value.trim(),weekday:"long",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit",timeZoneName:"short"}).format(date);$("zoneResult").textContent=out+" · "+date.toISOString();$("zoneResult").className="tool-result";}
    catch(e){$("zoneResult").textContent="";status("zoneResult",e.message==="Invalid time zone specified: "+$("sourceZone").value.trim()||e.message==="Invalid time zone specified: "+$("targetZone").value.trim()?"Check the time-zone name. Use an IANA name such as Asia/Kolkata or Europe/London.":e.message||"Enter a valid time and time-zone name.","error");}
  });
  function hexRgb(hex){return{r:parseInt(hex.slice(1,3),16),g:parseInt(hex.slice(3,5),16),b:parseInt(hex.slice(5,7),16)};}
  function rgbHsl({r,g,b}){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0,s=0,l=(max+min)/2;if(d){s=d/(1-Math.abs(2*l-1));switch(max){case r:h=((g-b)/d)%6;break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4;}h*=60;if(h<0)h+=360;}return{h:Math.round(h),s:Math.round(s*100),l:Math.round(l*100)};}
  function hslHex(h,s,l){s/=100;l/=100;const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;let v=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return"#"+v.map(n=>Math.round((n+m)*255).toString(16).padStart(2,"0")).join("");}
  function renderColor(){const hex=$("paletteColor").value.toUpperCase(),rgb=hexRgb(hex),hsl=rgbHsl(rgb),values=$("colorValues");values.textContent="";[[ "HEX",hex ],[ "RGB","rgb("+rgb.r+", "+rgb.g+", "+rgb.b+")" ],[ "HSL","hsl("+hsl.h+", "+hsl.s+"%, "+hsl.l+"%)" ]].forEach(([k,v])=>{const row=document.createElement("div"),a=document.createElement("span"),b=document.createElement("b");a.textContent=k;b.textContent=v;row.append(a,b);values.appendChild(row);});
    const colors=[hex,hslHex((hsl.h+180)%360,hsl.s,hsl.l),hslHex((hsl.h+30)%360,hsl.s,hsl.l),hslHex((hsl.h+330)%360,hsl.s,hsl.l),hslHex(hsl.h,hsl.s,Math.min(90,hsl.l+25)),hslHex(hsl.h,hsl.s,Math.max(10,hsl.l-25))],box=$("palettePreview");box.textContent="";colors.forEach(c=>{const item=document.createElement("button");item.type="button";item.className="palette-swatch";item.style.background=c;item.title="Copy "+c;item.textContent=c;item.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(c);status("colorStatus","Copied "+c+".");}catch(_){status("colorStatus",c+" · select and copy this value");}});box.appendChild(item);});}
  $("paletteColor").addEventListener("input",renderColor);$("copyHex").addEventListener("click",async()=>{try{await navigator.clipboard.writeText($("paletteColor").value.toUpperCase());status("colorStatus","HEX color copied.");}catch(_){status("colorStatus",$("paletteColor").value.toUpperCase());}});renderColor();
  const key="variuno.application-checklist.v2",defaults=["Read the current official notice and upload rules","Live photo capture in the official portal (if required)","Recent photo upload (if required)","Signature","Thumb or finger impressions (if required)","Handwritten declaration / undertaking (if required)","Identity, age and address proof","Education / marksheets","Category, income, domicile or disability certificates (if applicable)","NOC / experience proof (if applicable)","Application fee receipt","Submitted application and confirmation page","Exam-day photo and ID (as instructed)"];
  let items;try{items=JSON.parse(localStorage.getItem(key))||null;}catch(_){items=null;}if(!Array.isArray(items)||!items.length)items=defaults.map(text=>({text,done:false}));
  function save(){localStorage.setItem(key,JSON.stringify(items));}
  function drawList(){const box=$("applicationItems");box.textContent="";items.forEach((item,i)=>{const row=document.createElement("div");row.className="application-item";const label=document.createElement("label"),check=document.createElement("input"),span=document.createElement("span");check.type="checkbox";check.checked=!!item.done;check.addEventListener("change",()=>{items[i].done=check.checked;save();});span.textContent=item.text;label.append(check,span);const remove=document.createElement("button");remove.type="button";remove.className="ghost";remove.textContent="Remove";remove.setAttribute("aria-label","Remove "+item.text);remove.addEventListener("click",()=>{items.splice(i,1);save();drawList();});row.append(label,remove);box.appendChild(row);});}
  $("checklistName").value=localStorage.getItem("variuno.application-name")||"";$("checklistName").addEventListener("input",()=>localStorage.setItem("variuno.application-name",$("checklistName").value));
  $("addApplicationItem").addEventListener("click",()=>{const value=$("newApplicationItem").value.trim();if(!value)return;items.push({text:value,done:false});$("newApplicationItem").value="";save();drawList();});
  $("newApplicationItem").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();$("addApplicationItem").click();}});
  $("resetChecklist").addEventListener("click",()=>{items=defaults.map(text=>({text,done:false}));save();drawList();});drawList();
})();

