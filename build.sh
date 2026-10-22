#!/usr/bin/env bash
# Build a clean deploy folder (dist/) containing ONLY public files.
# Cloudflare Pages uploads every file in the deployed directory (.assetsignore is NOT supported by `wrangler pages deploy`),
# so deploy dist/ instead of the repo root:  npx wrangler pages deploy dist --project-name=referenskortet
set -euo pipefail
cd "$(dirname "$0")"
PUBLIC=(index.html 404.html _headers robots.txt sitemap.xml favicon.svg apple-touch-icon.png icon-192.png icon-512.png og-image.png site.webmanifest fonts vendor)
rm -rf dist && mkdir dist
for f in "${PUBLIC[@]}"; do [ -e "$f" ] || { echo "ERROR: missing public file $f" >&2; exit 1; }; cp -R "$f" dist/; done
# Verify the CSP hash in _headers matches the inline app script (the only executable inline <script> in index.html).
HASH=$(python3 - <<'PY'
import re,hashlib,base64
s=open('index.html',encoding='utf-8').read()
blocks=[m.group(2) for m in re.finditer(r'<script(\s[^>]*)?>(.*?)</script>',s,re.S) if not m.group(1) or ('src=' not in m.group(1) and 'ld+json' not in m.group(1))]
assert len(blocks)==1, f"expected 1 inline executable script, found {len(blocks)}"
print("sha256-"+base64.b64encode(hashlib.sha256(blocks[0].encode('utf-8')).digest()).decode())
PY
)
# Only the script-src directive of the CSP line counts (a hash elsewhere, e.g. in a comment, must not pass).
SCRIPT_SRC=$(grep -E '^[[:space:]]+Content-Security-Policy:' _headers | head -1 | tr ';' '\n' | grep -E '^[[:space:]]*script-src ' || true)
if ! printf '%s' "$SCRIPT_SRC" | grep -qF "'$HASH'"; then echo "ERROR: _headers CSP does not contain '$HASH' (inline script changed). Update script-src." >&2; exit 1; fi
echo "dist/ ready ($(find dist -type f | wc -l) files), CSP hash OK: $HASH"
