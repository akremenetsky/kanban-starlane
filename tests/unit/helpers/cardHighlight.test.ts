import { getCardHighlightColor } from 'src/shared/colors';
import { describe, expect, it } from 'vitest';

const urgent = {
  tagKey: '#urgent',
  color: 'rgba(255, 255, 255, 1)',
  backgroundColor: 'rgba(233, 49, 71, 1)',
  highlight: true,
};
const important = {
  tagKey: '#important',
  color: '',
  backgroundColor: 'rgba(236, 117, 0, 1)',
  highlight: true,
};

describe('getCardHighlightColor', () => {
  it('uses the background color of a highlighting tag on the card', () => {
    expect(getCardHighlightColor(['#urgent'], [urgent])).toBe('rgb(233, 49, 71)');
  });

  it('ignores tag colors without highlight and tags not on the card', () => {
    expect(getCardHighlightColor(['#urgent'], [{ ...urgent, highlight: false }])).toBeNull();
    expect(getCardHighlightColor(['#urgent'], [{ ...urgent, highlight: undefined }])).toBeNull();
    expect(getCardHighlightColor(['#other'], [urgent])).toBeNull();
    expect(getCardHighlightColor([], [urgent])).toBeNull();
    expect(getCardHighlightColor(['#urgent'], undefined)).toBeNull();
  });

  it('matches tags in any case, like Obsidian', () => {
    expect(getCardHighlightColor(['#Urgent'], [urgent])).toBe('rgb(233, 49, 71)');
    expect(getCardHighlightColor(['#urgent'], [{ ...urgent, tagKey: '#URGENT' }])).toBe(
      'rgb(233, 49, 71)'
    );
  });

  it('picks the first matching entry in the tag colors list', () => {
    expect(getCardHighlightColor(['#important', '#urgent'], [urgent, important])).toBe(
      'rgb(233, 49, 71)'
    );
    expect(getCardHighlightColor(['#important', '#urgent'], [important, urgent])).toBe(
      'rgb(236, 117, 0)'
    );
  });

  it('makes a translucent color opaque so the stripe stays visible', () => {
    const faint = { ...urgent, backgroundColor: 'rgba(233, 49, 71, 0.2)' };
    expect(getCardHighlightColor(['#urgent'], [faint])).toBe('rgb(233, 49, 71)');
  });

  it('falls back to the text color, then skips entries without a valid color', () => {
    const textOnly = { ...urgent, backgroundColor: '', color: 'rgba(8, 109, 221, 1)' };
    expect(getCardHighlightColor(['#urgent'], [textOnly])).toBe('rgb(8, 109, 221)');

    const noColor = { ...urgent, backgroundColor: '', color: '' };
    expect(getCardHighlightColor(['#urgent', '#important'], [noColor, important])).toBe(
      'rgb(236, 117, 0)'
    );
  });
});
