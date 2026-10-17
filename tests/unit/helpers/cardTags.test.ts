import { addTag, hasTag, removeTag } from 'src/parsers/cardTags';
import { describe, expect, it } from 'vitest';

describe('card tags', () => {
  it('adds a tag to the end of the first line', () => {
    expect(addTag('Fix sync', '#urgent')).toBe('Fix sync #urgent');
    expect(addTag('Fix sync  ', '#urgent')).toBe('Fix sync #urgent');
    expect(addTag('Fix sync\nmore details', '#urgent')).toBe('Fix sync #urgent\nmore details');
    expect(addTag('', '#urgent')).toBe('#urgent');
  });

  it('removes the tag in any case, with one surrounding space', () => {
    expect(removeTag('Fix sync #urgent', '#urgent')).toBe('Fix sync');
    expect(removeTag('Fix #Urgent sync', '#urgent')).toBe('Fix sync');
    expect(removeTag('#urgent Fix sync', '#urgent')).toBe('Fix sync');
    expect(removeTag('Fix sync\n#urgent details', '#urgent')).toBe('Fix sync\ndetails');
    expect(removeTag('A #urgent and #urgent again', '#urgent')).toBe('A and again');
  });

  it('keeps other tags, nested tags and code', () => {
    expect(removeTag('Fix #urgent/later #urgently', '#urgent')).toBe('Fix #urgent/later #urgently');
    expect(removeTag('Run `#urgent` now', '#urgent')).toBe('Run `#urgent` now');
    expect(removeTag('Fix #work #urgent #home', '#urgent')).toBe('Fix #work #home');
  });

  it('leaves wikilinks and comments alone', () => {
    expect(removeTag('See [[Note|a #urgent]] #urgent', '#urgent')).toBe('See [[Note|a #urgent]]');
    expect(removeTag('Fix %% #urgent %% #urgent', '#urgent')).toBe('Fix %% #urgent %%');
  });

  it('drops a line that held only the tag', () => {
    expect(removeTag('Fix sync\n#urgent\nmore', '#urgent')).toBe('Fix sync\nmore');
    expect(removeTag('Fix sync\n#urgent', '#urgent')).toBe('Fix sync');
    expect(removeTag('#urgent\nFix sync', '#urgent')).toBe('Fix sync');
  });

  it('puts the tag after a code block instead of on its fence', () => {
    expect(addTag('```js\ncode\n```', '#urgent')).toBe('```js\ncode\n```\n#urgent');
  });

  it('checks parsed tags in any case', () => {
    expect(hasTag(['#Urgent'], '#urgent')).toBe(true);
    expect(hasTag(['#urgently'], '#urgent')).toBe(false);
    expect(hasTag(undefined, '#urgent')).toBe(false);
  });
});
