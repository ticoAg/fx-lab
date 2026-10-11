import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ensureNestedSvgViewports } from './ensureNestedSvgViewports.ts'

test('adds width/height from viewBox on nested sheet tiles only', () => {
  const input = `<svg viewBox="0 0 576 348"><g><svg viewBox="0 0 80 80" style=";width:80px;height:80px"><circle/></svg></g></svg>`
  const out = ensureNestedSvgViewports(input)
  assert.match(out, /^<svg viewBox="0 0 576 348">/)
  assert.match(out, /<svg viewBox="0 0 80 80" style=";width:80px;height:80px" width="80" height="80">/)
})

test('leaves nested tiles that already declare width alone', () => {
  const input = `<svg viewBox="0 0 10 10"><svg viewBox="0 0 80 80" width="80" height="80"/></svg>`
  assert.equal(ensureNestedSvgViewports(input), input)
})
