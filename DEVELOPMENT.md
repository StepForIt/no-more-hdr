# Développement

Documentation technique de [No More HDR](README.md).

## Principe

La propriété CSS `dynamic-range-limit` existe précisément pour ce cas. La valeur `standard` plafonne la luminance d'un élément au blanc de référence, donc au blanc SDR classique.

```css
img { dynamic-range-limit: standard; }
```

Le survol restaure l'amplitude complète à la demande :

```css
img:hover { dynamic-range-limit: no-limit; }
```

L'extension injecte ces règles au plus tôt dans le cycle de chargement, avec un ciblage par site.

## Récupérer les sources

```bash
git clone -b dev https://github.com/StepForIt/no-more-hdr.git
```

Le dossier à charger en mode développeur est `no-more-hdr/extension`.

Après modification du code, cliquer l'icône de rechargement sur la carte de l'extension, puis recharger les onglets concernés.

## Ordre d'injection

`chrome.storage` est asynchrone. Si le content script attendait la configuration avant d'injecter la règle, le HDR serait visible pendant 50 à 200 ms à chaque chargement, soit exactement le flash qu'on veut éviter.

L'ordre est donc inversé : on injecte d'abord, on retire ensuite si le site n'est pas concerné.

```
document_start
    │
    ├─ injection immédiate de la règle
    │
    └─ lecture de la config (async)
           ├─ site concerné    → on garde, + règle de survol si activée
           └─ site non concerné → on retire
```

Un `MutationObserver` surveille `documentElement` : certaines SPA reconstruisent le `<head>` au routing et emportent la balise `<style>` avec.

## Banc d'essai

Le dossier `test/` contient la page publiée sur GitHub Pages. Elle s'ouvre aussi en double-clic en local.

Elle affiche une mire calibrée : un AVIF 10 bits en Rec.2100 PQ, dont le carré central est encodé à 1000 nits et le fond à 90 nits, soit environ 3,3 diaphragmes d'écart. La mire est posée au milieu d'un texte ordinaire, de façon à rendre visible l'assombrissement du contenu autour.

La page fournit aussi :

- un diagnostic (`(dynamic-range: high)` et `CSS.supports`) qui dit si l'écran et le navigateur sont concernés
- deux boutons qui appliquent les règles en direct, sans installer l'extension
- une comparaison entre la mire HDR et son jumeau SDR reconstruit en CSS

### Protocole de test

```
1. Chrome ou Safari, sur un écran HDR
2. luminosité pas au maximum  → plus de marge = effet plus visible
3. mode économie d'énergie désactivé → macOS coupe le HDR sinon
4. observer le fond de page pendant que la mire est à l'écran
```

## Workflows CI

Le travail se fait sur `dev`.

| Workflow | Déclencheur | Produit |
|---|---|---|
| `package.yml` | push sur `dev`, PR | Zip de l'extension en artefact |
| `package.yml` | tag `v*` | Release GitHub avec le zip attaché |
| `pages.yml` | modification de `test/` | Publication du banc d'essai |

Le zip est fabriqué depuis l'intérieur de `extension/`, le `manifest.json` se retrouve donc à la racine de l'archive, comme l'exige le Chrome Web Store. La CI refuse un tag dont le numéro ne correspond pas à la version du manifest.
