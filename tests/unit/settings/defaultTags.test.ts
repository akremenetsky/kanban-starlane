import { applyDefaultTags } from 'src/settings/defaults';
import { describe, expect, it } from 'vitest';

const summary = (tagColors: Array<{ tagKey: string; highlight?: boolean }> = []) =>
  tagColors.map((c) => `${c.tagKey}:${c.highlight ?? false}`);

describe('applyDefaultTags', () => {
  it('adds the highlighting #urgent and #important tags', () => {
    const settings = applyDefaultTags({});

    expect(summary(settings?.['tag-colors'])).toEqual(['#urgent:true', '#important:true']);
    expect(settings?.['defaults-version']).toBe(1);
  });

  it('keeps existing tag colors and switches the highlight on for a tag already there', () => {
    const own = { tagKey: '#Urgent', color: 'own', backgroundColor: 'own-bg' };
    const work = { tagKey: '#work', color: '', backgroundColor: 'blue' };
    const settings = applyDefaultTags({ 'move-tags': true, 'tag-colors': [work, own] });

    expect(settings?.['move-tags']).toBe(true);
    expect(summary(settings?.['tag-colors'])).toEqual([
      '#work:false',
      '#Urgent:true',
      '#important:true',
    ]);
    expect(settings?.['tag-colors']?.[1]).toMatchObject({
      color: 'own',
      backgroundColor: 'own-bg',
    });
    expect(own).not.toHaveProperty('highlight');
  });

  it('runs once, so deleted tags do not come back', () => {
    expect(applyDefaultTags({ 'defaults-version': 1, 'tag-colors': [] })).toBeNull();
  });
});
