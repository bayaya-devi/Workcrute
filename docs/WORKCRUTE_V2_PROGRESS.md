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

Statut : `VALIDATED`

### Realise

- Detection initiale de la langue du navigateur sur les pages publiques, avec persistance locale du choix.
- Catalogues FR, EN et AR verifies pour le public, le Control Center et l'espace employe.
- Traduction des contenus dynamiques Employes, Conges et Identite administrateur.
- Changement de langue immediat sans perdre les donnees d'un formulaire ouvert.
- Direction RTL appliquee aux espaces admin et employe en arabe.

### Validation

- Test statique `test:v2-i18n` couvrant les trois catalogues, les evenements de changement et le RTL.
- Syntaxe JavaScript et build Wrangler verifies.

## PHASE 09 - Facturation

Statut : `BLOCKED`

Le modele de facture reel, indispensable pour reproduire fidelement sa structure et ses calculs, n'a pas ete fourni. L'espace employe conserve donc un etat vide honnete sans fausse facture. Les phases independantes continuent.

## PHASE 10 - Retrait de l'ancien modele

Statut : `VALIDATED`

### Realise

- Anciennes routes publiques redirigees vers l'accueil ou la connexion sur Cloudflare Pages et GitHub Pages.
- Ancienne creation de compte fermee cote serveur avec un statut HTTP 410 explicite.
- Navigation du Control Center limitee aux postulants, employes, conges et fonctions systeme utiles.
- FAQ et chatbot publics remplaces par un corpus V2 FR/EN/AR coherent avec le depot de CV sans compte et l'espace employe.
- Donnees historiques conservees en base ; aucun effacement destructif n'a ete effectue.

### Validation

- Integration locale de la FAQ, du chatbot et de la fermeture de l'inscription historique.
- Verification de syntaxe des scripts publics, admin et Worker.

## PHASE 11 - Refactorisation

Statut : `VALIDATED`

### Realise

- Domaines V2 maintenus dans sept modules backend separes plutot que dans le routeur historique.
- Architecture et regles d'extension documentees dans `docs/WORKCRUTE_V2_ARCHITECTURE.md`.
- Commande obsolete `wrangler check` remplacee par un controle de syntaxe, de branchement des modules et de build Worker.
- Test du depot candidat rendu autonome : il demarre et arrete son propre serveur local.

### Validation

- `npm run check` valide 89 fichiers JavaScript et le bundle Wrangler.
- Tous les tests V2 d'integration ont ete executes ; la dependance implicite du premier test a ete corrigee puis revalidee.

## PHASE 12 - Responsive

Statut : `VALIDATED`

### Realise

- Correction de la grille du footer V2 qui reprenait quatre colonnes apres les anciennes regles mobiles.
- Controle navigateur des pages Accueil, Connexion, Postuler et Aide.
- Detection element par element des contenus sortant du viewport, en plus du controle de largeur globale.
- Les tableaux admin conservent un defilement local et les navigations admin/employe basculent en mode mobile.

### Validation

- Chrome headless pilote par DevTools aux largeurs 320, 375, 390, 430, 768, 1024, 1440 et 1920 px.
- Aucun overflow de page ni element visible hors viewport sur les quatre routes publiques testees.
- La capture CLI mobile de Chrome impose une largeur interne minimale et n'a pas ete retenue comme preuve ; les mesures CDP emulees font foi.

## PHASE 13 - Performance et accessibilite

Statut : `VALIDATED`

### Realise

- Suppression des bundles historiques `client.js` et `local-api.js` des quatre pages publiques V2 actives.
- Bootstrap V2 leger pour la configuration publique et les appels API.
- JavaScript initial non compresse de l'accueil ramene a environ 80 Ko.
- Cache navigateur explicite pour CSS et JavaScript, cache long pour les assets nommes.
- Focus clavier visible, zones d'erreur focalisables, libelle des avantages traduit et prise en charge de `prefers-reduced-motion`.
- Typographie stabilisee sans taille liee a la largeur du viewport et rayons de cartes limites a 8 px.

### Validation

- Test statique performance/accessibilite sur Accueil, Connexion, Postuler et Aide.
- Revalidation i18n, responsive navigateur et build Worker.
- Le serveur Chrome DevTools MCP optionnel n'etait pas configure ; les controles ont ete executes directement via Chrome DevTools Protocol et analyse des assets.

## PHASE 14 - Revue de securite

Statut : `VALIDATED`

### Realise

- Taille du multipart controlee avant parsing et type `multipart/form-data` impose.
- Signature binaire des PDF, DOC et DOCX verifiee en plus du nom et du MIME.
- Reponses de questionnaire limitees en taille et a un objet JSON.
- Mot de passe administrateur porte a 12 caracteres minimum ; le mot de passe employe reste volontairement libre mais hashe.
- Nom employe echappe avant insertion dans le tableau de bord.
- CSP, isolation de fenetre et politique de ressources ajoutees aux en-tetes Pages.

### Validation

- Test d'integration d'un faux PDF : rejet HTTP 422 confirme.
- Cookies `HttpOnly`, `Secure`, `SameSite=Lax`, PBKDF2 et absence de secrets codes en dur controles statiquement.
- `npm audit --omit=dev` : aucune vulnerabilite de dependance detectee.

## PHASE 15 - Recette finale

Statut : `BLOCKED`

### Realise

- Recette integree unique `npm run test:v2-all` couvrant le depot de CV, le traitement admin, l'authentification commune, les employes, les conges, le trilingue, le retrait de l'ancien modele, le responsive, la qualite et la securite.
- Tableau de bord administrateur migre vers les donnees V2 reelles : postulants, nouveaux dossiers, employes actifs et conges en attente.
- Pages A propos, legales et erreurs 403/404/500 alignees sur le shell public V2, les trois langues et le RTL.
- Nettoyage des derniers bundles historiques sur toutes les pages publiques actives et liees depuis le footer.
- Stabilisation des tests D1 locaux et du controle Chrome multi-largeurs sous Windows.
- Commit fonctionnel final : `25b0736`.

### Validation reussie

- `npm run test:v2-all` : succes complet.
- `npm run check` : 94 fichiers JavaScript valides, modules V2 branches et build Worker valide.
- Chrome DevTools Protocol : aucun debordement sur Accueil, Connexion, Postuler et Aide en 320, 375, 390, 430, 768, 1024, 1440 et 1920 px.
- FR, EN, AR et RTL controles statiquement sur le public, le Control Center et l'espace employe.
- `npm audit --omit=dev` : aucune vulnerabilite connue.
- Depot GitHub confirme `PUBLIC` : `https://github.com/bayaya-devi/Workcrute`.

### Blocages externes avant validation production

- Le modele de facture reel n'a pas ete fourni ; l'espace employe conserve un etat vide honnete.
- Les secrets du fournisseur e-mail (`EMAIL_PROVIDER_API_KEY` et `EMAIL_FROM`, ou binding equivalent) sont absents de la production Cloudflare. La file d'attente et les nouvelles tentatives sont implementees, mais l'envoi reel exige ces deux valeurs ou un binding Email configure.
- L'identite legale complete de l'exploitant et son contact officiel doivent etre fournis avant ouverture commerciale.
- L'identite administrateur V2 definitive doit etre choisie par l'exploitant depuis la page protegee, sans inscrire de mot de passe dans le depot.

### Production

- Worker deploye : version `2751fdce-9239-4fab-8733-a86688a58d44` sur `https://workcrute.aetbconseil.workers.dev`.
- Pages deploye : `https://4a658579.workcrute.pages.dev`, alias principal `https://workcrute.pages.dev`.
- Accueil, Connexion, Postuler, Aide, FAQ API et Worker verifies en HTTP 200.
- Contenu V2, tableau de bord admin V2, CSP et redirection des anciennes routes verifies en production.

Ces points restants exigent des donnees exterieures et ne peuvent pas etre inventes. Toute l'implementation et toute la recette raisonnablement executables sont terminees et deployees.
