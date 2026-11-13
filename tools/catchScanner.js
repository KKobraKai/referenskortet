// Scanner for detecting problematic catch blocks:
// - unbound catch (no parameter)
// - empty body (whitespace only)
// - comment-only body (single- or multi-line comments only)
//
// Note: Keep the parsing logic lightweight and self-contained; no AST dependency.

function scanSource(src, fileLabel) {
  const offenders = [];
  let i = 0;
  const len = src.length;
  const isIdent = c => /[A-Za-z0-9_\$]/.test(c);
  function skipSpaceAndComments(k) {
    while (k < len) {
      // whitespace
      if (/\s/.test(src[k])) { k++; continue; }
      // line comment //
      if (src[k] === '/' && src[k+1] === '/') {
        k += 2;
        while (k < len && src[k] !== '\n') k++;
        continue;
      }
      // block comment /* ... */
      if (src[k] === '/' && src[k+1] === '*') {
        k += 2;
        while (k < len && !(src[k] === '*' && src[k+1] === '/')) k++;
        if (k < len) k += 2;
        continue;
      }
      break;
    }
    return k;
  }
  while (i < len) {
    if (src.startsWith('catch', i) && (i === 0 || !isIdent(src[i - 1]))) {
      let j = i + 5;
      j = skipSpaceAndComments(j);
      let hasParam = false;
      if (src[j] === '(') {
        hasParam = true;
        // Skip param parens and ADVANCE on ')'
        let depth = 1;
        j++;
        while (j < len && depth > 0) {
          if (src[j] === '(') depth++;
          else if (src[j] === ')') { depth--; j++; continue; }
          else if (src[j] === '"' || src[j] === "'" || src[j] === '`') {
            const q = src[j++]; // advance into quote
            while (j < len && src[j] !== q) {
              if (src[j] === '\\') j++;
              j++;
            }
          }
          else j++;
        }
        j = skipSpaceAndComments(j);
      }
      if (src[j] === '{') {
        // capture block body
        let startBody = j + 1;
        let depth = 1;
        j++;
        let inStr = null,
          inLine = false,
          inBlock = false;
        while (j < len && depth > 0) {
          const ch = src[j],
            nx = src[j + 1];
          if (!inStr && !inBlock && !inLine && ch === '/' && nx === '/') {
            inLine = true;
            j += 2;
            continue;
          }
          if (!inStr && !inBlock && !inLine && ch === '/' && nx === '*') {
            inBlock = true;
            j += 2;
            continue;
          }
          if (inLine && ch === '\n') {
            inLine = false;
            j++;
            continue;
          }
          if (inBlock && ch === '*' && nx === '/') {
            inBlock = false;
            j += 2;
            continue;
          }
          if (!inBlock && !inLine) {
            if (!inStr && (ch === '"' || ch === "'" || ch === '`')) {
              inStr = ch;
              j++;
              continue;
            }
            if (inStr && ch === inStr) {
              inStr = null;
              j++;
              continue;
            }
            if (!inStr) {
              if (ch === '{') depth++;
              else if (ch === '}') depth--;
            }
          }
          j++;
        }
        const body = src.slice(startBody, j - 1);
        // strip comments
        const noLine = body.replace(/\/\/[^\n]*\n/g, '\n');
        const noComments = noLine.replace(/\/\*[\s\S]*?\*\//g, '').trim();
        const onlyWhitespace = noComments.replace(/\s+/g, '') === '';
        if (!hasParam || onlyWhitespace) {
          const before = src.slice(0, i);
          const line = before.split('\n').length;
          offenders.push(`${fileLabel}:${line}`);
        }
        i = startBody; // continue scanning inside body to catch nested catches
        continue;
      }
    }
    i++;
  }
  return offenders;
}

export { scanSource };

