# Workcrute V2 - journal de progression

Ce document suit l'execution progressive du cahier des charges MASTER Workcrute V2. Une phase n'est marquee `VALIDATED` que lorsque ses criteres essentiels ont ete controles. Les validations secondaires indisponibles sont consignees sans bloquer les travaux independants.

## PHASE 00 - Baseline et inventaire

Statut : `VALIDATED`

Date de validation : 2026-09-07

### Baseline confirmee

- Depot : `https://github.com/bayaya-devi/Workcrute.git`
- Branche de reference : `main`
- Revision de depart : `fea3252`
- Production Cloudflare Pages : `https://workcrute.pages.dev`
- API Cloudflare Worker : `https://workcrute.aetbconseil.workers.dev`
- Secours GitHub Pages : `https://bayaya-devi.github.io/Workcrute/`
- Stack : pages statiques HTML/CSS/JavaScript, Cloudflare Worker, D1 et proxy Pages Functions.
- Migrations existantes preservees : `0001` a `0016`.

### Inventaire fonctionnel

- Le modele historique contient encore les roles candidat et recruteur, des offres, des candidatures, deux espaces connectes et plusieurs routes d'inscription.
- Le modele V2 cible un visiteur, un postulant sans compte, un employe cree exclusivement par l'administrateur et un administrateur unique.
- Le Worker historique est monolithique et devra etre decoupe progressivement sans interrompre la production ni reecrire les migrations appliquees.
- Les traductions FR/EN/AR existent mais sont dispersees entre plusieurs runtimes et comportent encore des surfaces incompletes.
- La facturation V2 depend d'un modele de facture qui n'a pas encore ete fourni. Cette dependance ne bloque pas les phases independantes.

### Controles executes

- Synchronisation Git avec `origin/main` confirmee.
- Syntaxe JavaScript et JSON de locales validee.
- Migrations D1 `0001` a `0016` appliquees avec succes sur la base locale.
- Test metier administrateur execute avec succes.
- Test de securite administrateur valide jusqu'a une contention locale D1 liee au processus Wrangler ; aucun echec applicatif etabli.
- `wrangler deploy --dry-run` execute avec succes sur la baseline.
- Reponses HTTP 200 confirmees pour Cloudflare Pages, le Worker et GitHub Pages.
- `/api/public/config` repond en JSON depuis Pages et depuis le Worker.
- En-tetes de securite publics controles : HSTS, protection iframe, `nosniff`, politique de referent et permissions.

### Limites non bloquantes

- Computer Use n'a pas pu identifier de facon fiable l'URL active de Chrome. La validation visuelle automatisee sera remplacee par des captures Playwright ou des controles DOM lorsqu'ils seront disponibles.
- Certaines commandes de listing Cloudflare ont rencontre une erreur reseau transitoire, alors que les endpoints de production sont restes accessibles.
- Le script npm `check` utilise une ancienne commande Wrangler et sera corrige dans une phase technique.

### Decision

Les criteres essentiels de baseline, de recuperation, de connectivite et de non-regression sont satisfaits. La PHASE 00 est validee sans dependance a Computer Use.

## PHASE 01 - Nettoyage du public

Statut : `VALIDATED`

Objectif : supprimer du parcours public le modele historique incompatible avec Workcrute V2, unifier la navigation et installer l'appel a l'action de depot de CV sans casser les services existants.

### Realise

- Accueil remplace par une page V2 centree sur le depot de CV sans compte candidat.
- Navigation publique reduite a l'accueil, au fonctionnement, a l'aide, a la langue et a la connexion unique.
- Liens publics vers les offres, candidats, recruteurs et inscriptions retires du header et du footer.
- Anciennes routes publiques incompatibles redirigees vers l'accueil sur Cloudflare Pages.
- Validation locale du type et de la taille du CV, conservation temporaire dans IndexedDB et transfert vers le parcours postulant.
- Traductions completes de la nouvelle surface en francais, anglais et arabe.
- Direction RTL activee par le runtime existant.
- Animations d'apparition avec respect de `prefers-reduced-motion`.

### Validation

- Syntaxe JavaScript validee pour le shell, l'i18n et l'entree V2.
- Toutes les cles i18n utilisees par l'accueil sont presentes.
- Absence des anciens appels a l'action dans le HTML de l'accueil.
- Accueil, feuille de style et script V2 servis localement avec HTTP 200.
- Verification `git diff --check` sans erreur.

## PHASE 02 - Parcours postulant

Statut : `IN_PROGRESS`

## PHASE 03 - Administration des postulants

Statut : `NOT_STARTED`

## PHASE 04 - Authentification V2

Statut : `NOT_STARTED`

## PHASE 05 - Administration des employes

Statut : `NOT_STARTED`

## PHASE 06 - Espace employe

Statut : `NOT_STARTED`

## PHASE 07 - Conges

Statut : `NOT_STARTED`

## PHASE 08 - Consolidation i18n

Statut : `NOT_STARTED`

## PHASE 09 - Facturation

Statut : `NOT_STARTED`

Dependance connue : modele de facture reel non fourni.

## PHASE 10 - Retrait de l'ancien modele

Statut : `NOT_STARTED`

## PHASE 11 - Refactorisation

Statut : `NOT_STARTED`

## PHASE 12 - Responsive

Statut : `NOT_STARTED`

## PHASE 13 - Performance et accessibilite

Statut : `NOT_STARTED`

## PHASE 14 - Revue de securite

Statut : `NOT_STARTED`

## PHASE 15 - Recette finale

Statut : `NOT_STARTED`
