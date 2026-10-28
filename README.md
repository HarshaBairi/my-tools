# Variuno Tools

Variuno Tools is a browser-based collection of image, PDF, document, media, and everyday utilities.

## Deployment

The production site is served by the Cloudflare Worker `exam-resizer`. Cloudflare Workers Builds is connected to the `main` branch and deploys with `npx wrangler deploy` using the root `wrangler.jsonc` configuration.

## Project layout

- `index.html` is the home page.
- Other root HTML files are tool and information pages.
- `assets/` contains the site styles, scripts, and images.
- `vendor/` contains bundled third-party libraries and their license notices.

