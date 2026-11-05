# Bermuda insurer peers

Static site comparing the asset portfolios of Bermuda life and long-term insurers,
from their year-end 2025 BMA Asset and Liability Statements. It is the public copy of
the summary page built in `../bma-peer-compare` (no position-level data).

- `site/` is the whole site: `index.html`, `style.css`, `app.js`, d3 in `vendor/`
  (served locally because the CSP allows only this site), and the data in `data/`.
- Deployed by Cloudflare Workers Builds on every push to `main` (`wrangler.jsonc`).
- `site/_headers` sets a strict CSP (no inline styles or scripts) and `noindex`.

## Updating the data

1. In `bma-peer-compare`, run `pipeline/export_share.py`.
2. Here, run `sh update-data.sh`.
3. Commit and push.

## Local preview

    python -m http.server 8770 --directory site
