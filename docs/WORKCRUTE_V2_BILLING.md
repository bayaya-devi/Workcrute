# Facturation mensuelle Workcrute

## Fonctionnement

- Employe : `/employe/parametres/` pour les coordonnees autoentrepreneur persistantes ; `/employe/factures/` pour les brouillons, soumissions, PDF et historiques.
- Administrateur : `/admin/factures/` pour les decisions, paiements, suivi mensuel et historique des envois e-mail.
- Quatre montants en DH : prestation autoentrepreneur, frais, prime et autre. Le libelle du montant autre est obligatoire.
- Le fixe interne de 3 500 DH reste une donnee privee et immuable. Il n'est ni affiche dans le PDF ni ajoute automatiquement au total.
- Une seule facture active par employe et par mois. Les brouillons sont modifiables et supprimables ; les autres documents restent historiques.
- La soumission fige les coordonnees emetteur/client et le PDF provisoire. Les changements ulterieurs dans les parametres s'appliquent aux prochaines soumissions.
- Le refus exige un motif. L'employe cree une nouvelle version liee au document refuse, sans effacer celui-ci.
- La validation administrative attribue un numero sequentiel unique et produit le PDF definitif. Le paiement conserve date et reference.
- Les modifications sont tracees ; les acces API/PDF sont controles cote serveur. Les editions concurrentes et doubles soumissions ne produisent pas de doublons.
- Les anciens documents et demandes restent accessibles dans les archives.
- Interfaces FR, EN et AR, avec direction RTL.

## Rappels et livraison

Le serveur utilise le fuseau `Africa/Casablanca`. Pour septembre : rappel le 24, puis les 27, 28, 29 et 30 ; ensuite chaque jour a partir du 1er octobre tant que la facture attendue n'est pas soumise. Une facture refusee redevient a corriger. Chaque rappel est deduplique par employe, mois et jour.

La date d'activation est conservee dans `reminders_start_period` : aucun rappel retrospectif n'est cree pour les mois anterieurs au lancement de cette fonctionnalite.

Notifications internes et file e-mail persistantes. Les messages sont localises et les PDF sont joints aux envois de soumission/validation. Les echecs restent visibles ; reprise exponentielle jusqu'a huit essais, puis relance manuelle possible dans l'administration. Les rappels devenus inutiles sont neutralises avant l'envoi.

Les liens e-mail utilisent le Worker publie, ou `BILLING_APP_ORIGIN` si une autre origine fonctionnelle est configuree.

## Configuration indispensable avant publication

1. Configurer un expediteur verifie `EMAIL_FROM` et le secret `EMAIL_PROVIDER_API_KEY` pour Resend, ou un binding `EMAIL` compatible avec `send({from,to,subject,text,attachments})`.
2. Renseigner l'adresse reelle du client et l'e-mail administrateur dans les parametres de facturation. La mention fiscale reste optionnelle : aucune mention juridique ni donnee personnelle du modele d'exemple n'a ete inventee.
3. Chaque employe complete ses coordonnees avant sa premiere soumission.
4. Tester une livraison reelle autorisee avant de declarer les e-mails operationnels.
5. Appliquer la migration additive `0027_v2_monthly_billing.sql`, puis deployer le Worker et son frontend ensemble. Aucune suppression de donnees historiques n'est necessaire.

Au controle du 15 septembre 2026, le Worker en production ne dispose ni de `EMAIL`, ni de `EMAIL_FROM`, ni de `EMAIL_PROVIDER_API_KEY`. La publication de cette fonctionnalite reste donc suspendue pour respecter la demande de validation avant publication.

## Verification reproductible

`npm run check`

`npm run test:v2-billing`

Pour les controles navigateur : definir `WORKCRUTE_BILLING_BROWSER=1`, puis executer `npm run test:v2-billing`.

Les essais utilisent une base temporaire et des comptes isoles. Aucun document ni message de test n'est cree chez le client. Les controles navigateur couvrent 320, 375, 390, 430, 768, 1024, 1440 et 1920 px, les trois langues, les dialogues et les formulaires employe/administrateur.

Le PDF de verification et les captures sont generes dans `output/billing-qa/` et ne sont pas publies.

## Etat de validation au 15 septembre 2026

- Build Worker et controle syntaxique : PASS.
- Integration API sur base isolee : PASS (dont origine etrangere rejetee et archives preservees).
- Navigateur : PASS sur 48 combinaisons espace/langue/largeur ; creation, soumission, validation, paiement et fermeture des dialogues verifies.
- Calendrier, deduplication, reprise apres refus, retard et reprise fournisseur : PASS.
- PDF : fichier reel genere et rendu inspecte visuellement ; contenu historique immutable verifie.
- Livraison externe vers une boite reelle : NON VALIDEE, configuration absente.
- Migration distante, push et publication : NON EFFECTUES.
