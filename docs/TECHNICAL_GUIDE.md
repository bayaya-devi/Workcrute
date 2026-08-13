# Guide technique Workcrute

## Architecture

Workcrute est une application Cloudflare composée d’un frontend statique et d’un backend Worker :

```text
Navigateur
  ├─ Pages / assets statiques : public/
  └─ API /api/*
       └─ Cloudflare Worker : src/index.js
            ├─ Cloudflare D1 : données métier, sessions et documents fragmentés
            ├─ fournisseur email ou binding Email optionnel
            └─ observabilité Cloudflare
```

Le Worker sert aussi les assets via le binding `ASSETS`. Le projet Pages publie le répertoire `public/` et sa fonction transmet les routes API au backend.

## Stack

- Frontend : HTML5, CSS et JavaScript natifs.
- Backend : JavaScript ES modules sur Cloudflare Workers.
- Base : Cloudflare D1, compatible SQLite.
- Déploiement : Wrangler 4.x.
- CI : GitHub Actions pour les publications statiques configurées.
- Tests : scripts d’intégration Node.js lançant Wrangler localement.
- PDF : générateur serveur interne pour les récapitulatifs administratifs.

## Environnements

- Local : `wrangler dev --local --port 8787`, données sous `.wrangler/`.
- Production Worker : `https://workcrute.aetbconseil.workers.dev`.
- Production Pages : `https://workcrute.pages.dev`.
- Preview Pages : URL unique générée à chaque publication manuelle.

Les secrets locaux vont dans `.dev.vars`, ignoré par Git. Ne jamais copier un secret réel dans un fichier versionné.

## Base de données

Le binding `DB` pointe vers la base D1 `workcrute`. Les migrations sont versionnées dans `migrations/` et couvrent notamment :

- utilisateurs, profils et sessions ;
- entreprises, offres, candidatures et statuts ;
- documents et morceaux binaires ;
- entretiens, alertes et notifications ;
- sécurité et audit admin ;
- événements temps réel ;
- questionnaires recruteur et modèles admin ;
- FAQ et analytics chatbot ;
- file d’emails et journaux de livraison ;
- centre d’erreurs et paramètres plateforme.

Commandes principales :

```powershell
pnpm run db:migrate:local
pnpm run db:migrate:remote
```

Appliquer les migrations distantes avant de déployer du code qui dépend d’un nouveau schéma.

## Authentification

Les mots de passe utilisateurs sont dérivés avec PBKDF2-SHA-256, sel individuel et 310 000 itérations. Les sessions utilisent des tokens opaques dont seule l’empreinte est stockée.

Cookie utilisateur : `wc_session`, `HttpOnly`, `Secure`, `SameSite=Lax`. Durée maximale actuelle : 30 jours.

L’administration possède une authentification successive à deux secrets :

1. validation de `ADMIN_AUTH_SECRET_1` ;
2. défi temporaire puis validation de `ADMIN_AUTH_SECRET_2` ;
3. création d’une session admin liée à l’empreinte réseau.

Le cookie admin est `HttpOnly`, `Secure`, `SameSite=Strict`. La session possède une expiration absolue de 8 heures et une expiration d’inactivité de 30 minutes. Le rate limiting bloque temporairement les tentatives répétées.

## Rôles et permissions

- `candidate` : profil propre, documents propres, offres publiées, favoris, alertes, candidatures, entretiens et préférences.
- `recruiter` : entreprise associée, offres propres, questionnaires autorisés, candidatures reçues, candidats visibles, notes internes et entretiens.
- administrateur : session séparée, routes `/api/admin/*`, gestion globale et audit.

Les contrôles de rôle sont appliqués côté serveur. Masquer un bouton dans le frontend ne constitue jamais une permission.

## Stockage des documents

Le mode actuellement déployé conserve les métadonnées et les fichiers découpés en morceaux dans D1 (`documents` et `document_chunks`). Le code accepte aussi un binding objet `DOCUMENTS` lorsqu’il est fourni.

Les documents ne sont pas exposés par une URL publique. Téléchargement et suppression exigent une session autorisée. Les règles de format, taille, nombre et type proviennent des paramètres administrables.

## Emails

La file `admin_email_outbox` sépare la création métier de la livraison. Un échec email ne doit donc pas annuler une inscription, une offre ou une candidature.

Ordre de livraison :

1. binding `EMAIL.send` si configuré ;
2. API Resend avec `EMAIL_PROVIDER_API_KEY` et `EMAIL_FROM` ;
3. erreur contrôlée `EMAIL_PROVIDER_NOT_CONFIGURED`.

Les retries utilisent un délai exponentiel limité. Les livraisons et échecs sont journalisés. Les pièces jointes PDF/CSV sont générées à partir des données utiles et n’incluent jamais mot de passe, token, session, OTP ou secret.

## Chatbot et FAQ

La base FAQ contient plus de 100 questions distinctes en FR, EN et AR, avec mots-clés, catégorie, priorité et statut. La recherche normalise les accents, fautes simples et formulations proches.

Le chatbot ne génère pas de réponse libre. Sous le seuil de similarité configuré, il enregistre la question comme non comprise et propose des FAQ proches. L’administration peut convertir cette question en FAQ.

## Matching

Le matching est déterministe et désactivable. Les poids administrables couvrent compétences, expérience, formation, localisation, contrat, disponibilité et questionnaire.

Une composante n’entre dans le calcul que lorsque l’offre et le candidat possèdent des données réellement comparables. Les compétences sont comparées après normalisation exacte, sans score aléatoire. Si moins de deux composantes fiables sont disponibles, le score reste indisponible.

## Administration

Le Control Center comprend : tableau de bord, activité, notifications, candidats, recruteurs, entreprises, offres, candidatures, entretiens, questionnaires, chatbot/FAQ, erreurs, paramètres et sécurité.

Le flux d’activité repose sur le journal `platform_events` et une lecture incrémentale toutes les 20 secondes. Les modifications sensibles enregistrent l’administrateur, la ressource, la valeur avant et la valeur après.

## Gestion des erreurs

Le contrat d’erreur exposé au frontend est :

```json
{
  "code": "ERROR_CODE",
  "userMessage": "Message compréhensible",
  "requestId": "identifiant",
  "timestamp": "date ISO"
}
```

En production, aucune stacktrace n’est envoyée au navigateur. Les erreurs significatives sont enregistrées dans le centre d’erreurs avec service, sévérité, route, utilisateur éventuel et Request ID. Le frontend gère notamment réseau hors ligne, session expirée, upload, validation et retry.

## Déploiement

Prérequis : Node.js, pnpm, Wrangler 4.x et une session Cloudflare autorisée.

```powershell
pnpm install
pnpm exec wrangler whoami
pnpm exec wrangler deploy --dry-run
pnpm exec wrangler d1 migrations apply workcrute --remote
pnpm exec wrangler deploy --keep-vars
pnpm exec wrangler pages deploy public --project-name workcrute --branch main
```

`--keep-vars` évite d’écraser les variables et secrets déjà configurés dans le compte Cloudflare. Vérifier ensuite `/api/public/config`, la page d’accueil et les parcours de connexion.

## Variables d’environnement

Variables requises :

- `SESSION_PEPPER` : poivre cryptographique des tokens ;
- `ADMIN_AUTH_SECRET_1` : premier secret admin ;
- `ADMIN_AUTH_SECRET_2` : second secret admin.

Variables de configuration :

- `APP_ORIGIN` : origine frontend autorisée ;
- `ENVIRONMENT` : `development`, `test` ou `production`.

Variables email selon le fournisseur :

- `EMAIL_FROM` : expéditeur vérifié ;
- `EMAIL_PROVIDER_API_KEY` : clé API du fournisseur ;
- binding `EMAIL` : alternative native lorsqu’elle est disponible.

Variable réservée aux tests :

- `ADMIN_EMAIL_TEST_CODE` : code fixe uniquement dans un environnement de test, jamais en production.

Bindings :

- `DB` : D1 obligatoire ;
- `ASSETS` : assets statiques ;
- `DOCUMENTS` : stockage objet optionnel.

## Sauvegarde

Avant une migration importante :

```powershell
pnpm exec wrangler d1 export workcrute --remote --output tmp/workcrute-backup.sql
```

Conserver la sauvegarde hors du dépôt Git, dans un espace chiffré et à accès limité. Sauvegarder également la configuration Cloudflare, la liste des secrets sans leurs valeurs, les paramètres DNS et la branche de production GitHub.

Tester périodiquement une restauration dans un environnement séparé. Ne jamais restaurer directement sur la production sans validation.

## Dépannage

- `401` : session absente ou expirée ; se reconnecter.
- `403` : rôle insuffisant, origine refusée ou ressource suspendue.
- `404` : identifiant ou route incorrecte, ressource non publiée.
- `409` : conflit, par exemple compte ou candidature déjà existante.
- `429` : protection brute force ; attendre le délai indiqué.
- `500/503` : relever le Request ID et consulter Admin > Erreurs.
- Upload : contrôler format, taille, quota, réseau puis stockage.
- Email : vérifier expéditeur, clé fournisseur, adresse admin vérifiée et file d’envoi.
- D1 : vérifier les migrations et le binding `DB` du bon environnement.
- Déploiement : commencer par `wrangler deploy --dry-run`, puis vérifier les logs Cloudflare.

Scripts d’intégration disponibles dans `scripts/` : sécurité, monitoring, CRUD admin, questionnaires, chatbot, emails, erreurs, paramètres et stockage documentaire.
