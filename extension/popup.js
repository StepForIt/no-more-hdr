const DEFAULTS = {
  enabled: true,
  mode: "everywhere",
  exceptions: [
    "youtube.com",
    "netflix.com",
    "photos.google.com",
    "figma.com",
    "lightroom.adobe.com",
    "apple.com",
  ],
  domains: ["linkedin.com", "x.com", "instagram.com"],
  revealOnHover: true,
};

const $ = (id) => document.getElementById(id);

let cfg = { ...DEFAULTS };
let host = null;
let tabId = null;
// Pourquoi il n'y a pas de host : page interne du navigateur, ou URL illisible.
let reason = null;

const matches = (h, p) => h === p || h.endsWith("." + p);

/** Liste pertinente selon le mode : exceptions en "partout", cibles en "liste". */
function listKey() {
  return cfg.mode === "list" ? "domains" : "exceptions";
}

function listed() {
  return !!host && cfg[listKey()].some((d) => matches(host, d));
}

function neutralised() {
  if (!cfg.enabled || !host) return false;
  return cfg.mode === "list" ? listed() : !listed();
}

function render() {
  $("enabled").dataset.on = String(cfg.enabled);
  $("reveal").dataset.on = String(cfg.revealOnHover);
  $("m-everywhere").dataset.active = String(cfg.mode === "everywhere");
  $("m-list").dataset.active = String(cfg.mode === "list");

  $("mode-hint").textContent =
    cfg.mode === "list"
      ? "actif uniquement sur la liste"
      : "actif partout sauf exceptions";

  $("host").textContent = host || "page interne du navigateur";

  const on = neutralised();
  $("state").dataset.on = String(on);
  $("state").textContent = !host
    ? reason || "rien à neutraliser ici"
    : !cfg.enabled
    ? "extension désactivée"
    : on
    ? "HDR neutralisé ici"
    : "HDR laissé libre ici";

  const btn = $("toggle-site");
  btn.disabled = !host || !cfg.enabled;
  btn.textContent = !host
    ? "Ouvre une page web pour agir"
    : cfg.mode === "list"
    ? listed()
      ? "Retirer de la liste"
      : "Neutraliser sur ce site"
    : listed()
    ? "Neutraliser sur ce site"
    : "Autoriser le HDR ici";
}

function save() {
  chrome.storage.sync.set(cfg, () => {
    render();
    if (tabId !== null) chrome.tabs.reload(tabId);
  });
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (!tab) return;
  tabId = tab.id;

  if (!tab.url) {
    // Sans permission lisible sur cet onglet, Chrome renvoie une URL vide.
    reason = "URL de l'onglet illisible";
  } else {
    try {
      const u = new URL(tab.url);
      if (u.protocol.startsWith("http")) {
        host = u.hostname.replace(/^www\./, "");
      } else {
        reason = u.protocol.replace(":", "") + " : hors périmètre";
      }
    } catch (_) {
      reason = "URL de l'onglet illisible";
    }
  }

  chrome.storage.sync.get(DEFAULTS, (stored) => {
    cfg = stored;
    render();
  });
});

$("enabled").addEventListener("click", () => {
  cfg.enabled = !cfg.enabled;
  save();
});

$("reveal").addEventListener("click", () => {
  cfg.revealOnHover = !cfg.revealOnHover;
  save();
});

$("m-everywhere").addEventListener("click", () => {
  cfg.mode = "everywhere";
  save();
});

$("m-list").addEventListener("click", () => {
  cfg.mode = "list";
  save();
});

$("toggle-site").addEventListener("click", () => {
  if (!host) return;
  const key = listKey();
  cfg[key] = listed()
    ? cfg[key].filter((d) => !matches(host, d))
    : [...cfg[key], host];
  save();
});
