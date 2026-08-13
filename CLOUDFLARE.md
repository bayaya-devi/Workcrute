# Configuration Cloudflare de Workcrute

## Ressources actives

- Worker : `workcrute`
- Pages : `workcrute`
- D1 : `workcrute`, binding `DB`
- Assets Worker : binding `ASSETS`, répertoire `public/`
- Tâche planifiée : traitement périodique de la file email

Les documents sont actuellement stockés de manière privée dans D1 par morceaux. Le code prend également en charge un binding objet optionnel nommé `DOCUMENTS`.

## Secrets requis

- `SESSION_PEPPER`
- `ADMIN_AUTH_SECRET_1`
- `ADMIN_AUTH_SECRET_2`

## Email optionnel

- `EMAIL_FROM`
- `EMAIL_PROVIDER_API_KEY`
- ou un binding `EMAIL` compatible

Ne jamais placer les valeurs dans `wrangler.jsonc`, GitHub, le README ou la documentation.

## Déployer

```powershell
pnpm exec wrangler whoami
pnpm exec wrangler deploy --dry-run
pnpm exec wrangler d1 migrations apply workcrute --remote
pnpm exec wrangler deploy --keep-vars
pnpm exec wrangler pages deploy public --project-name workcrute --branch main
```

## Vérifier

- `https://workcrute.pages.dev/`
- `https://workcrute.aetbconseil.workers.dev/api/public/config`
- connexion candidat et recruteur ;
- double connexion admin ;
- envoi d’un email de test ;
- centre d’erreurs et activité en direct.

## Sauvegarder D1

```powershell
pnpm exec wrangler d1 export workcrute --remote --output tmp/workcrute-backup.sql
```

Le fichier de sauvegarde ne doit jamais être commité.
