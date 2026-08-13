# Workcrute

Plateforme de recrutement trilingue destinée aux candidats, recruteurs et administrateurs. Workcrute fonctionne sur Cloudflare Pages, Workers et D1.

## Accès

- Site : [https://workcrute.pages.dev](https://workcrute.pages.dev)
- API Worker : [https://workcrute.aetbconseil.workers.dev](https://workcrute.aetbconseil.workers.dev)
- Administration : [https://workcrute.pages.dev/admin/connexion/](https://workcrute.pages.dev/admin/connexion/)

## Documentation

- [Guide utilisateur client](docs/GUIDE_UTILISATEUR_WORKCRUTE.md)
- [Démarrage rapide administrateur](docs/ADMIN_QUICK_START.md)
- [Guide technique](docs/TECHNICAL_GUIDE.md)
- [Document de livraison](docs/HANDOVER.md)
- [Changelog](docs/CHANGELOG.md)
- [Inventaire technique](docs/PROJECT_INVENTORY.md)
- [Configuration Cloudflare](CLOUDFLARE.md)

## Développement local

Prérequis : Node.js, pnpm et Wrangler 4.x.

```powershell
pnpm install
pnpm run db:migrate:local
pnpm run dev
```

Le site local est disponible sur `http://127.0.0.1:8787`.

Créez un fichier `.dev.vars` non versionné pour les secrets locaux :

```text
SESSION_PEPPER=valeur-locale
ADMIN_AUTH_SECRET_1=valeur-locale
ADMIN_AUTH_SECRET_2=valeur-locale
ENVIRONMENT=development
```

Ne placez jamais de secret réel dans Git, la documentation, les logs ou le frontend.

## Base de données

```powershell
pnpm run db:migrate:local
pnpm run db:migrate:remote
```

Les migrations sont dans `migrations/`. Les données métier, sessions, audits, erreurs et documents privés sont stockés dans D1.

## Tests d’intégration

Les scénarios sont dans `scripts/` :

```powershell
node scripts/test-admin-security.mjs
node scripts/test-admin-monitoring.mjs
node scripts/test-admin-business.mjs
node scripts/test-admin-questionnaire-builder.mjs
node scripts/test-chatbot-admin.mjs
node scripts/test-admin-emails.mjs
node scripts/test-error-management.mjs
node scripts/test-admin-settings.mjs
node scripts/test-d1-documents.mjs
```

## Déploiement

```powershell
pnpm exec wrangler deploy --dry-run
pnpm exec wrangler d1 migrations apply workcrute --remote
pnpm exec wrangler deploy --keep-vars
pnpm exec wrangler pages deploy public --project-name workcrute --branch main
```

La configuration de production et les procédures de sauvegarde sont détaillées dans [docs/TECHNICAL_GUIDE.md](docs/TECHNICAL_GUIDE.md) et [docs/HANDOVER.md](docs/HANDOVER.md).
