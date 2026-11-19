"use strict";
/* 5.0 Spende: Design aus den Einstellungen übernehmen, PayPal-Link kopieren. Keine Zahlungsdaten. */
document.addEventListener('DOMContentLoaded',async()=>{
 try{const config=await SCUI.api('/api/config');SCUI.apply(config.settings.appearance);}catch{}
 const button=document.getElementById('donateCopy'),status=document.getElementById('donateStatus');
 if(!button)return;
 button.addEventListener('click',async()=>{
  const url=button.dataset.url;let ok=false;
  try{await navigator.clipboard.writeText(url);ok=true;}catch{
   const area=document.createElement('textarea');area.value=url;area.setAttribute('readonly','');area.style.cssText='position:fixed;opacity:0';document.body.appendChild(area);area.select();
   try{ok=document.execCommand('copy');}catch{}area.remove();}
  status.textContent=ok?'LINK KOPIERT · ÜBERTRAGUNG BEREIT':'Kopieren nicht möglich – bitte den Link oben markieren.';
  clearTimeout(button._t);button._t=setTimeout(()=>status.textContent='',4000);
 });
});
