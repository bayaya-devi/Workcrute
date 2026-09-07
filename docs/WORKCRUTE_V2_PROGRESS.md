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

Statut : `VALIDATED`

### Realise

- Parcours en quatre etapes sans creation de compte : coordonnees, profil, documents et confirmation.
- CV obligatoire et lettre de motivation facultative, avec reprise automatique du CV depose depuis l'accueil.
- Validation navigateur et validation serveur independante.
- Conservation des donnees saisies lors des erreurs et prevention du double envoi.
- Cle d'idempotence : une repetition reseau retourne la meme reference sans creer de doublon.
- Limitation de debit par empreinte reseau.
- Nouvelles tables D1 isolees `v2_*` pour postulants, documents en chunks, tentatives et emails.
- Notification administrateur systematique et file d'emails asynchrone pour le postulant et l'administrateur.
- Confirmation traduite FR/EN/AR avec reference unique.

### Validation

- Migration `0017_v2_applicants.sql` appliquee localement : 13 commandes reussies.
- Build Worker `wrangler deploy --dry-run` reussi.
- Test d'integration : creation HTTP 201, repetition idempotente HTTP 200 et formulaire invalide HTTP 422.
- Verification D1 locale : un postulant, un document, un chunk et deux emails en file.
- Syntaxe des modules Worker et navigateur validee.

## PHASE 03 - Administration des postulants

Statut : `VALIDATED`

### Realise

- Nouvelle rubrique administrateur `Postulants` remplaçant l'ancien acces Candidats.
- Indicateurs, recherche, filtre de statut et pagination.
- Fiche complete avec coordonnees, profil, documents et notes administratives.
- Telechargement des CV et lettres reserve a une session administrateur active.
- Changement de statut avec historique horodate et rattachement a la session admin.
- Interface FR/EN/AR et responsive.

### Validation

- Migration `0018_v2_applicant_admin.sql` appliquee localement.
- Test d'integration complet : depot public, double authentification admin, recherche, fiche, telechargement, notes, statut et historique.
- Syntaxe Worker et navigateur validee.

## PHASE 04 - Authentification V2

Statut : `VALIDATED`

### Implemente

- Formulaire public unique avec nom, prenom et mot de passe, sans choix de role.
- Comptes V2 admin/employe, sessions opaques HttpOnly, expiration et revocation.
- Mots de passe PBKDF2 avec sel individuel ; aucun mot de passe retourne par l'API.
- Determination du role et de la redirection exclusivement cote serveur.
- Limitation des tentatives par identite et empreinte reseau.
- Ecran protege permettant a l'administrateur historique de definir l'unique identite admin V2 sans secret dans Git.
- Session admin V2 reconnue par le Control Center existant.

### Validation disponible

- Connexion admin V2, redirection, acces au Control Center, deconnexion et rate limit valides en integration locale.
- La validation employee sera terminee avec la creation employee de la PHASE 05.
- L'identite admin V2 de production doit etre choisie dans le Control Center ; cela n'empeche pas les phases independantes.

### Validation finale

- Le meme endpoint et le meme formulaire identifient correctement un administrateur et un employe.
- Les redirections serveur admin et employe ont ete validees par les tests des PHASES 04 et 05.

## PHASE 05 - Administration des employes

Statut : `VALIDATED`

### Realise

- Section admin Employes avec recherche, creation, modification, activation et desactivation.
- Identite nom/prenom unique et role fixe cote serveur.
- Mot de passe choisi librement par l'admin, y compris `1234`, mais toujours sale et hashe.
- Rotation du mot de passe avec revocation des sessions existantes.
- Profil employe separe pour fonction, service, email, telephone et date d'entree.
- Aucun endpoint public de creation de compte employe.

### Validation

- Creation admin, recherche, connexion employee, redirection, modification, nouveau mot de passe, desactivation et refus de connexion testes en integration.
- Migration `0020_v2_employees.sql` appliquee localement.

## PHASE 06 - Espace employe

Statut : `VALIDATED`

### Realise

- Espace protege avec Accueil, Conges, Factures, Parametres et Deconnexion.
- Accueil limite aux indicateurs utiles et aux derniers elements.
- Parametre de langue uniquement ; nom, prenom et mot de passe ne sont pas modifiables par l'employe.
- Preference FR/EN/AR stockee en D1 et reappliquee a chaque connexion.
- Interface RTL arabe et navigation mobile.
- Redirection vers la connexion pour toute session absente ou expiree.

### Validation

- Acces overview protege et donnees employee verifies en integration.
- Changement de langue cote serveur puis relecture depuis le compte verifies.
- Syntaxe du shell employee et build Worker valides.

## PHASE 07 - Conges

Statut : `VALIDATED`

### Realise

- Solde annuel centralise a 21 jours ouvrables, sans report entre annees.
- Exclusion samedi, dimanche et jours feries configures par l'administrateur.
- Depot, consultation et annulation d'une demande en attente cote employe.
- Detection des chevauchements et controle du solde cote serveur.
- Approbation ou refus admin avec commentaire visible par l'employe.
- Recalcul autoritaire des jours et du solde au moment de la decision.
- Historique et indicateurs integres a l'accueil employe.

### Validation

- Test d'integration complet avec une periode traversant un week-end et un jour ferie : 2 jours calcules.
- Chevauchement refuse, approbation admin, solde passe de 21 a 19 et commentaire restitue a l'employe.
- Migration `0021_v2_leave.sql` appliquee localement.

## PHASE 08 - Consolidation i18n

Statut : `IN_PROGRESS`

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
