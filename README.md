# Referenskortet (The Referral Card)

Single-page tool for BNI members to design referral postcards and export print-ready PDFs.

## Live

- **Primary:** https://referralcard.ai/
- Also: https://myreferralcard.com/ (same app)
- Cloudflare Pages project: `referenskortet`
- Sample sender defaults: Mediahive AB / Kaj Nybom (mediahiveab.com)

## Local

Open `index.html` in a browser (or serve the folder statically). No build step.

## Deploy (Cloudflare Pages)

Push to `main` (GitHub Actions deploys), or direct upload of `index.html` / connect this repo to Pages with:
- Build command: *(none)*
- Output directory: `/` (or `.`)

## For Codex / collaborators

This repo is the shared source of truth. Keep the app as a single `index.html` unless we deliberately split assets.
