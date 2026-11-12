import test from 'node:test';
import assert from 'node:assert/strict';
import { selectScanner } from './lib/catchScanner.js';

const scan = selectScanner();

test('scanner flags: bound-empty', () => {
  const src = 'try{ doWork() }catch(e){}';
  const offenders = scan(src, 'mem');
  assert.ok(offenders.length >= 1, 'expected bound-empty to be flagged');
});

test('scanner flags: bound-comment-only (single-line)', () => {
  const src = 'try{ a() }catch(err){ // just comment\n }';
  const offenders = scan(src, 'mem');
  assert.ok(offenders.length >= 1, 'expected bound-comment-only to be flagged');
});

test('scanner flags: multi-line-empty', () => {
  const src = 'try{ a() }catch(e){\\n    \\n}';
  const offenders = scan(src, 'mem');
  assert.ok(offenders.length >= 1, 'expected multi-line empty to be flagged');
});

test('scanner flags: unbound', () => {
  const src = 'try{ a() }catch{}';
  const offenders = scan(src, 'mem');
  assert.ok(offenders.length >= 1, 'expected unbound catch to be flagged');
});

test('scanner ok: bound with real statement', () => {
  const src = 'try{ a() }catch(e){ console.error(e) }';
  const offenders = scan(src, 'mem');
  assert.equal(offenders.length, 0, 'expected valid bound catch not to be flagged');
});

