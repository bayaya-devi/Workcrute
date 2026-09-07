# Architecture Workcrute V2

## Frontieres fonctionnelles

- `src/v2-applicants.js` : depot public sans compte, documents et notifications.
- `src/v2-admin-applicants.js` : consultation et traitement des postulants.
- `src/v2-auth.js` : identite admin/employe, mots de passe et sessions V2.
- `src/v2-admin-employees.js` : cycle de vie des comptes employes.
- `src/v2-employee.js` : profil, preference de langue et accueil employe.
- `src/v2-leave.js` : demandes, jours feries, calcul de solde et decisions.
- `src/v2-faq.js` : contenu public V2 du centre d'aide et du chatbot.

`src/index.js` reste le routeur de compatibilite et porte encore les anciens services admin. Les nouvelles fonctions metier ne doivent plus y etre ajoutees : chaque nouveau domaine V2 doit vivre dans son propre module et exposer un gestionnaire de routes explicite.

## Donnees et securite

Les migrations D1 sont additives et ordonnees. Les documents ne sont jamais servis directement depuis les assets publics. Les sessions V2 utilisent un jeton aleatoire hache en base et un cookie `HttpOnly`, `Secure`, `SameSite=Lax`.

## Verification

`npm run check` valide la syntaxe de tous les scripts, le branchement des modules V2 et le build Wrangler. Les scripts `test:v2-*` couvrent les parcours d'integration critiques.
