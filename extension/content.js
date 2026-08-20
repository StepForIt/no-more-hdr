/**
 * HDR Off - content script
 *
 * Injecte une regle CSS `dynamic-range-limit: standard` pour empecher les
 * images HDR de forcer le compositeur de l'OS a assombrir le reste de la page.
 *
 * Strategie d'injection : on pose la regle AVANT de savoir si le site est
 * concerne, puis on la retire si besoin. chrome.storage est asynchrone : si on
 * attendait sa reponse, on verrait le HDR pendant 50 a 200 ms a chaque
 * chargement. Mieux vaut un faux positif de quelques millisecondes.
 */

const STYLE_ID = "__hdr-off";

const DEFAULTS = {
  enabled: true,
  // "everywhere" : actif partout sauf sur `exceptions`
  // "list"       : actif uniquement sur `domains`
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

const LIMIT_CSS = `
  :root,
  img, video, canvas, picture, svg, iframe,
  [style*="background-image"], [style*="image-set"] {
    dynamic-range-limit: standard !important;
  }
`;

// Le survol repasse en HDR complet : le fil reste calme, mais l'image qu'on
// regarde vraiment retrouve son eclat. C'est l'usage prevu par la spec.
const REVEAL_CSS = `
  img:hover, video:hover, picture:hover, canvas:hover {
    dynamic-range-limit: no-limit !important;
  }
`;

function inject(css) {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    (document.head || document.documentElement).appendChild(style);
  }
  if (style.textContent !== css) style.textContent = css;
}

function remove() {
  const style = document.getElementById(STYLE_ID);
  if (style) style.remove();
}

function matches(host, pattern) {
  return host === pattern || host.endsWith("." + pattern);
}

function isActive(cfg, host) {
  if (!cfg.enabled) return false;
  if (cfg.mode === "list") {
    return cfg.domains.some((d) => matches(host, d));
  }
  return !cfg.exceptions.some((d) => matches(host, d));
}

// 1. On bloque immediatement, sans rien attendre.
inject(LIMIT_CSS);

// 2. On corrige une fois la configuration lue.
chrome.storage.sync.get(DEFAULTS, (cfg) => {
  const host = location.hostname.replace(/^www\./, "");

  if (!isActive(cfg, host)) {
    remove();
    return;
  }

  const css = cfg.revealOnHover ? LIMIT_CSS + REVEAL_CSS : LIMIT_CSS;
  inject(css);

  // Les SPA reconstruisent parfois le <head> au routing. On remet la regle.
  new MutationObserver(() => inject(css)).observe(document.documentElement, {
    childList: true,
  });
});
