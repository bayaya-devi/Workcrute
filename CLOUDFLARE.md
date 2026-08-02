# Cloudflare setup for Workcrute

This repository is ready for Cloudflare Pages as a static site.

## Recommended Pages settings

- Project name: `workcrute`
- Production branch: `main`
- Framework preset: `None`
- Build command: leave empty
- Build output directory: `/`

## GitHub Actions deployment

The workflow in `.github/workflows/cloudflare-pages.yml` can deploy automatically after these GitHub repository secrets are added:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The API token needs Cloudflare Pages edit permissions for the target account.

## Included Cloudflare files

- `_headers`: security headers and static asset cache rules.
- `_redirects`: fallback routing so direct links return `index.html`.
- `wrangler.toml`: local Wrangler/Pages project configuration.
