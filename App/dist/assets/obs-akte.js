"use strict";
/* 6.0.7: OBS-Quelle für die Akte. Zeigt die im Dashboard eingeblendete Akte mittig und blättert mit.
   Fragt jede Sekunde /api/obs/akte mit Revision ab: ohne Änderung kommt nur eine kurze Antwort zurück. */
(()=>{
 let revision='',guid=null,control=null,building=false;
 async function build(d){
  building=true;
  try{
   const [m,catalog]=await Promise.all([SCUI.api('/api/missions/instance/'+encodeURIComponent(d.guid)).then(r=>r.mission),SCUI.api('/api/catalog')]);
   if(!m)return;
   Akte.setItems(catalog.items||[]);
   if(control)control.close();
   const row={guid:d.guid,...(d.row||{})};
   // Beim Wechsel zu einer anderen Akte erst geschlossen zeigen, dann aufschlagen (wie im Dashboard)
   control=Akte.open(row,m,d.heft||'',d.session||[],null,{obs:true,state:0});
   guid=d.guid;
   const target=d.state|0;
   if(target>0)setTimeout(()=>control&&guid===d.guid&&control.set(target),450);
  }finally{building=false;}
 }
 async function tick(){
  try{
   const d=await SCUI.api('/api/obs/akte'+(revision?'?since='+revision:''));
   if(d.unchanged)return;
   if(!d.visible||!d.guid){if(control){control.close();control=null;guid=null;}revision=d.revision||'';return;}
   if(d.guid!==guid){if(!building){await build(d);revision=d.revision||'';}return;}
   control?.set(d.state|0);revision=d.revision||'';
  }catch{/* NAS kurz nicht erreichbar: nächster Versuch in einer Sekunde */}
 }
 const loop=async()=>{await tick();setTimeout(loop,1000);};
 loop();
})();
