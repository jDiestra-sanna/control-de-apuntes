import test from 'node:test';
import assert from 'node:assert/strict';
import { parseIntegerList } from '../server/system-modules.js';

test('parseIntegerList parses comma-separated numbers correctly and eliminates duplicates and invalid tokens', () => {
  const input = '6902896, 6902897, 6902896, abc, -5, 0, 937146';
  const result = parseIntegerList(input);
  assert.deepEqual(result, [6902896, 6902897, 5, 937146]);
});

test('parseIntegerList handles empty and null inputs safely', () => {
  assert.deepEqual(parseIntegerList(''), []);
  assert.deepEqual(parseIntegerList(null), []);
  assert.deepEqual(parseIntegerList(undefined), []);
  assert.deepEqual(parseIntegerList([]), []);
});

test('parseIntegerList handles arrays of strings and numbers', () => {
  assert.deepEqual(parseIntegerList(['123', 456, '123', -10, 'xyz']), [123, 456]);
});
