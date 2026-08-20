# No More HDR

Extension Chrome qui empêche les images HDR de forcer le reste de la page à s'assombrir.

**Démo en ligne : [stepforit.github.io/no-more-hdr](https://stepforit.github.io/no-more-hdr/)**

Le banc d'essai fonctionne sans rien installer. Il te dit si ton écran est concerné et te laisse activer la neutralisation en direct.

## Le problème

Une image encodée en HDR ne se contente pas d'être plus lumineuse. Elle demande au compositeur de l'OS une marge de luminance supplémentaire, et l'OS la lui accorde en abaissant tout le contenu SDR autour. Un seul visuel dans un fil d'actualité suffit à ternir la page entière.

Ce n'est ni un bug ni une attaque : c'est le comportement normal d'un écran HDR. Mais quand la technique sert à faire ressortir une publication au milieu d'un fil, l'effet devient une nuisance.

```
Image HDR dans la page
        │
        ▼
le navigateur réclame du headroom EDR
        │
        ▼
l'OS l'accorde et compense en assombrissant le SDR
        │
        ▼
ton texte, ton fond, tout le reste paraît terne
```

## La solution

La propriété CSS `dynamic-range-limit` existe précisément pour ce cas. La valeur `standard` plafonne la luminance d'un élément au blanc de référence, donc au blanc SDR classique.

```css
img { dynamic-range-limit: standard; }
```

L'extension injecte cette règle au plus tôt dans le cycle de chargement, avec un ciblage par site et une possibilité de révéler le HDR à la demande.

## Installation

L'extension n'est pas encore publiée sur le Chrome Web Store. Elle se charge donc en mode développeur, ce qui prend une minute et ne présente aucun risque : le code tient en trois fichiers, tous lisibles dans `extension/`.

### 1. Récupérer les fichiers

Deux options, au choix.

**Depuis une release** (recommandé)

Télécharger le `.zip` de la [dernière release](https://github.com/StepForIt/no-more-hdr/releases), puis le décompresser. Le dossier obtenu contient directement `manifest.json`.

**Depuis les sources**

```bash
git clone -b dev https://github.com/StepForIt/no-more-hdr.git
```

Le dossier à charger sera `no-more-hdr/extension`.

### 2. Charger dans le navigateur

| Navigateur | Adresse à ouvrir |
|---|---|
| Chrome | `chrome://extensions` |
| Edge | `edge://extensions` |
| Brave | `brave://extensions` |
| Arc, Opera, Vivaldi | `chrome://extensions` |

Puis :

1. Activer **Mode développeur**, en haut à droite sur Chrome, dans le menu de gauche sur Edge.
2. Cliquer **Charger l'extension non empaquetée**.
3. Sélectionner le dossier contenant `manifest.json`, pas le fichier lui-même.
4. L'icône apparaît dans la barre d'outils. L'épingler la rend accessible en un clic.

### 3. Vérifier que ça marche

Ouvrir la [démo](https://stepforit.github.io/no-more-hdr/) ou un fil LinkedIn, puis cliquer sur l'icône de l'extension. Le popup doit afficher le nom de domaine et l'état de neutralisation.

S'il affiche « page interne du navigateur », c'est que l'onglet actif est une page `chrome://`. L'extension n'agit que sur des pages web réelles, ouvre un vrai site et réessaie.

### Notes

- Une extension chargée en mode développeur reste active après redémarrage, mais Chrome affiche un avertissement au lancement. Il se referme sans conséquence.
- Après modification du code, il faut cliquer l'icône de rechargement sur la carte de l'extension, puis recharger les onglets concernés.

## Deux modèles de ciblage

L'extension embarque les deux, on bascule dans le popup.

| Mode | Comportement | Pour qui |
|---|---|---|
| **Partout** (défaut) | Neutralise sur tous les sites, sauf une liste d'exceptions | Ceux qui veulent la paix sans configurer |
| **Liste** | Neutralise uniquement sur les domaines listés | Ceux qui ne veulent agir que sur un ou deux sites |

Exceptions pré-remplies en mode Partout : `youtube.com`, `netflix.com`, `photos.google.com`, `figma.com`, `lightroom.adobe.com`, `apple.com`. Ce sont les endroits où le HDR est légitime.

Liste pré-remplie en mode Liste : `linkedin.com`, `x.com`, `instagram.com`.

Dans les deux cas, un bouton du popup ajoute ou retire le site courant de la liste pertinente.

## Révéler au survol

Activé par défaut.

```css
img:hover { dynamic-range-limit: no-limit; }
```

La page reste calme, mais l'image que l'on pointe volontairement retrouve toute son amplitude. C'est l'usage prévu par la spécification : brider en vue d'ensemble, étendre à la demande. Une photo HDR légitime reste consultable sans avoir à toucher aux réglages.

## Détail d'implémentation

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

## Support navigateur

| Navigateur | `dynamic-range-limit` |
|---|---|
| Chrome, Edge, Brave, Arc | depuis la version 136 |
| Safari | depuis Safari 26 |
| Firefox | non supporté, mais ne rend pas le HDR non plus |

L'extension est au format Manifest V3, donc utilisable telle quelle sur tous les navigateurs Chromium.

## Banc d'essai

Le dossier `test/` contient la page publiée sur GitHub Pages. Elle s'ouvre aussi en double-clic en local.

Elle affiche une mire calibrée : un AVIF 10 bits en Rec.2100 PQ, dont le carré central est encodé à 1000 nits et le fond à 90 nits, soit environ 3,3 diaphragmes d'écart. La mire est posée au milieu d'un texte ordinaire, de façon à rendre visible l'assombrissement du contenu autour.

La page fournit aussi :

- un diagnostic (`(dynamic-range: high)` et `CSS.supports`) qui dit si l'écran et le navigateur sont concernés
- deux boutons qui appliquent les règles en direct, sans installer l'extension
- une comparaison entre la mire HDR et son jumeau SDR reconstruit en CSS

Protocole de test :

```
1. Chrome ou Safari, sur un écran HDR
2. luminosité pas au maximum  → plus de marge = effet plus visible
3. mode économie d'énergie désactivé → macOS coupe le HDR sinon
4. observer le fond de page pendant que la mire est à l'écran
```

## Développement

Le travail se fait sur `dev`.

| Workflow | Déclencheur | Produit |
|---|---|---|
| `package.yml` | push sur `dev`, PR | Zip de l'extension en artefact |
| `package.yml` | tag `v*` | Release GitHub avec le zip attaché |
| `pages.yml` | modification de `test/` | Publication du banc d'essai |

Le zip est fabriqué depuis l'intérieur de `extension/`, le `manifest.json` se retrouve donc à la racine de l'archive, comme l'exige le Chrome Web Store. La CI refuse un tag dont le numéro ne correspond pas à la version du manifest.

## Limites connues

- Le tonemapping des vidéos ne passe pas toujours par le compositing CSS, l'effet peut être partiel sur certains lecteurs.
- Les images en HDR dans un `iframe` cross-origin ne sont pas atteintes par la feuille de style de la page parente. Le content script s'exécute dans les frames (`all_frames`), ce qui couvre la plupart des cas.
- Les icônes ne sont pas encore fournies, la publication sur le Chrome Web Store en réclame trois tailles.

## Licence

MIT.
