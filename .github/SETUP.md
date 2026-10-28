# Variuno Tools deployment setup

This static website deploys to the existing Cloudflare Worker named `exam-resizer`.

## Automatic deployment

`wrangler.jsonc` is ready for Cloudflare Workers Builds. To activate automatic deployments:

1. Put this project in a GitHub repository and push its production branch (recommended: `main`).
2. In Cloudflare, open the existing `exam-resizer` Worker, go to **Settings → Builds**, and connect that repository.
3. Select the production branch. Leave the build command empty; use `npx wrangler deploy` as the deploy command.

After that, pushes to the selected branch deploy automatically. Cloudflare manages the Git connection; no API token needs to be stored in this project or sent in chat. The Worker name in `wrangler.jsonc` matches the existing production Worker.

`wrangler.jsonc` is excluded from the website assets by `.assetsignore`.
