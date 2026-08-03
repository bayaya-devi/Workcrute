Workrute — version professionnelle

Ouvrir index.html dans un navigateur.

À remplacer avant mise en ligne :
- https://votre-domaine.com dans index.html, robots.txt et sitemap.xml
- La zone vidéo dans la section d'accueil

Fonctions incluses :
- design sobre premium
- animation logo d'ouverture
- parallax discret
- changement de langue FR / EN / AR
- formulaire de candidature avec RGPD et honeypot
- inscription / connexion front-end prototype
- page de chargement avec logo avant dashboard
- dashboard candidat local

## Backend sécurisé Workcrute

Workcrute est désormais conçu comme un Cloudflare Worker servant les fichiers statiques et l'API privée. Les profils et sessions sont stockés dans D1 ; les CV et lettres sont stockés dans R2, sans URL publique.

### Préparer Cloudflare

1. Créer une base D1 : `npx wrangler d1 create workcrute`.
2. Créer un bucket R2 : `npx wrangler r2 bucket create workcrute-documents`.
3. Reporter l'identifiant D1 dans `wrangler.jsonc`.
4. Copier `.dev.vars.example` vers `.dev.vars` et renseigner les secrets.
5. Appliquer la migration : `npm run db:migrate:remote`.
6. Déployer : `npm run deploy`.

Les secrets requis sont `SESSION_PEPPER`, et les variables du fournisseur email lorsque celui-ci est raccordé. Ne jamais versionner `.dev.vars`.
