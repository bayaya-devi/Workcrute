# Workcrute V2 - corrections full stack

Date: 2026-09-13

## A - Baseline

- Main synchronise: HEAD et origin/main identiques avant les modifications.
- Journal V2, Worker, API, D1, authentification et bundles publics actifs relus.
- Nettoyage GitHub Pages precedent conserve; package-lock.json preexistant non modifie.
- Soumission Cloudflare reelle: WC-202609-1J9HPR, statut received et un document confirmes dans D1 distant.

## B et C - Page publique et navigation

- Accueil, Fonctionnement, A propos et Conditions relies par ancres.
- Aide neutralisee vers la page 404 V2; routes FAQ/Aide neutralisees sur Cloudflare.
- Aucune entree Aide/FAQ dans le header/footer. Base interne du chatbot preservee.
- Postuler et Connexion visibles cote a cote, y compris sur mobile.
- Recette distante: fermeture du menu apres clic sur section corrigee; ancres locales sur l'accueil sans rechargement.

## D et E - Candidature

- Commandes: Precedent, Annuler, Continuer; Envoi exclusivement a la derniere etape.
- Annulation confirmee si saisie; aucun POST final lors de l'abandon.
- Commandes verrouillees pendant l'envoi; erreurs sans reset des champs.
- Cause demontree sur GitHub Pages: fetch relatif /api/v2/applicants vers github.io renvoie 404.
- API explicite vers Cloudflare pour cette candidature publique; CORS limite a l'origine GitHub du projet et a cette route.
- Connexion GitHub bascule sur Cloudflare pour ne pas repartir les cookies de session entre deux domaines.
- Test local: candidature, liste admin, dossier, telechargement protege, statut et historique.

## F, G et H - Connexion, langues et responsive

- Texte: contacter l'administration pour obtenir les identifiants, traduit FR/EN/AR.
- Derniere instruction utilisateur: conserver le vocabulaire visible Employe, Employee et employe en arabe.
- Fleches inversees en RTL, erreurs et revue du dossier retraduites au changement de langue.
- Tests navigateur: 320, 375, 390, 430, 768, 1024, 1440 et 1920 px, trois routes et trois langues.
- Defaut du test historique corrige: selection d'une vraie cible page CDP et attente du chargement; une page d'extension vide n'est plus acceptee comme preuve responsive.
- Trois candidatures completes avec CV soumises depuis le navigateur en FR/EN/AR sur D1 local.

## I, J, K et L - Personas

- Visiteur: navigation et trilingue couverts par controles statiques et navigateur.
- Postulant: email invalide, champ absent, retour arriere, maintien des valeurs, CV et soumission couverts.
- Employe: connexion, langue persistante, conges, modification admin et desactivation couverts en integration locale.
- Isolation: interdiction API admin, creation de compte, changement d'identite et lecture d'un autre compte par parametre verifies.
- Administrateur: connexion commune, role serveur, postulants et documents verifies en integration locale.

## Limites de recette distante

- Recette globale locale et build Worker: PASS; verification navigateur des exceptions console: PASS.
- Confirmation de candidature basee sur la reference effectivement enregistree; pas de promesse de livraison e-mail tant que le fournisseur manque.

- Les mots de passe des comptes administrateur et employe de production ne sont pas disponibles; ne pas les remplacer ni creer des sessions par contournement SQL.
- La recette authentifiee distante n'est pas annoncee PASS; reception et stockage du dossier distants controles directement dans D1.
- Les secrets du fournisseur e-mail signales dans le journal V2 restent necessaires pour garantir un e-mail effectivement livre.
- Les donnees de test distantes sont identifiees comme validation; aucune donnee client n'a ete supprimee.
