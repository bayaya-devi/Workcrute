# Changelog Workcrute

## Refonte publique — lot 1

- Ajout du design system Workcrute centralisé : couleurs, typographies, espacements, boutons, champs, cartes, badges, alertes, toasts, skeletons, états vides/erreur, drawers et composants responsive.
- Ajout du layout public et du layout d’authentification partagés.
- Ajout d’une couche i18n FR/EN/AR avec véritable RTL arabe.
- Refonte de l’accueil, des offres, du détail d’offre, des pages candidats/recruteurs, du centre d’aide, de la connexion, du mot de passe oublié et des inscriptions.
- Ajout d’un assistant public multilingue avec 100 entrées, catégories, mots-clés, normalisation, score de correspondance et suggestions sans réponse inventée.
- Ajout des statistiques publiques réelles et d’états sûrs lorsque les données ne sont pas disponibles.
- Correction du routage Cloudflare pour exécuter le Worker avant les assets sur `/api/*`.
- Ajout d’une configuration pnpm explicite autorisant uniquement les builds nécessaires à Wrangler (`esbuild`, `workerd`).
- Validation locale des migrations D1, des routes publiques, du FR/EN/AR, du RTL et de l’absence de débordement horizontal.
