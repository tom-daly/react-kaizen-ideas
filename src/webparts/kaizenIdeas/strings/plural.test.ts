import { countText, inWords, plural } from './plural';
import { IDEAS, VOTES } from './common';

describe('counting words', () => {
  it('uses the one form for exactly 1 and the other form for anything else', () => {
    expect(countText(1, IDEAS)).toBe('1 idea');
    expect(countText(3, IDEAS)).toBe('3 ideas');
    expect(countText(0, VOTES)).toBe('0 votes');
    expect(plural(1, { one: 'box', other: 'boxes' })).toBe('box');
    expect(plural(2, { one: 'box', other: 'boxes' })).toBe('boxes');
  });
});

describe('inWords', () => {
  it('joins things the way a person would say them', () => {
    expect(inWords([])).toBe('');
    expect(inWords(['a'])).toBe('a');
    expect(inWords(['a', 'b'])).toBe('a and b');
    expect(inWords(['a', 'b', 'c'])).toBe('a, b and c');
  });
});
