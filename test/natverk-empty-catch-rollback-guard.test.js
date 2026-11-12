import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Stricter guard: parse catch blocks (multi-line), fail on unbound catch,
// and on bodies with no real statements (empty or comment-only).
test('guard: no empty or unbound catch blocks in target files', () => {
  const files = [
    path.join(process.cwd(), 'natverk/js/exportImport.js'),
    path.join(process.cwd(), 'natverk/js/storageOps.js')
  ];
  const offenders = [];
  function scanSource(src, fileLabel){
    // simple state machine to find catch blocks and their bodies
    let i = 0;
    const len = src.length;
    const isIdent = c => /[A-Za-z0-9_\$]/.test(c);
    while (i < len) {
      if (src.startsWith('catch', i) && (i === 0 || !isIdent(src[i-1])) ) {
        let j = i + 5;
        while (j < len && /\s/.test(src[j])) j++;
        let hasParam = false;
        if (src[j] === '(') {
          hasParam = true;
          // skip param parens
          let depth = 1; j++;
          while (j < len && depth > 0) {
            if (src[j] === '(') depth++;
            else if (src[j] === ')') depth--;
            else if (src[j] === '"' || src[j] === "'" || src[j] === '`') {
              const q = src[j++]; while (j < len && src[j] !== q) { if (src[j] === '\\') j++; j++; }
            }
            else j++;
          }
          while (j < len && /\s/.test(src[j])) j++;
        }
        if (src[j] === '{') {
          // capture block body
          let startBody = j+1;
          let depth = 1; j++;
          let inStr = null, inLine=false, inBlock=false;
          while (j < len && depth > 0) {
            const ch = src[j], nx = src[j+1];
            if (!inStr && !inBlock && !inLine && ch === '/' && nx === '/') { inLine = true; j+=2; continue; }
            if (!inStr && !inBlock && !inLine && ch === '/' && nx === '*') { inBlock = true; j+=2; continue; }
            if (inLine && ch === '\n') { inLine = false; j++; continue; }
            if (inBlock && ch === '*' && nx === '/') { inBlock = false; j+=2; continue; }
            if (!inBlock && !inLine) {
              if (!inStr && (ch === '"' || ch === "'" || ch === '`')) { inStr = ch; j++; continue; }
              if (inStr && ch === inStr) { inStr = null; j++; continue; }
              if (!inStr) {
                if (ch === '{') depth++;
                else if (ch === '}') depth--;
              }
            }
            j++;
          }
          const body = src.slice(startBody, j-1);
          // strip comments
          const noComments = body.replace(/\/\/[^\n]*\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '').trim();
          const onlyWhitespace = noComments.replace(/\s+/g, '') === '';
          if (!hasParam || onlyWhitespace) {
            const before = src.slice(0, i);
            const line = before.split('\n').length;
            offenders.push(`${fileLabel}:${line}`);
          }
          i = j;
          continue;
        }
      }
      i++;
    }
  }
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf-8');
    scanSource(src, path.basename(f));
  }
  assert.equal(offenders.length, 0, `Bad catch blocks found at: ${offenders.join(', ')}`);
});

