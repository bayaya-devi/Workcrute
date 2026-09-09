# Audit de publication Workcrute V2

Date : 9 septembre 2026

## Cause identifiee

Cloudflare Pages appliquait correctement `public/_redirects`, mais GitHub Pages publiait directement tout le dossier `public/` et ignore ce format de redirection. Les anciens fichiers HTML des espaces offres, candidat, recruteur et inscription restaient donc accessibles par leur URL directe sur `bayaya-devi.github.io/Workcrute/` avant l'execution de leur ancien JavaScript.

## Correction

- Les 39 anciens fichiers HTML sont maintenant des redirections statiques minimales vers l'accueil V2 ou la connexion V2.
- Les redirections utilisent des chemins relatifs compatibles avec le sous-chemin `/Workcrute/` de GitHub Pages.
- Les routes exactes et imbriquees sont couvertes dans `_redirects` pour Cloudflare Pages.
- Une page `404.html` V2 est fournie au mecanisme natif de GitHub Pages.
- HTML, JavaScript et CSS critiques sont revalides a chaque consultation ; les images conservent un cache d'une heure.
- L'image OpenGraph de l'accueil utilise une URL V2 absolue.

## Publication controlee

- GitHub Pages : un seul workflow, `.github/workflows/deploy-pages.yml`, publie `public/` depuis `main`.
- Cloudflare Pages : projet `workcrute`, sans fournisseur Git automatique ; le deploiement est explicite via Wrangler ou le workflow manuel Cloudflare.
- Aucun Service Worker, manifeste PWA ou cache Workbox n'est present.
- Les anciennes branches distantes ne declenchent aucun deploiement officiel.
- Les anciens artefacts GitHub Pages ne sont pas servis : seul le dernier deploiement actif alimente le domaine public.

## Garde-fous

`npm run test:v2-retirement` verifie l'inventaire des anciennes pages, l'absence des principales chaines de l'ancien produit, les chemins GitHub Pages, les redirections Cloudflare, la fraicheur du shell, la FAQ V2 et la fermeture de l'ancienne inscription.
