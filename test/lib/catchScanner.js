// Scanner for detecting problematic catch blocks:
// - unbound catch (no parameter)
// - empty body (whitespace only)
// - comment-only body (single- or multi-line comments only)
//
// Exports:
// - scanSourceFixed(src, fileLabel): current fixed implementation
// - scanSourceBuggy(src, fileLabel): reproduces the ddd7980b behavior (for fail-first runs)
// - selectScanner(): chooses fixed or buggy based on env
//
// Note: Keep the parsing logic lightweight and self-contained; no AST dependency.

function scanSourceBuggy(src, fileLabel) {
  const offenders = [];
  let i = 0;
  const len = src.length;
  const isIdent = c => /[A-Za-z0-9_\$]/.test(c);
  while (i < len) {
    if (src.startsWith('catch', i) && (i === 0 || !isIdent(src[i - 1]))) {
      let j = i + 5;
      while (j < len && /\s/.test(src[j])) j++;
      let hasParam = false;
      if (src[j] === '(') {
        hasParam = true;
        // BUGGY: skip param parens but do NOT advance on ')'
        let depth = 1;
        j++;
        while (j < len && depth > 0) {
          if (src[j] === '(') depth++;
          else if (src[j] === ')') depth--; // BUG: no j++ here
          else if (src[j] === '"' || src[j] === "'" || src[j] === '`') {
            const q = src[j++];
            while (j < len && src[j] !== q) {
              if (src[j] === '\\') j++;
              j++;
            }
          } else {
            // any other char
          }
          j++;
        }
        while (j < len && /\s/.test(src[j])) j++;
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
        i = j;
        continue;
      }
    }
    i++;
  }
  return offenders;
}

function scanSourceFixed(src, fileLabel) {
  const offenders = [];
  let i = 0;
  const len = src.length;
  const isIdent = c => /[A-Za-z0-9_\$]/.test(c);
  while (i < len) {
    if (src.startsWith('catch', i) && (i === 0 || !isIdent(src[i - 1]))) {
      let j = i + 5;
      while (j < len && /\s/.test(src[j])) j++;
      let hasParam = false;
      if (src[j] === '(') {
        hasParam = true;
        // FIXED: skip param parens and ADVANCE on ')'
        let depth = 1;
        j++;
        while (j < len && depth > 0) {
          if (src[j] === '(') {
            depth++;
          } else if (src[j] === ')') {
            depth--;
            j++;
            continue;
          } else if (src[j] === '"' || src[j] === "'" || src[j] === '`') {
            const q = src[j++];
            while (j < len && src[j] !== q) {
              if (src[j] === '\\') j++;
              j++;
            }
          } else {
            // any other char
          }
          j++;
        }
        while (j < len && /\s/.test(src[j])) j++;
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
        i = j;
        continue;
      }
    }
    i++;
  }
  return offenders;
}

function selectScanner() {
  const useBuggy =
    process.env.SCANNER_USE_BUGGY === '1' ||
    (process.env.SCANNER_IMPL_SHA || '').startsWith('ddd7980');
  return useBuggy ? scanSourceBuggy : scanSourceFixed;
}

export { scanSourceFixed, scanSourceBuggy, selectScanner };

