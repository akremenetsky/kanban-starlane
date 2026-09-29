import { linkCardTitleToNote, noteNameFromCardTitle } from 'src/state/noteFromCard';
import { describe, expect, it } from 'vitest';

const triggers = { dateTrigger: '@', timeTrigger: '@@' };

describe('new note from card', () => {
  it('names the note after the card text only, without date, time or tags', () => {
    expect(noteNameFromCardTitle('Prepare the demo @{2026-10-15} #sales', triggers)).toBe(
      'Prepare the demo'
    );
    expect(noteNameFromCardTitle('Call @{2026-09-30} @@{14:30} the supplier', triggers)).toBe(
      'Call the supplier'
    );
    expect(noteNameFromCardTitle('Review @[[2026-09-30]] budget', triggers)).toBe('Review budget');
  });

  it('keeps link text and strips characters illegal in file names', () => {
    expect(noteNameFromCardTitle('Fix [[Mobile app]] login: v2/3?', triggers)).toBe(
      'Fix Mobile app login v2 3'
    );
    expect(noteNameFromCardTitle('See ![[mockup.png]] and [docs](http://x.y)', triggers)).toBe(
      'See mockup and docs'
    );
  });

  it('honours custom triggers', () => {
    expect(
      noteNameFromCardTitle('Plan @{2026-01-01} trip', {
        dateTrigger: '$',
        timeTrigger: '$$',
      })
    ).toBe('Plan @{2026-01-01} trip');
    expect(
      noteNameFromCardTitle('Plan $${10:00} trip ${2026-01-01}', {
        dateTrigger: '$',
        timeTrigger: '$$',
      })
    ).toBe('Plan trip');
  });

  it('replaces only the text with the link, keeping date, time and tags on the card', () => {
    expect(
      linkCardTitleToNote('Prepare the demo @{2026-10-15} #sales', '[[Prepare the demo]]', triggers)
    ).toBe('[[Prepare the demo]] @{2026-10-15} #sales');
    expect(
      linkCardTitleToNote(
        'Call @{2026-09-30} @@{14:30} the supplier',
        '[[Call the supplier]]',
        triggers
      )
    ).toBe('[[Call the supplier]] @{2026-09-30} @@{14:30}');
  });

  it('keeps the lines after the first one', () => {
    expect(linkCardTitleToNote('Demo #sales\nsecond line #x', '[[Demo]]', triggers)).toBe(
      '[[Demo]] #sales\nsecond line #x'
    );
  });

  it('works for a card with plain text only', () => {
    expect(linkCardTitleToNote('Just text', '[[Just text]]', triggers)).toBe('[[Just text]]');
  });
});
