"use strict";

const DATA_FILES = {
  scmdb: "data/scmdb-items.json",
  sync: "data/sync-status.json",
};

const WIKI_ITEM_API = "api/dossier/";
const MEDIA_HOSTS = new Set(["media.starcitizen.tools", "api.star-citizen.wiki"]);
const query = new URLSearchParams(window.location.search);
const settings = {
  status: ["open", "done", "all"].includes(query.get("status")) ? query.get("status") : "open",
  item: query.get("item")?.trim() || "",
  intervalSeconds: clamp(Number(query.get("interval")) || 20, 8, 120),
  allMissions: query.get("missions") === "all",
  showImage: query.get("image") !== "0",
  mission: "", theme: "obsidian", transparent: true, layout: "dossier",
};

const elements = {};
const state = {
  slides: [],
  index: 0,
  timer: 0,
  reloadTimer: 0,
  imageToken: 0,
  syncSignature: "",
  configSignature: "", rawOwned: null, rawSnapshot: null, controlBusy: false,
};

document.addEventListener("DOMContentLoaded", async () => {
  [
    "missionHud", "dataStatus", "itemStatus", "languageStatus", "itemName", "itemMeta",
    "missionContractor", "missionTitle", "missionOriginal", "missionDescription",
    "missionChance", "missionPool", "missionReward", "missionSystem", "missionStanding", "missionType",
    "slideCounter", "cycleProgress", "imageFrame", "itemImage",
  ].forEach((id) => { elements[id] = document.getElementById(id); });
  document.documentElement.style.setProperty("--cycle-seconds", `${settings.intervalSeconds}s`);
  await readRemoteControl(false);
  void loadOverlay();
  state.reloadTimer = window.setInterval(() => void checkForUpdates(), 60_000);
  window.setInterval(() => void readRemoteControl(true), 3000);
});

async function loadOverlay(keepItem = "") {
  stopCycle();
  try {
    const stamp = `?v=${Date.now()}`;
    const [snapshot, sync] = await Promise.all([
      fetchJson(DATA_FILES.scmdb + stamp),
      fetchJson(DATA_FILES.sync + stamp, false),
    ]);
    if(snapshot?.missions){const definitions=new Map(snapshot.missions.map(m=>[m.id,m]));snapshot.items=snapshot.items.map(i=>({...i,missions:(i.missions||[]).map(m=>({...definitions.get(m.id),...m}))}));}
    const canonical=await SCUI.api('/api/catalog');
    const owned={blueprints:canonical.items.map(i=>({key:i.name,ini:i.ini,isDone:i.isDone,atTime:i.acquiredAt}))};
    state.rawOwned = owned; state.rawSnapshot = snapshot;
    state.syncSignature = getSyncSignature(sync, snapshot);
    state.slides = createSlides(owned, snapshot);
    state.index = Math.max(0, state.slides.findIndex((slide) => slide.item.name === keepItem));
    if (!state.slides.length) {
      renderEmpty();
      return;
    }
    renderCurrent();
    if (state.slides.length > 1) startCycle();
  } catch (error) {
    console.error(error);
    renderError(error);
  }
}

async function readRemoteControl(rebuild) {
  if (state.controlBusy) return;
  state.controlBusy = true;
  try {
    const payload = await fetchJson('api/obs', false);
    const base = payload?.settings || {};
    const selection = query.get('follow') === '0' ? {} : (payload?.selection || {});
    const signature = JSON.stringify([base, selection, query.toString()]);
    if (signature === state.configSignature) return;
    state.configSignature = signature;
    Object.assign(settings, {
      status: base.status || 'open', item: base.item || '', mission: base.mission || '',
      intervalSeconds: base.interval || 20, allMissions: Boolean(base.allMissions),
      showImage: base.showImage !== false, theme: base.theme || 'obsidian', transparent: base.transparent !== false,
      layout: base.layout === 'strip' ? 'strip' : 'dossier',
    });
    if (query.has('status') && ['all','done','open'].includes(query.get('status'))) settings.status = query.get('status');
    if (query.has('item')) settings.item = query.get('item');
    if (query.has('mission')) settings.mission = query.get('mission');
    if (query.has('interval')) settings.intervalSeconds = clamp(Number(query.get('interval')) || 20, 8, 120);
    if (query.has('missions')) settings.allMissions = query.get('missions') === 'all';
    if (query.has('image')) settings.showImage = query.get('image') !== '0';
    if (query.has('theme')) settings.theme = query.get('theme');
    if (query.has('transparent')) settings.transparent = query.get('transparent') !== '0';
    if(query.has('layout'))settings.layout=query.get('layout')==='strip'?'strip':'dossier';
    if (selection.kind === 'item') { settings.item = selection.item; settings.mission = ''; settings.status = 'all'; }
    if (selection.kind === 'mission') { settings.mission = selection.mission; settings.item = ''; settings.status = 'all'; }
    SCUI.apply({theme:settings.theme,animations:!query.has('preview')},false);
    document.documentElement.dataset.transparent = String(settings.transparent);
    document.documentElement.dataset.layout=settings.layout;
    document.documentElement.style.setProperty('--cycle-seconds', `${settings.intervalSeconds}s`);
    if (rebuild && state.rawOwned && state.rawSnapshot) {
      stopCycle(); state.slides = createSlides(state.rawOwned,state.rawSnapshot); state.index = 0;
      if (state.slides.length) { renderCurrent(); if(state.slides.length>1)startCycle(); } else renderEmpty();
    }
  } finally { state.controlBusy = false; }
}

function createSlides(owned, snapshot) {
  const ownershipByIni = new Map();
  const ownershipByName = new Map();
  (owned?.blueprints || []).forEach((entry) => {
    if (entry.ini) ownershipByIni.set(entry.ini, entry);
    ownershipByName.set(normalize(entry.key), entry);
  });

  const matchingItems = (snapshot?.items || []).map((item) => {
    const ownership = ownershipByIni.get(item.ini) || ownershipByName.get(normalize(item.name)) || {};
    return { ...item, isDone: Boolean(ownership.isDone), acquiredAt: ownership.atTime || null };
  }).filter((item) => {
    if ((!Array.isArray(item.missions) || !item.missions.length) && !settings.item) return false;
    if (settings.status === "done" && !item.isDone) return false;
    if (settings.status === "open" && item.isDone) return false;
    if (settings.item && item.ini !== settings.item && !normalize(item.name).includes(normalize(settings.item))) return false;
    if (settings.mission && !(item.missions || []).some(m => m.id === settings.mission || m.debugName === settings.mission)) return false;
    return true;
  });

  const slides = matchingItems.flatMap((item) => {
    const available = settings.mission ? (item.missions || []).filter(m => m.id === settings.mission || m.debugName === settings.mission) : (item.missions || []);
    const missions = settings.allMissions || settings.mission ? available : available.slice(0, 1);
    if (!missions.length && settings.item) missions.push({title:"Keine Auftragsquelle hinterlegt",description:"Für diesen Bauplan ist im aktuellen SCMDB-Stand kein Auftrag bekannt. Weitere Details findest du im Dashboard.",active:true,translation:{translatedFields:['title','description']}});
    return missions.map((mission) => ({ item, mission }));
  });
  return shuffleDaily(slides);
}

function renderCurrent() {
  const slide = state.slides[state.index];
  if (!slide) return;
  const { item, mission } = slide;
  const translatedFields = new Set(mission.translation?.translatedFields || []);
  const language = translatedFields.has("title") && translatedFields.has("description")
    ? "DEUTSCH"
    : translatedFields.has("description") ? "BESCHREIBUNG DE" : translatedFields.size ? "TEILWEISE DE" : "ORIGINAL";
  const profile = item.profile || {};
  const type = [item.blueprint?.type, item.blueprint?.subtype].filter(Boolean).join(" · ") || profile.itemType || "ITEM";
  const manufacturer = item.blueprint?.manufacturer || profile.manufacturer || "HERSTELLER UNBEKANNT";

  elements.dataStatus.textContent = mission.active ? "LIVE-DATENSATZ" : "EVENT / INAKTIV";
  elements.itemStatus.textContent = item.isDone ? "BAUPLAN ERHALTEN" : "GESUCHTER BAUPLAN";
  elements.languageStatus.textContent = language;
  elements.itemName.textContent = item.name;
  elements.itemMeta.textContent = `${manufacturer} // ${type}`.toUpperCase();
  elements.missionContractor.textContent = mission.contractor || "UNBEKANNTER AUFTRAGGEBER";
  elements.missionTitle.textContent = mission.title || "Unbenannter Auftrag";
  elements.missionOriginal.hidden = !mission.titleOriginal;
  elements.missionOriginal.textContent = mission.titleOriginal ? `Original: ${mission.titleOriginal}` : "";
  elements.missionDescription.textContent = mission.description || "Für diesen Auftrag ist keine Beschreibung hinterlegt.";
  elements.missionChance.textContent = formatPercent(mission.combinedChancePercent);
  elements.missionPool.textContent = formatMissionPool(mission);
  elements.missionReward.textContent = mission.rewardUEC == null ? "—" : `${formatNumber(mission.rewardUEC)} aUEC`;
  elements.missionSystem.textContent = mission.systems?.length ? mission.systems.join(" · ") : "—";
  elements.missionStanding.textContent = mission.minStanding || "OHNE VORGABE";
  elements.missionType.textContent = mission.missionType || mission.category || "AUFTRAG";
  elements.slideCounter.textContent = `${String(state.index + 1).padStart(2, "0")} / ${String(state.slides.length).padStart(2, "0")}`;
  elements.missionHud.classList.toggle("is-inactive", !mission.active);
  elements.missionHud.classList.remove("is-loading", "is-switching");
  renderStrip(item,mission);
  void loadItemImage(item);
  restartProgress();
}

async function loadItemImage(item) {
  const token = ++state.imageToken;
  elements.imageFrame.classList.add("is-empty");
  elements.imageFrame.hidden = !settings.showImage;
  document.querySelector('.hud-layout').style.gridTemplateColumns = settings.showImage ? '' : '1fr';
  elements.imageFrame.querySelector('figcaption').textContent = 'KEIN BILD VERFÜGBAR';
  elements.itemImage.removeAttribute("src");
  elements.itemImage.alt = "";
  document.getElementById('stripImage').removeAttribute('src');
  document.getElementById('stripImageFrame').hidden=!settings.showImage;
  if (!settings.showImage || !isUuid(item.blueprint?.entityClass)) return;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${WIKI_ITEM_API}${encodeURIComponent(item.blueprint.entityClass)}`, { cache: "force-cache", signal: controller.signal });
    if (!response.ok) return;
    const payload = await response.json();
    const candidate = (payload?.data?.images || []).map((entry) => safeImageUrl(entry.thumbnail_url || entry.original_url)).find(Boolean);
    if (token !== state.imageToken || !candidate) return;
    elements.itemImage.onload = () => {
      if (token === state.imageToken) { elements.imageFrame.classList.remove("is-empty"); elements.imageFrame.querySelector('figcaption').textContent = 'LOKALER BILDSPEICHER'; const stripImage=document.getElementById('stripImage');stripImage.alt=item.name;stripImage.src=candidate;stripImage.onerror=()=>stripImage.removeAttribute('src'); }
    };
    elements.itemImage.onerror = () => elements.imageFrame.classList.add("is-empty");
    elements.itemImage.alt = item.name;
    elements.itemImage.src = candidate;
  } catch (error) {
    console.warn(`Bild für ${item.name} nicht verfügbar.`, error);
  } finally {
    window.clearTimeout(timeout);
  }
}

function startCycle() {
  state.timer = window.setInterval(() => {
    elements.missionHud.classList.add("is-switching");
    window.setTimeout(() => {
      state.index = (state.index + 1) % state.slides.length;
      renderCurrent();
    }, 260);
  }, settings.intervalSeconds * 1000);
}

function stopCycle() {
  if (state.timer) window.clearInterval(state.timer);
  state.timer = 0;
}

function restartProgress() {
  elements.cycleProgress.classList.remove("is-running");
  void elements.cycleProgress.offsetWidth;
  if (state.slides.length > 1) elements.cycleProgress.classList.add("is-running");
}

async function checkForUpdates() {
  try {
    const sync = await fetchJson(`${DATA_FILES.sync}?v=${Date.now()}`, false);
    const snapshot = state.rawSnapshot;
    const signature = getSyncSignature(sync, snapshot);
    if (signature && signature !== state.syncSignature) {
      const currentItem = state.slides[state.index]?.item?.name || "";
      await loadOverlay(currentItem);
    }
  } catch (error) {
    console.warn("OBS-Datenprüfung fehlgeschlagen.", error);
  }
}

function renderEmpty() {
  renderStrip(null,{title:'Für diesen Filter ist kein Auftrag verfügbar'});
  elements.dataStatus.textContent = "KEINE PASSENDEN DATEN";
  elements.itemStatus.textContent = "FILTER OHNE TREFFER";
  elements.languageStatus.textContent = "BEREIT";
  elements.itemName.textContent = settings.item || "Keine Baupläne gefunden";
  elements.itemMeta.textContent = "Passe die OBS-URL-Parameter an";
  elements.missionContractor.textContent = "HINWEIS";
  elements.missionTitle.textContent = "Für diesen Filter ist kein Auftrag verfügbar";
  elements.missionDescription.textContent = "Nutze status=open, status=done oder status=all. Mit item=NAME kannst du einen bestimmten Bauplan fest einstellen.";
  elements.missionOriginal.hidden = true;
  [elements.missionChance, elements.missionPool, elements.missionReward, elements.missionSystem, elements.missionStanding].forEach((element) => { element.textContent = "—"; });
  elements.missionType.textContent = "OBS BROWSERQUELLE";
  elements.slideCounter.textContent = "00 / 00";
  elements.imageFrame.classList.add("is-empty");
  elements.missionHud.classList.remove("is-loading", "is-switching");
}

function renderError(error) {
  renderEmpty();
  document.getElementById('stripTitle').textContent='Dashboard-Daten nicht erreichbar';
  document.getElementById('stripMission').textContent=error?.message||'Prüfe den Synology-Container.';
  elements.dataStatus.textContent = "DATENFEHLER";
  elements.itemName.textContent = "Dashboard-Daten nicht erreichbar";
  elements.missionDescription.textContent = error?.message || "Prüfe den Synology-Container und die eingebundenen Daten.";
}

function renderStrip(item,mission) {
  document.getElementById('stripStatus').textContent=item?.isDone?'BAUPLAN ERHALTEN':item?'NÄCHSTER BAUPLAN':'KEINE PASSENDEN DATEN';
  const stripTitle=document.getElementById('stripTitle'),fullName=item?.name||settings.item||'Keine Baupläne gefunden';
  stripTitle.textContent=SCUI.itemLabel(fullName);stripTitle.title=fullName;stripTitle.setAttribute('aria-label',fullName);
  document.getElementById('stripMission').textContent=mission?.title||'Keine Auftragsquelle hinterlegt';
  document.getElementById('stripReward').textContent=mission?.rewardUEC==null?'—':formatNumber(mission.rewardUEC)+' aUEC';
  const all=state.rawOwned?.blueprints||[],done=all.filter(i=>i.isDone).length;
  document.getElementById('stripProgress').style.width=(all.length?done/all.length*100:0)+'%';
  document.getElementById('stripProgressLabel').textContent=`${formatNumber(done)} / ${formatNumber(all.length)} BAUPLÄNE ERHALTEN`;
  if(!item)document.getElementById('stripImage').removeAttribute('src');
  document.getElementById('stripImageFrame').hidden=!settings.showImage;
}

async function fetchJson(url, required = true) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    if (required) throw error;
    return null;
  }
}

function getSyncSignature(sync, snapshot) {
  return [
    sync?.lastSuccess || snapshot?._meta?.generatedAt || "",
    sync?.scmdbVersion || snapshot?._meta?.scmdbVersion || "",
    sync?.translationVersion || snapshot?._meta?.translationVersion || "",
  ].join("|");
}

function safeImageUrl(value) {
  if(typeof value==='string'&&value.startsWith('/media/')&&!value.includes('..'))return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && MEDIA_HOSTS.has(url.hostname) ? url.toString() : "";
  } catch { return ""; }
}

function shuffleDaily(values) {
  const result = [...values];
  const daySeed = Math.floor(Date.now() / 86_400_000);
  let seed = daySeed || 1;
  for (let index = result.length - 1; index > 0; index -= 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const target = seed % (index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function normalize(value) {
  return String(value || "").normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase("de-DE");
}

function formatNumber(value) { return new Intl.NumberFormat("de-DE").format(Number(value) || 0); }
function formatPercent(value) { return value == null || Number.isNaN(Number(value)) ? "—" : `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(Number(value))} %`; }
function formatMissionPool(mission) {
  const pools = Array.isArray(mission?.rewardPools) ? mission.rewardPools : [];
  if (pools.length) {
    const totalItems = pools.reduce((sum, pool) => sum + (Number(pool.size) || pool.items?.length || 0), 0);
    return `${pools.length} ${pools.length === 1 ? "POOL" : "POOLS"} · ${formatNumber(totalItems)} ITEMS`;
  }
  const size = Number(mission?.poolSize);
  return size > 0 ? `1 VON ${formatNumber(size)}` : "—";
}
function clamp(value, minimum, maximum) { return Math.min(maximum, Math.max(minimum, value)); }
function isUuid(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "")); }
