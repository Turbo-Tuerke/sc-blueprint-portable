"use strict";

const DATA_FILES = {
  scan: "/data/scan-state.json",
  scmdb: "/data/scmdb-items.json",
  sync: "/data/sync-status.json",
};

const WIKI_ITEM_API = "/api/dossier/";
const ALLOWED_MEDIA_HOSTS = new Set(["media.starcitizen.tools", "api.star-citizen.wiki"]);

const CATEGORY_LABELS = {
  "Ballistic Cannon": "Ballistische Kanone",
  "Ballistic Gatling": "Ballistische Gatling",
  "Ballistic Repeater": "Ballistischer Repeater",
  "Cargo": "Fracht",
  "Char_Clothing_Feet": "Bekleidung · Füße",
  "Char_Clothing_Legs": "Bekleidung · Beine",
  "Char_Clothing_Torso_0": "Bekleidung · Oberkörper",
  "Char_Clothing_Torso_1": "Bekleidung · Oberkörper",
  "Container": "Behälter",
  "Cooler": "Kühler",
  "Core Armor": "Brustrüstung",
  "Dist. Cannon": "Verzerrungskanone",
  "Dist. Repeater": "Verzerrungs-Repeater",
  "FPS Weapon": "FPS-Waffe",
  "FPS, LMG": "FPS · LMG",
  "FPS, Pistol": "FPS · Pistole",
  "FPS, Rifle": "FPS · Gewehr",
  "FPS, Shotgun": "FPS · Schrotflinte",
  "FPS, SMG": "FPS · SMG",
  "FPS, Sniper": "FPS · Scharfschützengewehr",
  "Fuel Nozzle": "Betankungsdüse",
  "Heavy Armor": "Schwere Rüstung",
  "Heavy Helmet": "Schwerer Helm",
  "Helmet": "Helm",
  "Laser Cannon": "Laserkanone",
  "Laser Gatling": "Laser-Gatling",
  "Laser Repeater": "Laser-Repeater",
  "Light Armor": "Leichte Rüstung",
  "Light Helmet": "Leichter Helm",
  "Magazine": "Magazin",
  "Mass Driver": "Massentreiber",
  "Medium Armor": "Mittlere Rüstung",
  "Medium Helmet": "Mittlerer Helm",
  "Mining Laser": "Bergbaulaser",
  "MiningModifier": "Bergbau-Modul",
  "Misc": "Sonstiges",
  "Neutron Cannon": "Neutronenkanone",
  "Power Plant": "Kraftwerk",
  "Quantum Drive": "Quantumantrieb",
  "Radar": "Radar",
  "Salvage Head": "Bergungskopf",
  "Salvage Modifier": "Bergungs-Modul",
  "Scatter Gun": "Streuschrotflinte",
  "Shield": "Schildgenerator",
  "Ship Weapon": "Schiffswaffe",
  "Tractor Beam": "Traktorstrahl",
  "Undersuit": "Basisanzug",
  "Unbekannt": "Nicht zugeordnet",
};

const MAIN_CATEGORIES = [
  {
    id: "armor", label: "Rüstung", icon: "⬡",
    children: [
      ["armor-undersuits", "Basisanzüge"], ["armor-helmets", "Helme"], ["armor-torso", "Brust"],
      ["armor-arms", "Arme"], ["armor-legs", "Beine"], ["armor-backpacks", "Rucksäcke"], ["armor-flair", "Flair"],
    ],
  },
  {
    id: "clothing", label: "Kleidung", icon: "◇",
    children: [
      ["clothing-hats", "Hüte"], ["clothing-tops", "Oberteile"], ["clothing-jackets", "Jacken"],
      ["clothing-gloves", "Handschuhe"], ["clothing-pants", "Hosen"], ["clothing-shoes", "Schuhe"], ["clothing-glasses", "Brillen"],
    ],
  },
  {
    id: "weapons", label: "Waffen", icon: "⌁",
    children: [
      ["weapons-pistols", "Pistolen"], ["weapons-longarms", "Langwaffen"], ["weapons-special", "Spezielles"],
      ["weapons-melee", "Nahkampf"], ["weapons-attachments", "Anbauteile"], ["weapons-throwables", "Wurfwaffen"],
    ],
  },
  {
    id: "tools", label: "Werkzeuge", icon: "⌕",
    children: [
      ["tools-tools", "Werkzeuge"], ["tools-accessories", "Zubehör"], ["tools-medical", "Medizinisch"],
      ["tools-cryptokeys", "CryptoKeys"], ["tools-technology", "Technologie"],
    ],
  },
  {
    id: "ammunition", label: "Munition", icon: "▥",
    children: [["ammunition-all", "Munition & Magazine"]],
  },
  {
    id: "vehicle", label: "Vehikel", icon: "➤",
    children: [
      ["vehicle-artillery", "Artillerie"], ["vehicle-coolers", "Kühler"], ["vehicle-emp", "EMP"],
      ["vehicle-mining", "Bergbau"], ["vehicle-mining-modules", "Bergbau-Module"], ["vehicle-ore-pods", "Erzbehälter"],
      ["vehicle-missile-racks", "Raketengestelle"], ["vehicle-powerplants", "Kraftwerke"], ["vehicle-quantumdrives", "QT-Antriebe"],
      ["vehicle-shields", "Schilde"], ["vehicle-turrets", "Geschütze"], ["vehicle-weapons", "Waffen"],
      ["vehicle-decoys", "Täuschkörper"], ["vehicle-paints", "Lackierungen"], ["vehicle-jumpmodules", "Sprungmodule"],
      ["vehicle-radar", "Radar"], ["vehicle-refuelling", "Betankung"], ["vehicle-salvage", "Bergung"],
      ["vehicle-tractorbeam", "Traktorstrahl"],
    ],
  },
];

const ALL_CATEGORY_KEYS = MAIN_CATEGORIES.flatMap((group) => group.children.map(([key]) => key));
const FACET_NAMES = ["armorClass", "armorSlot", "armorSubtype", "weaponClass", "weaponSubtype", "ammoSubtype", "shipWeaponSubtype"];

const state = {
  items: [],
  filtered: [],
  categories: [],
  current: null,
  backup: null,
  scan: null,
  catalog: null,
  scmdb: null,
  sync: null,
  syncSignature: "",
  missionDefinitions: new Map(),
  detailToken: 0,
  wikiCache: new Map(),
  filters: createDefaultFilters(),
  categorySelectionInitialized: false,
  visibleCount: 80,
  pageSize: 80,
};

const elements = {};

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();

  bindEvents();
  registerWebMcpTools();
  await initializeV2();
  window.FilterLayouts?.mount();
  void loadDashboard();
  startSyncWatcher();
});

function cacheElements() {
  const ids = [
    "systemState", "refreshButton", "sourceVersion", "heroNote", "progressOrbit",
    "doneCount", "totalCount", "progressPercent", "openCount", "latestAcquisition",
    "logFileCount", "catalogCount", "catalogCoverage", "scanTimestamp", "scmdbVersion", "translationStatus",
    "syncTimestamp", "syncBadge", "syncBadgeText", "activityTotal", "activityChart",
    "newIntel", "newBlueprintCount", "newBlueprints", "resultCount", "searchInput",
    "categorySelect", "sortSelect", "categoryList", "categoryAllCheck", "categorySelectionCount", "blueprintRows", "emptyState",
    "resetFiltersButton", "resetFiltersEmpty", "activeFilterCount", "pagination", "loadMoreButton",
    "facetToggle", "facetBody", "allTypeButton", "sizeMin", "sizeMax", "sizeRange", "sizeRangeOutput",
    "dynamicMode", "dynamicFilterHint", "armorFilters", "weaponFilters", "ammoFilters", "shipWeaponFilters",
    "detailDialog", "closeDialog",
    "detailType", "detailTitle", "detailStatus", "detailGrid", "detailGallery",
    "detailLore", "detailLoreText", "detailLoreSource", "detailSourceLinks",
    "detailDescription", "detailDescriptionText", "detailRecipe", "detailCraftTime",
    "detailRecipeContent", "detailMaterialSources", "detailAcquisition", "detailMissionCount",
    "detailAcquisitionHint", "detailMissionList", "toast", "footerVersion",
  ];

  ids.forEach((id) => { elements[id] = document.getElementById(id); });
  elements.statusTabs = [...document.querySelectorAll(".status-tab")];
  elements.typeFilterButtons = [...document.querySelectorAll("[data-type-filter]")];
  elements.facetButtons = [...document.querySelectorAll("[data-facet][data-value]")];
}


function bindEvents() {
  elements.categoryAllCheck.addEventListener("change", () => {
    state.filters.categories = new Set(elements.categoryAllCheck.checked ? ALL_CATEGORY_KEYS : []);
    elements.categorySelect.value = "all";
    syncCategoryControls();
    resetVisibleAndRender();
  });
  elements.refreshButton.addEventListener("click", () => void loadDashboard(true));
  elements.searchInput.addEventListener("input", (event) => {
    state.filters.query = event.target.value.trim();
    resetVisibleAndRender();
  });

  elements.statusTabs.forEach((button) => {
    button.addEventListener("click", () => {
      state.filters.status = button.dataset.status;
      elements.statusTabs.forEach((tab) => {
        const active = tab === button;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-pressed", String(active));
      });
      resetVisibleAndRender();
    });
  });

  elements.categorySelect.addEventListener("change", (event) => {
    setCategoryShortcut(event.target.value);
    resetVisibleAndRender();
  });
  elements.sortSelect.addEventListener("change", (event) => {
    state.filters.sort = event.target.value;
    resetVisibleAndRender();
  });
  elements.resetFiltersButton.addEventListener("click", resetFilters);
  elements.resetFiltersEmpty.addEventListener("click", resetFilters);
  elements.allTypeButton.addEventListener("click", () => {
    state.filters.types.clear();
    clearDynamicFacets();
    syncFacetControls();
    resetVisibleAndRender();
  });
  elements.typeFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      toggleSetValue(state.filters.types, button.dataset.typeFilter);
      clearHiddenDynamicFacets();
      syncFacetControls();
      resetVisibleAndRender();
    });
  });
  elements.facetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const facet = button.dataset.facet;
      if (!state.filters[facet]) return;
      toggleSetValue(state.filters[facet], button.dataset.value);
      syncFacetControls();
      resetVisibleAndRender();
    });
  });
  elements.sizeMin.addEventListener("input", () => updateSizeRange("min"));
  elements.sizeMax.addEventListener("input", () => updateSizeRange("max"));
  elements.facetToggle.addEventListener("click", () => {
    const expanded = elements.facetToggle.getAttribute("aria-expanded") !== "false";
    elements.facetToggle.setAttribute("aria-expanded", String(!expanded));
    elements.facetToggle.textContent = expanded ? "FILTER AUSKLAPPEN" : "FILTER EINKLAPPEN";
    elements.facetBody.hidden = expanded;
  });
  elements.loadMoreButton.addEventListener("click", () => {
    state.visibleCount += state.pageSize;
    renderTable();
  });
  elements.closeDialog.addEventListener("click", () => elements.detailDialog.close());
  elements.detailDialog.addEventListener("click", (event) => {
    if (event.target === elements.detailDialog && !(window.ArchiveLayouts?.active && ArchiveLayouts.media.matches)) elements.detailDialog.close();
  });

  document.addEventListener("keydown", (event) => {
    const activeTag = document.activeElement?.tagName;
    const isTyping = activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT";
    if (event.key === "/" && !isTyping) {
      event.preventDefault();
      elements.searchInput.focus();
    }
  });
}

function registerWebMcpTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  const reportError = (error) => console.warn("WebMCP-Werkzeug konnte nicht registriert werden.", error);
  const registrations = [
    context.registerTool({
      name: "get_blueprint_overview",
      title: "Bauplanübersicht lesen",
      description: "Liest Fortschritt, SCMDB-Abdeckung und Kategorien, ohne die Ansicht zu verändern.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute() {
        const done = state.items.filter((item) => item.isDone).length;
        return {
          total: state.items.length,
          acquired: done,
          open: state.items.length - done,
          withScmdbData: state.items.filter((item) => item.hasScmdb).length,
          withMissionSources: state.items.filter((item) => item.missionCount > 0).length,
          scmdbVersion: state.scmdb?._meta?.scmdbVersion || null,
          progressPercent: state.items.length ? Number(((done / state.items.length) * 100).toFixed(1)) : 0,
          categories: state.categories.map((group) => ({
            key: group.id,
            label: group.label,
            total: group.total,
            acquired: group.done,
            subcategories: group.children.map((category) => ({
              key: category.key, label: category.label, total: category.total, acquired: category.done,
            })),
          })),
        };
      },
    }, { signal: lifecycle.signal }),
    context.registerTool({
      name: "filter_blueprints",
      title: "Baupläne filtern",
      description: "Aktualisiert Suche, Besitzstatus, Kategorie und Sortierung in der sichtbaren Bauplanliste.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Freitext für Item, Hersteller, Auftraggeber oder INI-Schlüssel." },
          status: { type: "string", enum: ["all", "done", "open"] },
          category: { type: "string", description: "Exakter Kategorie-Schlüssel oder all." },
          sort: { type: "string", enum: ["name", "recent", "category"] },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input = {}) {
        if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Ungültige Filterangaben.");
        const statuses = new Set(["all", "done", "open"]);
        const sorts = new Set(["name", "recent", "category"]);
        const categoryKeys = new Set(["all", ...state.categories.map((group) => group.id), ...ALL_CATEGORY_KEYS]);
        if (input.status !== undefined && !statuses.has(input.status)) throw new Error("Unbekannter Besitzstatus.");
        if (input.sort !== undefined && !sorts.has(input.sort)) throw new Error("Unbekannte Sortierung.");
        if (input.category !== undefined && !categoryKeys.has(input.category)) throw new Error("Unbekannte Kategorie.");
        if (input.query !== undefined && typeof input.query !== "string") throw new Error("Die Suche muss Text sein.");
        if (input.query !== undefined) state.filters.query = input.query.trim();
        if (input.status !== undefined) state.filters.status = input.status;
        if (input.category !== undefined) setCategoryShortcut(input.category);
        if (input.sort !== undefined) state.filters.sort = input.sort;
        elements.searchInput.value = state.filters.query;
        if (input.category !== undefined) elements.categorySelect.value = input.category;
        elements.sortSelect.value = state.filters.sort;
        elements.statusTabs.forEach((tab) => {
          const active = tab.dataset.status === state.filters.status;
          tab.classList.toggle("is-active", active);
          tab.setAttribute("aria-pressed", String(active));
        });
        syncCategoryControls();
        syncFacetControls();
        resetVisibleAndRender();
        return { resultCount: state.filtered.length, filters: serializeFilters() };
      },
    }, { signal: lifecycle.signal }),
  ];
  registrations.forEach((registration) => {
    try { void Promise.resolve(registration).catch(reportError); } catch (error) { reportError(error); }
  });
}

async function loadDashboard(isRefresh = false, automatic = false) {
  setSystemState("loading", automatic ? "NEUER DATENSTAND ERKANNT" : isRefresh ? "DATEN WERDEN AKTUALISIERT" : "DATEN WERDEN GELADEN");
  elements.refreshButton.disabled = true;
  elements.refreshButton.setAttribute("aria-busy", "true");
  try {
    const stamp = `?v=${Date.now()}`;
    // 5.6.0: keine Launcher-Dateien mehr; Katalog, Typen und Besitz kommen vom Server.
    let [scan, scmdb, sync, scanner, liveConfig] = await Promise.all([
      fetchJson(DATA_FILES.scan + stamp),
      SCUI.api('/api/catalog/data'),
      fetchJson(DATA_FILES.sync + stamp),
      // 5.3.1: aktueller Stand von Logscanner und Windows-Helfer (die Dateien oben sind Altbestand)
      SCUI.api('/api/scanner').catch(() => null),
      SCUI.api('/api/config').catch(() => null),
    ]);
    const catalog = scmdb?.catalog || null;
    state.scan = scan;
    state.catalog = catalog;
    state.scmdb = scmdb;
    state.sync = sync;
    state.scanner = scanner;
    state.agent = liveConfig?.agent || null;
    if (!scanner) setTimeout(async () => {   // direkt nach dem Serverstart ist der Scanner evtl. noch nicht bereit
      state.scanner = await SCUI.api('/api/scanner').catch(() => null);
      if (state.scanner) renderOverview();
    }, 5000);
    state.missionDefinitions = new Map((scmdb?.missions || []).flatMap((mission) => {
      const keys = [mission.id, mission.debugName].filter(Boolean);
      return keys.map((key) => [String(key), mission]);
    }));
    state.syncSignature = getSyncSignature(sync);
    const identities=await SCUI.api("/api/catalog");
    state.catalogSignature=identities.signature;
    if(!identities.items?.length)throw new Error(identities.error||'Kein gültiger Katalog');
    const canonicalCurrent={blueprints:identities.items.map(i=>({key:i.name,ini:i.ini,isDone:i.isDone,atTime:i.acquiredAt}))};
    const typeMap=Object.fromEntries(identities.items.filter(i=>i.rawType).map(i=>[i.name,i.rawType]));
    state.items = buildItems(canonicalCurrent, typeMap, catalog, scmdb);
    const byIni=new Map(identities.items.map(i=>[i.ini,i]));
    state.items.forEach(i=>{const canonical=byIni.get(i.ini);if(canonical){i.stableId=canonical.id;i.manualOwned=canonical.manualOwned;i.ownershipSource=canonical.ownershipSource;i.logConfirmed=canonical.logConfirmed;i.automaticOwned=canonical.automaticOwned;i.uuid=canonical.uuid;i.mainCategory=canonical.mainCategory;i.subCategory=canonical.subCategory;}});
    state.categories = aggregateCategories(state.items);
    initializeCategorySelection();
    renderOverview();
    renderNewIntel();
    renderCategoryControls();
    syncFacetControls();
    resetVisibleAndRender();
    setSystemState("online", sync?.mode === "windows-autosync" ? "AUTO-SYNC AKTIV" : "LOKALER DATENBESTAND AKTIV");
    if (elements.detailDialog.open && bp.detailItem) {
      const updated = state.items.find(item => itemKey(item) === itemKey(bp.detailItem));
      if (updated) openDetails(updated.id);
    }
    if (automatic) showToast("Neue lokale und SCMDB-Daten wurden automatisch eingelesen.");
    else if (isRefresh) showToast("Lokaler Bauplan- und SCMDB-Bestand wurde neu eingelesen.");
  } catch (error) {
    console.error(error);
    setSystemState("error", "DATENQUELLE NICHT ERREICHBAR");
    if (!state.items.length) renderFatalError(error);
    showToast(state.items.length ? "Aktualisierung fehlgeschlagen. Der letzte geladene Bestand bleibt sichtbar." : "Die benötigten JSON-Dateien konnten nicht geladen werden.", true);
  } finally {
    elements.refreshButton.disabled = false;
    elements.refreshButton.removeAttribute("aria-busy");
  }
}

async function fetchJson(url, required = false) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    if (required) throw error;
    console.warn(`Optionale Datenquelle nicht verfügbar: ${url}`, error);
    return null;
  }
}

function buildItems(current, typeMap, catalog, scmdb) {
  const normalizedTypes = new Map(Object.entries(typeMap || {}).map(([name, type]) => [normalize(name), type]));
  const catalogByKey = new Map();
  const catalogByName = new Map();
  const scmdbByKey = new Map();
  const scmdbByName = new Map();
  (catalog?.entries || []).forEach((entry) => {
    if (entry.nameKey && !catalogByKey.has(entry.nameKey)) catalogByKey.set(entry.nameKey.replace(/,P$/, ""), entry);
    if (entry.name && !catalogByName.has(normalize(entry.name))) catalogByName.set(normalize(entry.name), entry);
  });
  (scmdb?.items || []).forEach((entry) => {
    if (entry.ini && !scmdbByKey.has(entry.ini)) scmdbByKey.set(entry.ini, entry);
    if (entry.name && !scmdbByName.has(normalize(entry.name))) scmdbByName.set(normalize(entry.name), entry);
  });

  return (current.blueprints || []).map((blueprint, index) => {
    const normalizedName = normalize(blueprint.key);
    const catalogEntry = catalogByKey.get(blueprint.ini) || null;
    const scmdbEntry = scmdbByKey.get(blueprint.ini) || null;
    let rawType = normalizedTypes.get(normalizedName);
    if (!rawType && normalizedName === "s0 hofstede") rawType = normalizedTypes.get("s00 hofstede");
    rawType ||= "Unbekannt";
    const timestamp = blueprint.atTime ? Date.parse(blueprint.atTime) : 0;
    const manufacturer = catalogEntry?.manufacturer || scmdbEntry?.profile?.manufacturer || scmdbEntry?.blueprint?.manufacturer || "—";
    const localizedType = catalogEntry?.itemType || localizeCategory(rawType);
    const missions = Array.isArray(scmdbEntry?.missions) ? scmdbEntry.missions.map(m=>({...getMissionDefinition(m),...m})) : [];
    const missionSearch = missions.flatMap((mission) => [
      mission.title, mission.titleOriginal, mission.description, mission.descriptionOriginal,
      mission.contractor, mission.missionType, ...(mission.systems || []),
    ]);
    const taxonomy = classifyTaxonomy(rawType, scmdbEntry, catalogEntry);
    const facets = createFacetInfo(rawType, scmdbEntry, catalogEntry, taxonomy);
    return {
      id: index,
      name: blueprint.key,
      ini: blueprint.ini || "",
      isDone: Boolean(blueprint.isDone),
      isMarked: Boolean(blueprint.isMarked),
      acquiredAt: blueprint.atTime || null,
      timestamp: Number.isFinite(timestamp) ? timestamp : 0,
      rawType,
      type: localizeCategory(rawType),
      localizedType,
      manufacturer,
      size: catalogEntry?.size || scmdbEntry?.profile?.size || "—",
      grade: catalogEntry?.grade || scmdbEntry?.profile?.grade || "—",
      entityClass: catalogEntry?.entityClass || scmdbEntry?.blueprint?.entityClass || "—",
      description: catalogEntry?.description || "",
      hasCatalog: Boolean(catalogEntry),
      hasScmdb: Boolean(scmdbEntry?.matched),
      missionCount: Number(scmdbEntry?.missionCount) || 0,
      mainCategory: taxonomy.main,
      subCategory: taxonomy.sub,
      facets,
      scmdb: scmdbEntry?{...scmdbEntry,missions}:null,
      searchable: normalize([blueprint.key, blueprint.ini, rawType, localizedType, manufacturer, catalogEntry?.entityClass, ...missionSearch].filter(Boolean).join(" ")),
    };
  });
}

function aggregateCategories(items) {
  return MAIN_CATEGORIES.map((definition) => {
    const children = definition.children.map(([key, label]) => {
      const matching = items.filter((item) => item.subCategory === key);
      return {
        key, label,
        total: matching.length,
        done: matching.filter((item) => item.isDone).length,
      };
    });
    return {
      id: definition.id,
      label: definition.label,
      icon: definition.icon,
      children,
      total: children.reduce((sum, child) => sum + child.total, 0),
      done: children.reduce((sum, child) => sum + child.done, 0),
    };
  });
}

function renderOverview() {
  const total = state.items.length;
  const done = state.items.filter((item) => item.isDone).length;
  const open = total - done;
  const percent = total ? (done / total) * 100 : 0;
  const latest = [...state.items].filter((item) => item.isDone).sort((a, b) => b.timestamp - a.timestamp)[0];
  const linked = state.items.filter((item) => item.hasCatalog).length;
  const scmdbLinked = state.items.filter((item) => item.hasScmdb).length;
  const scan = summarizeScan(state.scan);
  elements.doneCount.textContent = formatNumber(done);
  elements.totalCount.textContent = formatNumber(total);
  elements.openCount.textContent = formatNumber(open);
  elements.progressPercent.textContent = `${formatDecimal(percent)} %`;
  elements.progressOrbit.style.setProperty("--progress", `${percent * 3.6}deg`);
  elements.progressOrbit.setAttribute("aria-valuenow", percent.toFixed(1));
  elements.latestAcquisition.textContent = latest ? latest.name : "Keine Daten";
  elements.heroNote.textContent = `${formatNumber(done)} Baupläne erhalten · ${formatNumber(open)} noch offen · ${formatNumber(scmdbLinked)} mit SCMDB-Dossier.`;
  const catalogDate = state.scmdb?._meta?.generatedAt ? formatDate(state.scmdb._meta.generatedAt) : "unbekannt";
  elements.sourceVersion.textContent = `KATALOG // ${catalogDate.toUpperCase()}`;
  elements.logFileCount.textContent = scan.fileCount ? formatNumber(scan.fileCount) : "—";
  elements.catalogCount.textContent = state.catalog?.entries?.length ? formatNumber(state.catalog.entries.length) : "—";
  elements.catalogCoverage.textContent = `${formatNumber(linked)} / ${formatNumber(total)}`;
  const liveScan = state.scanner?.lastScan ? new Date(state.scanner.lastScan) : null;
  const lastScan = [liveScan, scan.lastScan].filter((d) => d && !isNaN(d)).sort((a, b) => b - a)[0];
  elements.scanTimestamp.textContent = lastScan ? formatDate(lastScan) : "—";
  elements.scmdbVersion.textContent = formatScmdbVersion(state.scmdb?._meta?.scmdbVersion);
  const translatedMissionLinks = Number(state.scmdb?._meta?.translatedMissionLinks) || 0;
  elements.translationStatus.textContent = state.scmdb?._meta?.translationVersion
    ? `${formatNumber(translatedMissionLinks)} FUNDWEGE · DE`
    : "NICHT GELADEN";
  const syncTimes = [state.agent?.lastSuccess, state.sync?.lastSuccess].filter(Boolean).sort((a, b) => new Date(b) - new Date(a));
  elements.syncTimestamp.textContent = syncTimes.length
    ? formatDateTime(syncTimes[0])
    : state.scmdb?._meta?.generatedAt ? formatDateTime(state.scmdb._meta.generatedAt) : "—";
  document.getElementById("quickDossiers").textContent = `${formatNumber(scmdbLinked)} / ${formatNumber(total)}`;
  document.getElementById("quickSync").textContent = elements.syncTimestamp.textContent;
  renderSyncBadge();
  const patch = state.catalog?._meta?.version_patch;
  elements.footerVersion.textContent = patch ? `DASHBOARD 6.0.0 · CATALOG ${String(patch).toUpperCase()}` : "DASHBOARD 6.0.0";
  renderActivityChart();
}

function renderSyncBadge() {
  const automated = state.sync?.mode === "windows-autosync";
  const error = automated && state.sync?.status === "error";
  elements.syncBadge.classList.toggle("is-snapshot", !automated);
  elements.syncBadge.classList.toggle("is-error", error);
  elements.syncBadgeText.textContent = error ? "SYNC-FEHLER" : automated ? "AUTO-SYNC" : "PAKET-SNAPSHOT";
}

function summarizeScan(scan) {
  const fileEntries = Object.values(scan?.files || {});
  const mtimes = fileEntries.map((entry) => Number(entry.mtime) || 0).filter(Boolean);
  return { fileCount: fileEntries.length, lastScan: mtimes.length ? new Date(Math.max(...mtimes)) : null };
}

function renderActivityChart() {
  const acquired = state.items.filter((item) => item.isDone && item.timestamp);
  const latestTimestamp = acquired.length ? Math.max(...acquired.map((item) => item.timestamp)) : Date.now();
  const latestDate = new Date(latestTimestamp);
  const months = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(latestDate.getUTCFullYear(), latestDate.getUTCMonth() - offset, 1));
    months.push({
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("de-DE", { month: "short", timeZone: "UTC" }).replace(".", ""),
      count: 0,
    });
  }
  const lookup = new Map(months.map((month) => [month.key, month]));
  acquired.forEach((item) => {
    const date = new Date(item.timestamp);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    if (lookup.has(key)) lookup.get(key).count += 1;
  });
  const max = Math.max(1, ...months.map((month) => month.count));
  const total = months.reduce((sum, month) => sum + month.count, 0);
  elements.activityTotal.textContent = `${formatNumber(total)} FUNDE`;
  elements.activityChart.innerHTML = months.map((month) => `
    <div class="activity-bar-wrap" title="${escapeHtml(month.label)}: ${month.count}">
      <div class="activity-bar-track"><i class="activity-bar" style="height: ${Math.max(4, (month.count / max) * 100)}%"></i></div>
      <span>${escapeHtml(month.label)}</span>
    </div>
  `).join("");
}

function renderNewIntel() {
  // 5.6.0: Der Vergleich lief gegen die Launcher-Sicherung; ohne Launcher bleibt der Bereich ausgeblendet.
  const added = [];
  elements.newIntel.hidden = added.length === 0;
  if (!added.length) return;
  elements.newBlueprintCount.textContent = formatNumber(added.length);
  elements.newBlueprints.innerHTML = added.map((item) => `
    <div class="intel-item" title="${escapeHtml(item.name)}"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.type)}</small></div>
  `).join("");
}

function renderCategoryControls() {
  const quickOptions = state.categories.map((group) => `
    <optgroup label="${escapeHtml(group.label)} (${group.total})">
      <option value="${escapeHtml(group.id)}">Alle ${escapeHtml(group.label)}</option>
      ${group.children.map((category) => `<option value="${escapeHtml(category.key)}">${escapeHtml(category.label)} (${category.total})</option>`).join("")}
    </optgroup>`).join("");
  elements.categorySelect.innerHTML = `<option value="all">Alle Kategorien</option>${quickOptions}`;
  elements.categorySelect.value = "all";

  elements.categoryList.innerHTML = state.categories.map((group) => {
    const progress = group.total ? (group.done / group.total) * 100 : 0;
    return `
      <details class="category-group" data-main-category="${escapeHtml(group.id)}">
        <summary>
          <span class="category-check-wrap">
            <input class="category-main-check" type="checkbox" data-main-check="${escapeHtml(group.id)}" aria-label="Alle Einträge in ${escapeHtml(group.label)} anzeigen" />
            <i aria-hidden="true">${SCUI.icon(group.id)}</i>
          </span>
          <span class="category-summary-copy"><strong>${escapeHtml(group.label)}</strong><small>${group.done}/${group.total}</small></span>
          <span class="category-progress" aria-hidden="true"><i style="width:${progress}%"></i></span>
          <span class="category-chevron" aria-hidden="true">⌄</span>
        </summary>
        <div class="category-children">
          <label class="category-all-row">
            <input class="category-main-check mirror" type="checkbox" data-main-check="${escapeHtml(group.id)}" />
            <span>Alle Kategorien</span><strong>${group.done}/${group.total}</strong>
          </label>
          ${group.children.map((category) => {
            const childProgress = category.total ? (category.done / category.total) * 100 : 0;
            return `<label class="category-option" data-category-row="${escapeHtml(category.key)}">
              <input type="checkbox" data-category-check="${escapeHtml(category.key)}" />
              <span title="${escapeHtml(category.label)}">${escapeHtml(category.label)}</span><strong>${category.done}/${category.total}</strong>
              <span class="category-progress" aria-hidden="true"><i style="width:${childProgress}%"></i></span>
            </label>`;
          }).join("")}
        </div>
      </details>`;
  }).join("");

  elements.categoryList.querySelectorAll("[data-category-check]").forEach((input) => {
    input.addEventListener("change", () => {
      const key = input.dataset.categoryCheck;
      if (input.checked) state.filters.categories.add(key);
      else state.filters.categories.delete(key);
      elements.categorySelect.value = "all";
      syncCategoryControls();
      resetVisibleAndRender();
    });
  });
  elements.categoryList.querySelectorAll("[data-main-check]").forEach((input) => {
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("change", () => {
      const group = state.categories.find((entry) => entry.id === input.dataset.mainCheck);
      if (!group) return;
      group.children.forEach((child) => {
        if (input.checked) state.filters.categories.add(child.key);
        else state.filters.categories.delete(child.key);
      });
      elements.categorySelect.value = "all";
      syncCategoryControls();
      resetVisibleAndRender();
    });
  });
  syncCategoryControls();
}

function syncCategoryControls() {
  const selectedCount = ALL_CATEGORY_KEYS.filter((key) => state.filters.categories.has(key)).length;
  elements.categoryAllCheck.checked = selectedCount === ALL_CATEGORY_KEYS.length;
  elements.categoryAllCheck.indeterminate = selectedCount > 0 && selectedCount < ALL_CATEGORY_KEYS.length;
  elements.categorySelectionCount.textContent = selectedCount === ALL_CATEGORY_KEYS.length ? "Alle ausgewählt"
    : selectedCount === 0 ? "Keine ausgewählt" : `${selectedCount} von ${ALL_CATEGORY_KEYS.length} ausgewählt`;
  elements.categoryList.querySelectorAll("[data-category-check]").forEach((input) => {
    input.checked = state.filters.categories.has(input.dataset.categoryCheck);
    input.closest(".category-option")?.classList.toggle("is-active", input.checked);
  });
  state.categories.forEach((group) => {
    const keys = group.children.map((child) => child.key);
    const selected = keys.filter((key) => state.filters.categories.has(key)).length;
    elements.categoryList.querySelectorAll(`[data-main-check="${cssEscape(group.id)}"]`).forEach((input) => {
      input.checked = selected === keys.length;
      input.indeterminate = selected > 0 && selected < keys.length;
    });
    elements.categoryList.querySelector(`[data-main-category="${cssEscape(group.id)}"]`)?.classList.toggle("is-filtered", selected < keys.length);
  });
}

function resetVisibleAndRender() {
  state.visibleCount = state.pageSize;
  applyFilters();
  renderTable();
  syncFacetControls();
}

function applyFilters() {
  const query = normalize(state.filters.query);
  const items = state.items.filter((item) => {
    const matchesQuery = bp.view==='missions' ? (item.scmdb?.missions||[]).some(m=>MissionFilters.matches({...m,...(getMissionDefinition(m)||{})})) : !query || item.searchable.includes(query) || (item.scmdb?.missions||[]).some(m=>normalize(missionSearchText({...m,...(getMissionDefinition(m)||{})})).includes(query));
    const matchesMaker = !state.filters.manufacturer || item.manufacturer===state.filters.manufacturer;
    const matchesSystem = !state.filters.systems.size || (item.scmdb?.missions||[]).some(m=>(m.systems||[]).some(s=>state.filters.systems.has(s)));
    const matchesStatus = state.filters.status === "all"
      || (state.filters.status === "done" && item.isDone)
      || (state.filters.status === "open" && !item.isDone);
    const matchesCategory = state.filters.categories.has(item.subCategory);
    const matchesType = !state.filters.types.size || state.filters.types.has(item.facets.typeKey);
    const numericSize = item.facets.size;
    const matchesSize = numericSize == null
      ? state.filters.sizeMin === 0 && state.filters.sizeMax === 6
      : numericSize >= state.filters.sizeMin && numericSize <= state.filters.sizeMax;
    const matchesDynamic = (item.facets.typeKey !== "fpsgear:armour" || (matchesFacetSet(state.filters.armorClass, item.facets.armorClass)
      && matchesFacetSet(state.filters.armorSlot, item.facets.armorSlot)
      && matchesFacetSet(state.filters.armorSubtype, item.facets.armorSubtype)))
      && (item.facets.typeKey !== "fpsgear:weapons" || (matchesFacetSet(state.filters.weaponClass, item.facets.weaponClass)
      && matchesFacetSet(state.filters.weaponSubtype, item.facets.weaponSubtype)))
      && (item.facets.typeKey !== "fpsgear:ammo" || matchesFacetSet(state.filters.ammoSubtype, item.facets.ammoSubtype))
      && (item.facets.typeKey !== "vehiclegear:weapons" || matchesFacetSet(state.filters.shipWeaponSubtype, item.facets.shipWeaponSubtype));
    return matchesQuery && (bp.view==='missions'||(matchesMaker && matchesSystem && matchesType && matchesSize && matchesDynamic)) && matchesStatus && matchesCategory && matchesCollection(item);
  });
  const collator = new Intl.Collator("de", { sensitivity: "base", numeric: true });
  items.sort((a, b) => {
    if (state.filters.sort === "recent") return b.timestamp - a.timestamp || collator.compare(a.name, b.name);
    if (state.filters.sort === "category") return collator.compare(categoryLabel(a.subCategory), categoryLabel(b.subCategory)) || collator.compare(a.name, b.name);
    return collator.compare(a.name, b.name);
  });
  state.filtered = items;
}

function renderLegacyTable() {
  const visible = state.filtered.slice(0, state.visibleCount);
  elements.resultCount.textContent = `${formatNumber(state.filtered.length)} VON ${formatNumber(state.items.length)} EINTRÄGEN`;
  elements.emptyState.hidden = state.filtered.length !== 0;
  elements.pagination.hidden = state.filtered.length <= state.visibleCount;
  if (!visible.length) { elements.blueprintRows.innerHTML = ""; return; }
  elements.blueprintRows.innerHTML = visible.map((item) => `
    <tr tabindex="0" data-item-id="${item.id}" aria-label="Details zu ${escapeHtml(item.name)} öffnen">
      <td><span class="status-pill ${item.isDone ? "done" : "open"}">${item.isDone ? "Erhalten" : "Offen"}</span></td>
      <td class="blueprint-name"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.manufacturer === "—" ? item.ini || "Keine INI-Zuordnung" : item.manufacturer)}</small></td>
      <td><span class="category-code">${escapeHtml(mainCategoryLabel(item.mainCategory))}</span><small class="category-subcode">${escapeHtml(categoryLabel(item.subCategory))}</small></td>
      <td><span class="class-pair"><strong>${escapeHtml(item.size)}</strong><small>${escapeHtml(item.grade)}</small></span></td>
      <td>${renderMissionBadge(item)}</td>
      <td><span class="table-meta">${item.acquiredAt ? escapeHtml(formatDate(item.acquiredAt)) : "—"}</span></td>
      <td><span class="row-arrow" aria-hidden="true">›</span></td>
    </tr>`).join("");
  elements.blueprintRows.querySelectorAll("tr[data-item-id]").forEach((row) => {
    const open = () => openDetails(Number(row.dataset.itemId));
    row.addEventListener("click", open);
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
    });
  });
}

function renderMissionBadge(item) {
  if (item.missionCount > 0) return `<span class="mission-badge has-missions">${formatNumber(item.missionCount)} AUFTRÄGE</span>`;
  if (item.hasScmdb) return '<span class="mission-badge">SCMDB · OHNE AUFTRAG</span>';
  return '<span class="mission-badge is-missing">NICHT ZUGEORDNET</span>';
}

function openDetails(id) {
  window.LiveDossier?.clear();
  const item = state.items.find((entry) => entry.id === id);
  if (!item) return;
  const token = ++state.detailToken;
  elements.detailType.textContent = item.type;
  renderDetailActions(item);
  elements.detailTitle.textContent = item.name;
  elements.detailStatus.innerHTML = `
    <span class="status-pill ${item.isDone ? "done" : "open"}">${item.isDone ? "Bauplan erhalten" : "Noch nicht erhalten"}</span>
    <time>${item.acquiredAt ? escapeHtml(formatDateTime(item.acquiredAt)) : "Kein Erwerbszeitpunkt"}</time>`;
  const fields = [
    ["Item", item.name, true], ["Hersteller", item.manufacturer], ["Typ", item.localizedType], ["Größe", item.size],
    ["Gütegrad", item.grade], ["Entity Class", item.entityClass],
    ["SCMDB", item.hasScmdb ? `${formatNumber(item.missionCount)} Fundwege` : "Keine Zuordnung"],
    ["INI-Schlüssel", item.ini || "Keine Zuordnung", true],
  ];
  elements.detailGrid.innerHTML = fields.map(([label, value, wide]) => `
    <div class="${wide ? "detail-wide" : ""}"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || "—")}</dd></div>`).join("");
  const localDescription = cleanDescription(item.description);
  elements.detailDescription.hidden = !localDescription;
  elements.detailDescriptionText.textContent = localDescription;
  elements.detailLoreText.textContent = createScmdbSummary(item);
  elements.detailLoreSource.textContent = item.hasScmdb ? "SCMDB" : "LOKAL";
  renderSourceLinks(item, null);
  renderGallery(item, null, true);
  renderRecipe(item);
  renderAcquisition(item);
  if (window.ArchiveLayouts?.active) ArchiveLayouts.present(item);
  else if (!elements.detailDialog.open) elements.detailDialog.showModal();
  void loadWikiDossier(item, true).then((dossier) => {
    if (token !== state.detailToken || !elements.detailDialog.open) return;
    if (dossier?.description) {
      elements.detailLoreText.textContent = dossier.description;
      elements.detailLoreSource.textContent = dossier.language === "de_DE" ? "SC WIKI · DE" : "SC WIKI · EN";
    }
    renderGallery(item, dossier, false);
    renderSourceLinks(item, dossier);
    window.renderV3Intel?.(item,dossier,token);
  });
}

function createScmdbSummary(item) {
  if (!item.hasScmdb) return "Für dieses Item liegt im aktuellen SCMDB-Snapshot noch keine Beschreibung vor. Die lokalen Katalogdaten bleiben unten verfügbar.";
  const profile = item.scmdb?.profile || {};
  const recipe = item.scmdb?.recipe?.tiers?.[0];
  const details = [];
  const type = [profile.itemType, profile.attachSubType].filter(Boolean).join(" / ");
  if (type) details.push(`SCMDB klassifiziert das Item als ${type}.`);
  if (profile.manufacturer) details.push(`Als Hersteller ist ${profile.manufacturer} hinterlegt.`);
  if (recipe?.craftTimeSeconds != null) details.push(`Die Fertigungszeit beträgt ${formatDuration(recipe.craftTimeSeconds)}.`);
  details.push(item.missionCount > 0 ? `${formatNumber(item.missionCount)} Aufträge können einen passenden Bauplan-Pool auslösen.` : "SCMDB weist derzeit keinen Auftrag als Bauplanquelle aus.");
  return details.join(" ") || "SCMDB-Daten sind für dieses Item verknüpft.";
}

async function loadWikiDossier(item, enrich=false) {
  const id=item.stableId || item.scmdb?.blueprint?.entityClass;
  if(!id)return null;
  const key=id+(enrich?'#full':'');
  if(state.wikiCache.has(key))return state.wikiCache.get(key);
  const request=SCUI.api('/api/dossier/'+encodeURIComponent(id)+(enrich?'?enrich=1':''))
    .then(payload=>({...sanitizeWikiDossier(payload.data),pending:payload.pending,updatedAt:payload.updatedAt}))
    .catch(()=>null);
  state.wikiCache.set(key,request);
  setTimeout(()=>state.wikiCache.delete(key),4000);
  return request;
}
function sanitizeWikiDossier(data) {
  if(!data)return {images:[]};
  const de=cleanDescription(data.description?.de_DE||''),en=cleanDescription(data.description?.en_EN||'');
  const local=url=>typeof url==='string'&&url.startsWith('/media/')&&!url.includes('..')?url:'';
  return {description:de||en,language:de?'de_DE':en?'en_EN':null,
    images:(data.images||[]).map(e=>({thumbnail:local(e.thumbnail_url),original:local(e.original_url),source:e.source,credit:e.credit,sourceUrl:e.sourceUrl})).filter(e=>e.thumbnail).slice(0,bp.config?.settings.sources.maxImages??3),
    webUrl:safeExternalUrl(data.web_url,new Set(['api.star-citizen.wiki'])),sources:data.sources||{},notes:data.notes||[],folder:data.imageFolder,wikiPage:data.wikiPage,identity:data.identity};
}

function renderGallery(item, dossier, loading) {
  elements.detailGallery.hidden=bp.config?.settings.sources.maxImages===0;
  const images = dossier?.images?.slice(0, bp.config?.settings.sources.maxImages ?? 3) || [];
  if (images.length) {
    elements.detailGallery.classList.toggle("is-multiple", images.length > 1);
    elements.detailGallery.innerHTML = images.map((entry, index) => {
      const source = entry.thumbnail || entry.original;
      const target = entry.original || source;
      return `
        <a class="gallery-frame" href="${escapeHtml(target)}" target="_blank" rel="noopener noreferrer" title="Bild ${index + 1} in Originalgröße öffnen">
          <img src="${escapeHtml(source)}" alt="${escapeHtml(item.name)} – Ansicht ${index + 1}" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} />
          <span>${escapeHtml(entry.source)}</span>
        </a>`;
    }).join("");
    elements.detailGallery.querySelectorAll("img").forEach((image) => {
      image.addEventListener("error", () => image.closest(".gallery-frame")?.classList.add("has-error"), { once: true });
    });
    return;
  }
  elements.detailGallery.classList.remove("is-multiple");
  if(window.ArchiveLayouts?.active){
    elements.detailGallery.innerHTML=`<div class="gallery-frame gallery-placeholder ${loading?'is-loading':''}">${SCUI.icon(item.mainCategory)}<span>${loading?'BILDQUELLE WIRD GEPRÜFT':'KEIN ITEM-BILD VERFÜGBAR'}</span></div>`;
    return;
  }
  elements.detailGallery.innerHTML = `
    <div class="gallery-frame gallery-placeholder ${loading ? "is-loading" : ""}">
      <img src="/assets/item-placeholder.svg" alt="Abstrakte Item-Vorschau für ${escapeHtml(item.name)}" />
      <span>${loading ? "BILDQUELLE WIRD GEPRÜFT" : "KEIN ITEM-BILD VERFÜGBAR"}</span>
    </div>`;
}

function renderSourceLinks(item, dossier) {
  const links = [];
  const scmdbUrl = safeExternalUrl(item.scmdb?.blueprint?.scmdbUrl, new Set(["scmdb.net"]));
  const translationUrl = safeExternalUrl(state.scmdb?._meta?.translationSource, new Set(["github.com", "raw.githubusercontent.com"]));
  if (scmdbUrl) links.push(`<a href="${escapeHtml(scmdbUrl)}" target="_blank" rel="noopener noreferrer">SCMDB-Eintrag ↗</a>`);
  if (translationUrl) links.push(`<a href="${escapeHtml(translationUrl)}" target="_blank" rel="noopener noreferrer">Deutsche Sprachdatei ↗</a>`);
  if (dossier?.webUrl) links.push(`<a href="${escapeHtml(dossier.webUrl)}" target="_blank" rel="noopener noreferrer">Bild &amp; Beschreibung ↗</a>`);
  elements.detailSourceLinks.innerHTML = links.join("");
}

function renderRecipe(item) {
  const tier = item.scmdb?.recipe?.tiers?.[0];
  const slots = tier?.slots || [];
  elements.detailRecipe.hidden = !slots.length;
  if (!slots.length) return;
  elements.detailCraftTime.textContent = tier.craftTimeSeconds != null ? formatDuration(tier.craftTimeSeconds).toUpperCase() : "ZEIT UNBEKANNT";
  materialOrder = [...new Set(slots.flatMap((slot) => (slot.options || []).map((option) => materialBase(option.name))).filter(Boolean))];
  elements.detailRecipeContent.innerHTML = slots.map((slot) => `
    <div class="recipe-slot"><span>${escapeHtml(slot.name || "Material")}</span><div>
      ${(slot.options || []).map((option) => `<strong>${materialLink(option.name)}</strong><small>${formatQuantity(option.quantity)}${option.minQuality ? ` · Qualität ${formatNumber(option.minQuality)}` : ""}</small>`).join("")}
    </div></div>`).join("");
  renderMaterialSources(slots);
}

// 5.5.0: Fundorte der Rezept-Rohstoffe aus SCMDB mining_data (snapshot.materialLocations).
const MATERIAL_LOCATION_TYPES = { belt: "Asteroidengürtel", cave: "Höhle", cluster: "Asteroidenfeld", event: "Event", lagrange: "Lagrange-Punkt", moon: "Mond", planet: "Planet", special: "Sonderort" };
const MATERIAL_GROUPS = { SpaceShip_Mineables: "Schiffsabbau", SpaceShip_Mineables_Rare: "Schiffsabbau (selten)", GroundVehicle_Mineables: "Fahrzeugabbau", FPS_Mineables: "Handabbau", Harvestables: "Sammeln" };
function materialBase(name) { return String(name || "").replace(/\s*\([^)]*\)\s*$/, "").trim(); }
function formatShare(value) { return value == null ? "—" : value > 0 && value < 1 ? "< 1 %" : formatPercent(Math.round(value)); }
// 5.5.3: jedes Material hat im Rezept und über seiner Tabelle dieselbe Farbe (Reihenfolge wie im Rezept).
let materialOrder = [];
function materialTone(name) { const i = materialOrder.indexOf(materialBase(name)); return i < 0 ? "" : ` mat-tone-${i % 6}`; }
function materialAnchor(name) { return "material-" + materialBase(name).toLowerCase().replace(/[^a-z0-9]+/g, "-"); }
// 5.5.1: Materialname im Rezept springt zu seinen Fundorten (nur wenn es welche gibt).
function materialLink(name) {
  const label = escapeHtml(name || "Unbekannt");
  return state.scmdb?.materialLocations?.[materialBase(name)]?.length ? `<a class="material-jump${materialTone(name)}" href="#${materialAnchor(name)}" data-material-jump="${materialAnchor(name)}" title="Fundorte anzeigen">${label}</a>` : label;
}
document.addEventListener("click", (event) => {
  const link = event.target.closest?.("[data-material-jump]");
  if (!link) return;
  event.preventDefault();
  const target = document.getElementById(link.dataset.materialJump);
  if (!target) return;
  target.open = true;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  target.classList.remove("is-flash"); void target.offsetWidth; target.classList.add("is-flash");
});
// 5.5.4: Filter direkt in den Spaltenköpfen (System/Typ/Gruppe: Auswahl, Anteil: Sortierung).
function materialHeader(rows) {
  const select = (key, label, labels = {}) => {
    const values = [...new Set(rows.map((row) => row[key]).filter(Boolean))].sort((a, b) => String(labels[a] || a).localeCompare(String(labels[b] || b), "de"));
    return `<th><select class="material-filter" data-filter="${key}" aria-label="${label} filtern"><option value="">${label}</option>${values.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(labels[v] || v)}</option>`).join("")}</select></th>`;
  };
  return `<th>Ort</th>${select("system", "System")}${select("type", "Typ", MATERIAL_LOCATION_TYPES)}${select("group", "Gruppe", MATERIAL_GROUPS)}<th class="num"><button type="button" class="material-sort" data-sort="desc" aria-label="Nach Anteil sortieren">Anteil ↓</button></th>`;
}
function applyMaterialFilters(table) {
  const get = (key) => table.querySelector(`[data-filter="${key}"]`)?.value || "";
  const system = get("system"), type = get("type"), group = get("group");
  let shown = 0;
  table.querySelectorAll("tbody tr").forEach((tr) => {
    const ok = (!system || tr.dataset.system === system) && (!type || tr.dataset.type === type) && (!group || tr.dataset.group === group);
    tr.hidden = !ok; if (ok) shown += 1;
  });
  const empty = table.parentElement.querySelector(".material-empty-filter");
  if (empty) empty.hidden = shown > 0;
}
document.addEventListener("input", (event) => { const t = event.target.closest?.(".material-table"); if (t && event.target.matches(".material-filter")) applyMaterialFilters(t); });
document.addEventListener("change", (event) => { const t = event.target.closest?.(".material-table"); if (t && event.target.matches(".material-filter")) applyMaterialFilters(t); });
document.addEventListener("click", (event) => {
  const button = event.target.closest?.(".material-sort");
  if (!button) return;
  const asc = button.dataset.sort === "desc";
  button.dataset.sort = asc ? "asc" : "desc"; button.textContent = asc ? "Anteil ↑" : "Anteil ↓";
  const tbody = button.closest("table").querySelector("tbody");
  [...tbody.rows].sort((a, b) => (asc ? 1 : -1) * (Number(a.dataset.share) - Number(b.dataset.share))).forEach((tr) => tbody.append(tr));
});
function renderMaterialSources(slots) {
  const target = elements.detailMaterialSources;
  if (!target) return;
  const map = state.scmdb?.materialLocations;
  const names = [...new Set(slots.flatMap((slot) => (slot.options || []).map((option) => materialBase(option.name))).filter(Boolean))];
  target.hidden = !map || !names.length;
  if (target.hidden) { target.innerHTML = ""; return; }
  target.innerHTML = `<div class="material-sources-heading"><p class="eyebrow">SCMDB MINING</p><h4>Fundorte der Materialien</h4></div>` + names.map((name) => {
    const rows = map[name] || [];
    const body = rows.length
      ? `<div class="material-table-wrap"><table class="material-table"><thead><tr>${materialHeader(rows)}</tr></thead><tbody>${rows.map((row) => `<tr data-system="${escapeHtml(row.system || "")}" data-type="${escapeHtml(row.type || "")}" data-group="${escapeHtml(row.group || "")}" data-share="${row.share ?? -1}"><td>${escapeHtml(row.location || "—")}</td><td>${escapeHtml(row.system || "—")}</td><td>${escapeHtml(MATERIAL_LOCATION_TYPES[row.type] || row.type || "—")}</td><td>${escapeHtml(MATERIAL_GROUPS[row.group] || row.group || "—")}</td><td class="num">${formatShare(row.share)}</td></tr>`).join("")}</tbody></table><p class="material-empty-filter" hidden>Kein Fundort passt zu diesem Filter.</p></div>`
      : `<p class="material-none">Kein Abbau-Fundort bekannt. Das Material stammt vermutlich aus Beute, Handel oder Aufträgen.</p>`;
    return `<details class="material-source" id="${materialAnchor(name)}"><summary><h5><span class="material-name${materialTone(name)}">${escapeHtml(name)}</span> <small>${rows.length ? `${formatNumber(rows.length)} ${rows.length === 1 ? "Fundort" : "Fundorte"}` : ""}</small></h5></summary>${body}</details>`;
  }).join("") + `<p class="material-note">Anteil: wie oft dieses Material unter den Lagerstätten der Gruppe an diesem Ort vorkommt. Quelle: SCMDB.</p>`;
}

function renderAcquisition(item) {
  const allMissions = item.scmdb?.missions || [];
  const missions = window.ArchiveLayouts?.active ? ArchiveLayouts.detailMissions(item,allMissions) : allMissions;
  const total = item.missionCount;
  elements.detailMissionCount.textContent = total ? `${formatNumber(total)} AUFTRÄGE` : "KEIN AUFTRAG";
  if (!missions.length) {
    elements.detailAcquisitionHint.textContent = item.hasScmdb
      ? "Im aktuellen SCMDB-Stand ist kein Auftrag hinterlegt, der diesen Bauplan als Belohnung ausgibt. Das Item kann aus einem früheren Event oder einer anderen Quelle stammen."
      : "Für dieses Item konnte noch kein SCMDB-Fundweg verknüpft werden.";
    elements.detailMissionList.innerHTML = `
      <div class="mission-empty"><span aria-hidden="true">◇</span><p>Keine aktive Auftragsquelle im aktuellen Datensatz.</p>
        <a href="https://scmdb.net/?page=missions" target="_blank" rel="noopener noreferrer">SCMDB-Missionen prüfen ↗</a></div>`;
    return;
  }
  const shownNote = total > missions.length ? ` Angezeigt werden die ${missions.length} aussichtsreichsten Fundwege.` : "";
  elements.detailAcquisitionHint.textContent = `Schließe einen der folgenden Aufträge ab. Jeder Abschluss würfelt die angezeigten Bauplan-Pools unabhängig voneinander aus. Sobald du alle Baupläne eines Pools besitzt, liefert dieser Pool keine weiteren Baupläne. Titel und Beschreibungen verwenden bevorzugt die deutsche Star-Citizen-Sprachdatei.${shownNote}`;
  elements.detailMissionList.innerHTML = missions.map((mission, index) => renderMissionCard(mission, index)).join("");
  elements.detailMissionList.querySelectorAll("[data-reward-item-id]").forEach((button) => {
    button.addEventListener("click", () => openDetails(Number(button.dataset.rewardItemId)));
  });
  elements.detailMissionList.querySelectorAll("[data-detail-mission]").forEach(button => button.addEventListener("click", () => sendObs({kind:"mission",mission:button.dataset.detailMission,title:button.dataset.title})));
}

function renderMissionCard(mission, index) {
  if(window.ArchiveLayouts?.active)return ArchiveLayouts.missionCard(mission,index);
  const definition = getMissionDefinition(mission);
  const detail = definition ? { ...mission, ...definition } : mission;
  const pools = getMissionRewardPools(mission, definition);
  const trigger = mission.trigger === "accept" ? "Bei Annahme" : "Bei Abschluss";
  const chance = mission.combinedChancePercent != null ? formatPercent(mission.combinedChancePercent) : "—";
  const reward = detail.rewardUEC != null ? `${formatNumber(detail.rewardUEC)} aUEC` : "Belohnung unbekannt";
  const time = detail.timeToCompleteMinutes != null ? `${formatNumber(detail.timeToCompleteMinutes)} Min` : "Ohne Zeitangabe";
  const systems = detail.systems?.length ? detail.systems.join(" · ") : "System offen";
  const status = detail.active ? "AKTIV" : "EVENT / INAKTIV";
  const description = detail.description || "SCMDB enthält für diesen Auftrag keine zusätzliche Beschreibung.";
  const missionUrl = safeExternalUrl(detail.scmdbUrl, new Set(["scmdb.net"])) || "https://scmdb.net/?page=missions";
  const translatedFields = new Set(detail.translation?.translatedFields || []);
  const languageLabel = translatedFields.has("title") && translatedFields.has("description")
    ? "DEUTSCH"
    : translatedFields.has("description") ? "BESCHREIBUNG DE" : translatedFields.size ? "TEILWEISE DE" : "ORIGINAL";
  const originalTitle = detail.titleOriginal
    ? `<small class="mission-original-title">Original: ${escapeHtml(detail.titleOriginal)}</small>`
    : "";
  const prerequisite = detail.prerequisites?.length
    ? `<span>${escapeHtml(detail.prerequisites.join(" · "))}</span>` : "";
  return `
    <article class="mission-card ${detail.active ? "is-active" : "is-inactive"}">
      <div class="mission-rank" aria-hidden="true">${String(index + 1).padStart(2, "0")}</div>
      <div class="mission-main">
        <div class="mission-title-row"><div><span class="mission-contractor">${escapeHtml(detail.contractor || "Unbekannter Auftraggeber")}</span><h4>${MissionText.render(detail,'title')}</h4>${originalTitle}</div><div class="mission-state-stack"><span class="mission-language">${languageLabel}</span><span class="mission-state">${status}</span></div></div>
        <div class="mission-meta"><span>${escapeHtml(detail.missionType || detail.category || "Auftrag")}</span><span>${escapeHtml(systems)}</span><span>${detail.illegal ? "Illegal" : "Legal"}</span><span>${escapeHtml(detail.minStanding || "Ohne Rangvorgabe")}</span>${prerequisite}</div>
        <div class="mission-reward-grid">
          <div><small>Item-Chance · Basis · ${trigger}</small><strong>${chance}</strong></div><div><small>Auftragsprämie</small><strong>${escapeHtml(reward)}</strong></div>
          <div><small>Zeitlimit</small><strong>${escapeHtml(time)}</strong></div><div><small>Bauplan-Pools</small><strong>${formatNumber(pools.length || 1)} · ${formatPercent(mission.poolChancePercent)}</strong></div>
        </div>
        <div class="settings-actions"><button class="quiet-button" type="button" data-detail-mission="${escapeHtml(mission.id || mission.debugName)}" data-title="${escapeHtml(detail.title)}">${SCUI.icon('broadcast')} Auftrag in OBS anzeigen</button></div>
        ${ObsDossier.button(detail)}<details class="mission-details" ${index === 0 ? "open" : ""}>
          <summary>Auftragsbeschreibung &amp; Quelle</summary>
          <div class="mission-detail-body">
            <section class="mission-description-block">
              <div class="mission-subheading"><span>AUFTRAGSBESCHREIBUNG</span><b>${languageLabel}</b></div>
              <p>${MissionText.render(detail)}</p>${MissionText.cargo(detail)}
              <div class="mission-source-row"><small>Übersetzung: StarCitizen-Deutsch-INI · Auftrags- und Belohnungsdaten: SCMDB</small><a href="${escapeHtml(missionUrl)}" target="_blank" rel="noopener noreferrer">Auftrag in SCMDB öffnen ↗</a></div>
            </section>
            <section class="mission-payout-card"><span>BELOHNUNG</span><strong>${escapeHtml(reward)}</strong></section>
            <section class="blueprint-rewards">
              <div class="mission-subheading"><span>BAUPLAN-BELOHNUNGEN</span><b>${formatNumber(pools.length)} POOL${pools.length === 1 ? "" : "S"}</b></div>
              <p class="pool-explainer"><i aria-hidden="true">ℹ</i> Dieser Auftrag besitzt ${pools.length > 1 ? "mehrere" : "einen"} Bauplan-Pool${pools.length > 1 ? "s" : ""}. Jeder Abschluss gewährt unabhängig voneinander einen Bauplan aus jedem Pool – abhängig von der jeweiligen Dropchance. Ein Pool liefert keine weiteren Baupläne, sobald alle darin enthaltenen Baupläne gesammelt wurden.</p>
              <div class="reward-pool-list">${pools.map((pool) => renderRewardPool(pool)).join("")}</div>
            </section>
          </div>
        </details>
      </div>
    </article>`;
}

function resetFilters() {
  bp.only = "all";
  bp.activeOnly = true;
  bp.goalsOnly = false;
  document.getElementById("savedFilters").value = "";
  document.getElementById("deletePreset").hidden = true;
  state.filters = createDefaultFilters();
  state.categorySelectionInitialized = true;
  elements.searchInput.value = "";
  elements.categorySelect.value = "all";
  elements.sortSelect.value = "name";
  elements.statusTabs.forEach((tab) => {
    const active = tab.dataset.status === "all";
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-pressed", String(active));
  });
  syncCategoryControls();
  syncFacetControls();
  resetVisibleAndRender();
  showToast("Alle Such- und Filterkriterien wurden zurückgesetzt.");
}

function createDefaultFilters() {
  return {
    query: "", status: "all", sort: "name", manufacturer: "", systems: new Set(),
    categories: new Set(ALL_CATEGORY_KEYS),
    types: new Set(), sizeMin: 0, sizeMax: 6,
    armorClass: new Set(), armorSlot: new Set(), armorSubtype: new Set(),
    weaponClass: new Set(), weaponSubtype: new Set(), ammoSubtype: new Set(), shipWeaponSubtype: new Set(),
  };
}

function initializeCategorySelection() {
  if (!state.categorySelectionInitialized) {
    state.filters.categories = new Set(ALL_CATEGORY_KEYS);
    state.categorySelectionInitialized = true;
    return;
  }
  state.filters.categories = new Set([...state.filters.categories].filter((key) => ALL_CATEGORY_KEYS.includes(key)));
}

function classifyTaxonomy(rawType, scmdbEntry, catalogEntry) {
  const blueprint = scmdbEntry?.blueprint || {};
  const profile = scmdbEntry?.profile || {};
  const gear = normalizeToken(blueprint.gear);
  const type = normalizeToken(blueprint.type);
  const subtype = normalizeToken(blueprint.subtype);
  const attach = normalizeToken(profile.attachType || catalogEntry?.attachType);
  const raw = normalize(rawType);

  if (type === "clothing" || attach.includes("charclothing") || raw.includes("bekleidung") || raw.includes("clothing")) {
    if (/hat|head|helmet/.test(attach) || raw.includes("hut")) return { main: "clothing", sub: "clothing-hats" };
    if (/feet|shoe|boot/.test(attach) || raw.includes("schuh")) return { main: "clothing", sub: "clothing-shoes" };
    if (/hand|glove/.test(attach) || raw.includes("handschuh")) return { main: "clothing", sub: "clothing-gloves" };
    if (/leg|pant/.test(attach) || raw.includes("hose")) return { main: "clothing", sub: "clothing-pants" };
    if (/eye|glass/.test(attach) || raw.includes("brille")) return { main: "clothing", sub: "clothing-glasses" };
    if (/jacket|torso1/.test(attach) || raw.includes("jacke")) return { main: "clothing", sub: "clothing-jackets" };
    return { main: "clothing", sub: "clothing-tops" };
  }

  if ((gear === "fpsgear" && type === "armour") || attach.includes("chararmor") || /armor|rüstung|helmet|helm|undersuit|basisanzug|backpack|rucksack/.test(raw)) {
    if (attach.includes("undersuit") || /undersuit|basisanzug/.test(raw)) return { main: "armor", sub: "armor-undersuits" };
    if (attach.includes("helmet") || /helmet|helm/.test(raw)) return { main: "armor", sub: "armor-helmets" };
    if (attach.includes("torso") || /core armor|brust/.test(raw)) return { main: "armor", sub: "armor-torso" };
    if (attach.includes("arms")) return { main: "armor", sub: "armor-arms" };
    if (attach.includes("legs")) return { main: "armor", sub: "armor-legs" };
    if (attach.includes("backpack") || /backpack|rucksack/.test(raw)) return { main: "armor", sub: "armor-backpacks" };
    return { main: "armor", sub: "armor-flair" };
  }

  if ((gear === "fpsgear" && type === "weapons") || (gear !== "vehiclegear" && (profile.itemType === "weapon" || raw.startsWith("fps")))) {
    if (attach.includes("attachment") || /attachment|anbauteil/.test(raw)) return { main: "weapons", sub: "weapons-attachments" };
    if (/melee|knife|messer|nahkampf/.test(subtype + raw)) return { main: "weapons", sub: "weapons-melee" };
    if (/throw|grenade|wurf/.test(subtype + raw)) return { main: "weapons", sub: "weapons-throwables" };
    if (subtype === "pistol" || raw.includes("pistol")) return { main: "weapons", sub: "weapons-pistols" };
    if (["lmg", "rifle", "shotgun", "smg", "sniper"].includes(subtype) || /lmg|rifle|gewehr|shotgun|schrot|smg|sniper/.test(raw)) return { main: "weapons", sub: "weapons-longarms" };
    return { main: "weapons", sub: "weapons-special" };
  }

  if ((gear === "fpsgear" && type === "ammo") || /magazine|magazin|munition/.test(raw)) {
    return { main: "ammunition", sub: "ammunition-all" };
  }

  if (gear === "vehiclegear") {
    const vehicleMap = {
      artillery: "vehicle-artillery", cooler: "vehicle-coolers", emp: "vehicle-emp", mininglaser: "vehicle-mining",
      miningmodule: "vehicle-mining-modules", miningmodifier: "vehicle-mining-modules", orepod: "vehicle-ore-pods",
      missilerack: "vehicle-missile-racks", powerplant: "vehicle-powerplants", quantumdrive: "vehicle-quantumdrives",
      shield: "vehicle-shields", decoy: "vehicle-decoys", paint: "vehicle-paints", jumpmodule: "vehicle-jumpmodules",
      radar: "vehicle-radar", refuelling: "vehicle-refuelling", salvage: "vehicle-salvage", tractorbeam: "vehicle-tractorbeam",
    };
    if (type === "weapons") return { main: "vehicle", sub: /turret|geschütz/.test(raw) ? "vehicle-turrets" : "vehicle-weapons" };
    return { main: "vehicle", sub: vehicleMap[type] || "vehicle-weapons" };
  }

  if (type === "medical" || /medical|medizin/.test(raw + subtype)) return { main: "tools", sub: "tools-medical" };
  if (/cryptokey|crypto key/.test(raw + subtype)) return { main: "tools", sub: "tools-cryptokeys" };
  if (/accessory|zubehör/.test(raw + subtype)) return { main: "tools", sub: "tools-accessories" };
  if (type === "tools" || /tool|werkzeug/.test(raw + subtype)) return { main: "tools", sub: "tools-tools" };
  return { main: "tools", sub: "tools-technology" };
}

function createFacetInfo(rawType, scmdbEntry, catalogEntry, taxonomy) {
  const blueprint = scmdbEntry?.blueprint || {};
  const profile = scmdbEntry?.profile || {};
  const gear = normalizeToken(blueprint.gear);
  const type = normalizeToken(blueprint.type);
  const subtype = normalizeToken(blueprint.subtype) || "unknown";
  const componentClass = normalizeToken(profile.componentClass);
  const attachSubtype = normalizeToken(profile.attachSubType);
  const sizeValue = Number(profile.size ?? catalogEntry?.size);
  const typeAliases = { miningmodifier: "miningmodule", salvagehead: "salvage" };
  let typeKey = `${gear || "other"}:${typeAliases[type] || type || "other"}`;
  if (taxonomy.main === "armor") typeKey = "fpsgear:armour";
  if (taxonomy.main === "clothing") typeKey = "fpsgear:clothing";
  if (taxonomy.main === "weapons") typeKey = "fpsgear:weapons";
  if (taxonomy.main === "ammunition") typeKey = "fpsgear:ammo";
  if (taxonomy.main === "tools") typeKey = "fpsgear:tools";
  return {
    typeKey,
    size: Number.isFinite(sizeValue) && sizeValue >= 0 && sizeValue <= 6 ? sizeValue : null,
    armorClass: taxonomy.main === "armor" ? (["light", "medium", "heavy"].includes(attachSubtype) ? attachSubtype : armorClassFromRaw(rawType)) : "",
    armorSlot: taxonomy.main === "armor" ? ({
      "armor-undersuits": "undersuit", "armor-helmets": "helmet", "armor-torso": "torso",
      "armor-arms": "arms", "armor-legs": "legs", "armor-backpacks": "backpack", "armor-flair": "flair",
    }[taxonomy.sub] || "") : "",
    armorSubtype: taxonomy.main === "armor" ? subtype : "",
    weaponClass: taxonomy.main === "weapons" ? (componentClass || normalizeToken(rawType).split("-")[0]) : "",
    weaponSubtype: taxonomy.main === "weapons" ? subtype : "",
    ammoSubtype: taxonomy.main === "ammunition" ? subtype : "",
    shipWeaponSubtype: taxonomy.main === "vehicle" && type === "weapons" ? subtype : "",
  };
}

// 5.6.4: Rüstungsklasse für Karten und Listen (leer bei allem, was keine Rüstung ist).
function armorClassLabel(item) {
  return { light: "Leicht", medium: "Mittel", heavy: "Schwer" }[item?.facets?.armorClass] || "";
}

function armorClassFromRaw(value) {
  const raw = normalize(value);
  if (/light|leicht/.test(raw)) return "light";
  if (/medium|mittel/.test(raw)) return "medium";
  if (/heavy|schwer/.test(raw)) return "heavy";
  return "";
}

function normalizeToken(value) {
  return String(value || "").normalize("NFKC").replace(/[^a-z0-9]+/gi, "").toLowerCase();
}

function setCategoryShortcut(value) {
  if (value === "all") state.filters.categories = new Set(ALL_CATEGORY_KEYS);
  else {
    const group = state.categories.find((entry) => entry.id === value);
    state.filters.categories = new Set(group ? group.children.map((child) => child.key) : [value]);
  }
  syncCategoryControls();
}

function toggleSetValue(set, value) {
  if (!value) return;
  if (set.has(value)) set.delete(value);
  else set.add(value);
}

function matchesFacetSet(set, value) {
  return !set.size || set.has(value || "unknown");
}

function clearDynamicFacets() {
  FACET_NAMES.forEach((name) => state.filters[name].clear());
}

function clearHiddenDynamicFacets() {
  const types = state.filters.types;
  if (!types.size) { clearDynamicFacets(); return; }
  if (!types.has("fpsgear:armour")) ["armorClass", "armorSlot", "armorSubtype"].forEach((name) => state.filters[name].clear());
  if (!types.has("fpsgear:weapons")) ["weaponClass", "weaponSubtype"].forEach((name) => state.filters[name].clear());
  if (!types.has("fpsgear:ammo")) state.filters.ammoSubtype.clear();
  if (!types.has("vehiclegear:weapons")) state.filters.shipWeaponSubtype.clear();
}

function updateSizeRange(changed) {
  let minimum = Number(elements.sizeMin.value);
  let maximum = Number(elements.sizeMax.value);
  if (minimum > maximum) {
    if (changed === "min") maximum = minimum;
    else minimum = maximum;
  }
  state.filters.sizeMin = minimum;
  state.filters.sizeMax = maximum;
  syncFacetControls();
  resetVisibleAndRender();
}

function syncFacetControls() {
  elements.typeFilterButtons.forEach((button) => {
    const active = state.filters.types.has(button.dataset.typeFilter);
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const allTypes = state.filters.types.size === 0;
  elements.allTypeButton.classList.toggle("is-active", allTypes);
  elements.allTypeButton.setAttribute("aria-pressed", String(allTypes));
  elements.facetButtons.forEach((button) => {
    const active = state.filters[button.dataset.facet]?.has(button.dataset.value) || false;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  const modes = [
    ["fpsgear:armour", elements.armorFilters, "RÜSTUNG"],
    ["fpsgear:weapons", elements.weaponFilters, "WAFFEN"],
    ["fpsgear:ammo", elements.ammoFilters, "MUNITION"],
    ["vehiclegear:weapons", elements.shipWeaponFilters, "SCHIFFSWAFFEN"],
  ];
  const visibleModes = modes.filter(([key]) => state.filters.types.has(key));
  modes.forEach(([key, section]) => { section.hidden = !state.filters.types.has(key); });
  elements.dynamicFilterHint.hidden = visibleModes.length > 0;
  elements.dynamicMode.textContent = visibleModes.length ? visibleModes.map((entry) => entry[2]).join(" + ") : "TYP WÄHLEN";

  elements.sizeMin.value = String(state.filters.sizeMin);
  elements.sizeMax.value = String(state.filters.sizeMax);
  elements.sizeRangeOutput.textContent = `${state.filters.sizeMin}–${state.filters.sizeMax}`;
  elements.sizeRange.style.setProperty("--range-min", `${(state.filters.sizeMin / 6) * 100}%`);
  elements.sizeRange.style.setProperty("--range-max", `${(state.filters.sizeMax / 6) * 100}%`);

  const activeCount = countActiveFilters();
  elements.activeFilterCount.textContent = String(activeCount);
  elements.activeFilterCount.hidden = activeCount === 0;
  elements.resetFiltersButton.disabled = activeCount === 0;
  window.FilterLayouts?.sync();
}

function countActiveFilters() {
  let count = Number(bp.only !== "all") + Number(bp.goalsOnly) + Number(!bp.activeOnly);
  if (state.filters.query) count += 1;
  if (state.filters.status !== "all") count += 1;
  if (state.filters.sort !== "name") count += 1;
  if (state.filters.categories.size !== ALL_CATEGORY_KEYS.length) count += 1;
  count += state.filters.types.size;
  if (state.filters.sizeMin !== 0 || state.filters.sizeMax !== 6) count += 1;
  FACET_NAMES.forEach((name) => { count += state.filters[name].size; });
  count += state.filters.manufacturer ? 1 : 0;
  count += state.filters.systems.size;
  return count;
}

function serializeFilters() {
  return {
    query: state.filters.query, status: state.filters.status, sort: state.filters.sort, manufacturer: state.filters.manufacturer, systems: [...state.filters.systems],
    categories: [...state.filters.categories], types: [...state.filters.types],
    sizeMin: state.filters.sizeMin, sizeMax: state.filters.sizeMax,
    ...Object.fromEntries(FACET_NAMES.map((name) => [name, [...state.filters[name]]])),
  };
}

function mainCategoryLabel(id) {
  return MAIN_CATEGORIES.find((group) => group.id === id)?.label || "Sonstiges";
}

function categoryLabel(key) {
  for (const group of MAIN_CATEGORIES) {
    const match = group.children.find(([childKey]) => childKey === key);
    if (match) return match[1];
  }
  return "Nicht zugeordnet";
}

function cssEscape(value) {
  return window.CSS?.escape ? window.CSS.escape(value) : String(value).replace(/[^a-z0-9_-]/gi, "");
}

function getMissionDefinition(mission) {
  return state.missionDefinitions.get(String(mission.id || ""))
    || state.missionDefinitions.get(String(mission.debugName || ""))
    || null;
}

function getMissionRewardPools(mission, definition = null) {
  const explicitPools = definition?.rewardPools || mission?.rewardPools;
  if (Array.isArray(explicitPools) && explicitPools.length) return explicitPools;
  const grouped = new Map();
  for (const item of state.items) {
    for (const linked of item.scmdb?.missions || []) {
      const sameMission = mission.id && linked.id === mission.id
        ? true : Boolean(mission.debugName && linked.debugName === mission.debugName);
      if (!sameMission) continue;
      const key = linked.poolId || linked.poolName || `pool-${grouped.size + 1}`;
      if (!grouped.has(key)) grouped.set(key, {
        id: key, name: linked.poolName || key, chancePercent: linked.poolChancePercent,
        drawCount: 1, size: linked.poolSize || 0, trigger: linked.trigger || "complete", items: [],
      });
      const pool = grouped.get(key);
      if (!pool.items.some((entry) => normalize(entry.name) === normalize(item.name))) {
        pool.items.push({
          name: item.name, blueprintRecord: item.scmdb?.blueprint?.guid || null,
          entityClass: item.scmdb?.blueprint?.entityClass || null, weight: 1,
        });
      }
    }
  }
  if (!grouped.size) {
    grouped.set(mission.poolId || mission.poolName || "blueprint-pool", {
      id: mission.poolId || mission.poolName || "blueprint-pool",
      name: mission.poolName || "Bauplan-Pool",
      chancePercent: mission.poolChancePercent,
      drawCount: 1,
      size: mission.poolSize || 0,
      trigger: mission.trigger || "complete",
      items: [],
    });
  }
  return [...grouped.values()];
}

let rewardIndexItems=null,rewardIndex=null;
function resolveRewardItem(entry) {
  if(rewardIndexItems!==state.items){
    rewardIndexItems=state.items;rewardIndex={uuid:new Map(),bp:new Map(),names:new Map()};
    for(const i of state.items){if(i.scmdb?.blueprint?.entityClass)rewardIndex.uuid.set(i.scmdb.blueprint.entityClass,i);if(i.scmdb?.blueprint?.guid)rewardIndex.bp.set(i.scmdb.blueprint.guid,i);const n=normalize(i.name);rewardIndex.names.set(n,rewardIndex.names.has(n)?null:i);}
  }
  if(entry?.entityClass)return rewardIndex.uuid.get(entry.entityClass)||null;
  if(entry?.blueprintRecord)return rewardIndex.bp.get(entry.blueprintRecord)||null;
  return rewardIndex.names.get(normalize(entry?.name))||null;
}

function renderRewardPool(pool) {
  const items = Array.isArray(pool.items) ? pool.items : [];
  const resolved = items.map((entry) => ({ entry, item: resolveRewardItem(entry) }));
  const owned = resolved.filter(({ item }) => item?.isDone).length;
  const poolSize = Number(pool.size) || items.length;
  const drawCount = Math.max(1, Number(pool.drawCount) || 1);
  return `<article class="reward-pool-card" style="--pool-chance:${Math.max(0,Math.min(100,Number(pool.chancePercent)||0))}%">
    <header><div><strong>${escapeHtml(pool.name || pool.id || "Bauplan-Pool")}</strong><small>${owned}/${poolSize || items.length} bereits erhalten</small></div><span>${formatPercent(pool.chancePercent)} Chance · ${drawCount} von ${formatNumber(poolSize || items.length)}</span></header>
    <div class="reward-item-list">${resolved.length ? resolved.map(({ entry, item }) => `
      <button class="reward-item-row ${item?.isDone ? "is-owned" : ""}" data-ownership="${item?.ownershipSource||'sync'}" type="button" ${item ? `data-reward-item-id="${item.id}"` : "disabled"}>
        <i aria-hidden="true">⌕</i><span>${escapeHtml(entry.name || "Unbekannter Bauplan")} ${item?.isDone||typeof item?.manualOwned==='boolean'?`<small class="ownership-source">${item.ownershipSource==='manual'?'Manuell':item.ownershipSource==='log'?'Spiel-Log':'Synchronisiert'}</small>`:''}</span>
        <span class="reward-owned" title="${item?.isDone ? "Bauplan erhalten" : item ? "Bauplan offen" : "Nicht im lokalen Katalog"}"><b aria-hidden="true">${item?.isDone ? "✓" : ""}</b>${item?.isDone ? "ERHALTEN" : item ? "OFFEN" : "UNBEKANNT"}</span>
      </button>`).join("") : `<p class="reward-pool-empty">Die vollständige Poolliste wird beim nächsten automatischen SCMDB-Abgleich ergänzt.</p>`}</div>
  </article>`;
}

function startSyncWatcher() {
  window.setInterval(async () => {
    if (document.hidden) return;
    if(elements.refreshButton.disabled)return;
    try {
      const revision=await SCUI.api('/api/catalog/revision');
      if(!state.catalogSignature||revision.signature===state.catalogSignature)return;
      await loadDashboard(false,true);
    }catch{}
  }, 5_000);
}

function getSyncSignature(sync) {
  if (!sync) return "";
  return [sync.lastSuccess || "", sync.status || "", sync.scmdbVersion || "", sync.translationVersion || "", sync.translationStatus || ""].join("|");
}

function renderFatalError(error) {
  elements.blueprintRows.innerHTML = `
    <tr class="loading-row"><td colspan="7"><span class="loading-scan">Datenquelle nicht verfügbar</span>
      <p class="table-meta">Prüfe die Dateien im Ordner data und lade die Seite danach neu.</p></td></tr>`;
  elements.resultCount.textContent = "FEHLER BEIM LADEN";
  elements.heroNote.textContent = error?.message || "Die Bauplandaten konnten nicht gelesen werden.";
}

function setSystemState(mode, text) {
  elements.systemState.classList.toggle("is-online", mode === "online");
  elements.systemState.classList.toggle("is-error", mode === "error");
  elements.systemState.querySelector("span:last-child").textContent = text;
}

function showToast(message, isError = false) {
  elements.toast.textContent = message;
  elements.toast.classList.toggle("is-error", isError);
  elements.toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => { elements.toast.hidden = true; }, 3400);
}

function safeExternalUrl(value, allowedHosts) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" && allowedHosts.has(url.hostname) ? url.toString() : "";
  } catch { return ""; }
}

function cleanDescription(value) {
  return String(value || "").replace(/\\n/g, "\n").replace(/<\/?EM\d+>/gi, "").replace(/^#\s*/gm, "").trim();
}

function localizeCategory(category) { return CATEGORY_LABELS[category] || category || CATEGORY_LABELS.Unbekannt; }

function normalize(value) {
  return String(value || "").normalize("NFKC").replace(/\u00a0/g, " ").replace(/[“”„]/g, '"').replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim().toLocaleLowerCase("de-DE");
}

function isUuid(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "")); }
function formatNumber(value) { return new Intl.NumberFormat("de-DE").format(Number(value) || 0); }
function formatDecimal(value) { return new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value); }
function formatPercent(value) { return value == null || Number.isNaN(Number(value)) ? "—" : `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(Number(value))} %`; }
function formatQuantity(value) { return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 3 }).format(Number(value) || 0)}×`; }

function formatDuration(seconds) {
  const total = Number(seconds);
  if (!Number.isFinite(total)) return "—";
  if (total < 60) return `${formatNumber(total)} Sek`;
  const minutes = Math.floor(total / 60);
  const remainder = Math.round(total % 60);
  return remainder ? `${formatNumber(minutes)} Min ${formatNumber(remainder)} Sek` : `${formatNumber(minutes)} Min`;
}

function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatScmdbVersion(value) {
  if (!value) return "—";
  return String(value).replace(/-live\./i, " · LIVE ").replace(/-ptu\./i, " · PTU ");
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function missionSearchText(m){return [m.title,m.titleOriginal,m.description,m.missionType,m.category,m.contractor,...(m.systems||[]),m.region,m.minStanding,...(m.prerequisites||[]),m.illegal?'Illegal':'Legal'].filter(Boolean).join(' ');}
