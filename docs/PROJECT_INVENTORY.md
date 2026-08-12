# Inventaire technique Workcrute

## Stack réelle

- Frontend : HTML, CSS et JavaScript natifs, sans framework.
- Backend : Cloudflare Worker (`src/index.js`).
- Déploiement et développement local : Wrangler.
- Base relationnelle : Cloudflare D1 (SQLite), migrations versionnées.
- Documents privés : Cloudflare R2.
- Authentification : sessions opaques en cookie `HttpOnly`, `Secure`, `SameSite=Lax` ; mots de passe dérivés avec PBKDF2-SHA-256 et sel individuel.
- E-mails : point d’intégration serveur présent, fournisseur externe restant à configurer.
- Internationalisation : nouvelle couche publique centralisée FR/EN/AR, persistance locale et `dir="rtl"` pour l’arabe ; anciennes couches spécifiques encore présentes dans les espaces privés.

## Cartographie fonctionnelle

### Public

- `/` : accueil.
- `/offres/` : recherche et filtres d’offres publiées.
- `/offres/detail/?id=…` : détail dynamique d’une offre.
- `/candidats/` : présentation du parcours candidat.
- `/recruteurs/` : présentation du parcours recruteur.
- `/aide/` : centre d’aide et recherche dans 100 entrées trilingues.
- `/connexion/`, `/mot-de-passe-oublie/`, `/inscription/`.
- `/inscription/demandeur/`, `/inscription/recruteur/`.

### Candidat

- Tableau de bord, offres, candidatures, notifications, profil et paramètres.
- Profil professionnel et questionnaire.
- Téléversement et suppression de CV/lettres via R2.
- Alertes d’emploi.
- Consultation et création de candidatures.

### Recruteur

- Tableau de bord, profil, paramètres et notifications.
- Création et consultation des offres.
- Consultation des candidats reçus.

### Administration

- Connexion et tableau de bord.
- Demandeurs, recruteurs, offres, candidatures, notifications et journal d’activité.
- Gestion du questionnaire multilingue.
- Paramètres existants.

## API existante

- Auth : inscription, connexion, déconnexion, session courante, oubli du mot de passe, renvoi de vérification.
- Profil : lecture et mise à jour selon le rôle.
- Documents : liste, téléversement et suppression.
- Offres : liste publique, détail, création recruteur et liste recruteur.
- Candidatures : liste candidat et création.
- Alertes, notifications et statistiques candidat.
- Administration : statistiques et questionnaire.
- Public : statistiques agrégées sans données personnelles.

## Données principales

Les migrations existantes définissent notamment les utilisateurs, sessions, jetons e-mail, profils candidat/recruteur, documents, notifications, entreprises, offres, candidatures, historique de statuts, vues de profil, alertes, journal d’audit et questions de questionnaire.

## Risques de régression identifiés

- Les pages historiques sont fortement compactées et utilisent plusieurs couches CSS/i18n superposées.
- Les textes serveur historiques contiennent quelques problèmes d’encodage ; ils n’ont pas été réécrits dans ce lot pour éviter de modifier les contrats API.
- Le fournisseur e-mail n’est pas actif sans variables serveur.
- Le fichier `wrangler.jsonc` contient encore un identifiant D1 de remplacement : le vrai binding doit être configuré avant déploiement.
- Les espaces privés doivent être migrés progressivement vers les nouveaux tokens, sans casser leurs sélecteurs et scripts existants.
- La configuration SPA interceptait les API ; `/api/*` est désormais explicitement routé vers le Worker en premier.

## Changements protégés dans le premier lot

- Aucune migration existante n’a été modifiée.
- Aucun schéma ni contenu de production n’a été supprimé.
- Les noms de champs utilisés par l’inscription et les routes API sont conservés.
- Les parcours candidat, recruteur et admin historiques restent accessibles.
