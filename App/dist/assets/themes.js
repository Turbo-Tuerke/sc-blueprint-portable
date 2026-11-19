"use strict";
const SCUI = {
  themes: [
    {id:"meridian",name:"Meridian",tag:"Jeder Fund zählt.",desc:"Ein Observatorium für deine Sammlung. Nachtblau, Kupfer und großzügige Vitrinen mit seitlichem Dossier.",colors:["#0c1723","#efac81","#eef1ee"]},
    {id:"halo",name:"Halo",tag:"Raum für das Besondere.",desc:"Eine helle Ausstellung: mineralische Flächen, smaragdgrüne Akzente und eine ruhige, breite Galerie.",colors:["#f3f2ee","#277d72","#1d3335"]},
    {id:"nocturne",name:"Nocturne",tag:"Das Unentdeckte wartet.",desc:"Eine filmische Sammlung in Pflaume und Elfenbein. Große Typografie, dunkle Vitrinen und ein schwebendes Dossier.",colors:["#14101c","#c6acf0","#f0eaf7"]},
    {id:"aurum",name:"Aurum",tag:"Dein nächster Fund.",desc:"Das Obsidian aus 2.1: goldene Galerie mit festem Dossier. Jetzt ohne untere OBS-Leiste.",colors:["#0b1012","#d9b977","#ede9df"]},
    {id:"polaris",name:"Polaris",tag:"Alles im Blick.",desc:"Helle Listenansicht mit Petrolakzenten, Vergleichsauswahl und seitlichem Dossier.",colors:["#f5f8fb","#058aa6","#102738"]},
    {id:"sentinel",name:"Sentinel",tag:"Dein nächster Einsatz.",desc:"Taktische Auftragszentrale mit Cyan, Fundwegen, Belohnungspools und Einsatz­zielen.",colors:["#03111c","#39d9f0","#dceefa"]},
    {id:"obsidian",name:"Obsidian",tag:"Die private Sammlung",desc:"Original aus Version 2.0: Anthrazit, Champagnergold, großer Fortschritt und klassische Galerie.",colors:["#111314","#c9af7c","#ede9df"]},
    {id:"atlas",name:"Atlas",tag:"Raum für Entdeckungen",desc:"Helles Porzellan, Petrol und klare, großzügige Flächen.",colors:["#f2f3ef","#1d6970","#d9ddd5"]},
    {id:"vanguard",name:"Vanguard",tag:"Bereit für den Einsatz",desc:"Mitternachtsblau, Cyan und präzise taktische Linien.",colors:["#07131f","#63deef","#e0b26d"]},
    {id:"aurora",name:"Aurora",tag:"Eine neue Perspektive",desc:"Violette Lichtverläufe, weiche Konturen und Tiefe.",colors:["#141329","#bba5f4","#80cce4"]},
    {id:"eclipse",name:"Eclipse",tag:"Auf das Wesentliche",desc:"Tiefschwarz, Silber und konsequente Kontraste.",colors:["#090909","#ececec","#717171"]},
    {id:"forge",name:"Forge",tag:"Für das, was du baust",desc:"Graphit, warmes Kupfer und industrielle Details.",colors:["#191715","#e2a071","#877260"]},
  ],
  apply(appearance,persist=true) {
    const a=appearance||{};
    document.documentElement.dataset.theme=SCUI.themes.some(t=>t.id===a.theme)?a.theme:"aurum";
    document.documentElement.dataset.density=a.density||"comfortable";
    document.documentElement.dataset.motion=a.animations===false?"off":"on";
    document.documentElement.style.fontSize=`${a.fontSize||16}px`;
    if(persist)try { localStorage.setItem("scbp-appearance",JSON.stringify(a)); } catch {}
    document.dispatchEvent(new CustomEvent('sc:appearance',{detail:a}));
  },
  async api(path, body) {
    const response=await fetch(path,{cache:"no-store",headers:body?{"Content-Type":"application/json","X-SC-Request":"dashboard"}:{},method:body?"POST":"GET",body:body?JSON.stringify(body):undefined});
    const value=await response.json();
    if(!response.ok) { const error=new Error(value.error||`HTTP ${response.status}`);error.status=response.status;throw error; }
    return value;
  },
  escape(value) { return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); },
  itemLabel(name) {
    if(name==='Zenith "Darkwave" Laser Sniper Rifle')return 'Zenith Darkwave';
    if(/^Geist Armor Helmet/.test(name))return name.replace('Geist Armor Helmet','Geist Helm');
    return name==='BUL-H4 Armor'?'BUL-H4':name;
  },
  icon(name) {
    const extra={heart:'M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z',chevron:'m6 9 6 6 6-6',sliders:'M3 6h18 M3 12h18 M3 18h18 M7 3v6 M16 9v6 M10 15v6'};
    if(extra[name])return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${extra[name]}"/></svg>`;
    const paths={armor:'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z M8 11l3 3 5-6',clothing:'m8 4-5 3 3 5 2-1v10h8V11l2 1 3-5-5-3c-2 3-6 3-8 0Z',weapons:'m4 17 3 3 12-12-3-3-12 12Z M14 7l3 3 M4 20l-1 1 M17 4l2-2 3 3-2 2',tools:'m15 3-2 5 3 3 5-2a7 7 0 0 1-8 7l-6 6-4-4 6-6a7 7 0 0 1 6-9Z',ammunition:'M5 21V9l2-6 2 6v12H5Z M15 21V9l2-6 2 6v12h-4Z M5 16h4 M15 16h4',vehicle:'m12 2 5 8 5 7-10-3-10 3 5-7 5-8Z M12 2v12 M8 20h8',star:'m12 3 3 6 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1 3-6Z',target:'M21 12a9 9 0 1 1-9-9 M17 3v4h4 M12 12l8-8 M16 12a4 4 0 1 1-4-4',grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',list:'M8 5h13 M8 12h13 M8 19h13 M3 5h1 M3 12h1 M3 19h1',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',compare:'M4 4v16h16 M9 16V9 M14 16V3 M19 16v-5',broadcast:'M4 5h16v13H4z M8 22h8 M12 18v4 M10 8l5 3-5 3V8Z',arrow:'M4 12h16 M14 6l6 6-6 6',check:'m5 12 4 4L19 6'};
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(paths[name]||paths.grid).split(' M').map((p,i)=>`<path d="${i?'M':''}${p}"/>`).join('')}</svg>`;
  },
  download(name,value) {
    const blob=new Blob([typeof value==="string"?value:JSON.stringify(value,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
};
try { SCUI.apply(JSON.parse(localStorage.getItem("scbp-appearance")||"{}")); } catch { SCUI.apply({}); }
