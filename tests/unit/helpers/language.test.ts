import { localeKeyFromMoment } from 'src/lang/helpers';
import { describe, expect, it } from 'vitest';

describe('localeKeyFromMoment (app language before Obsidian 1.8.7)', () => {
  it('maps moment codes that differ from the plugin locale keys', () => {
    expect(localeKeyFromMoment('zh-cn')).toBe('zh');
    expect(localeKeyFromMoment('zh-tw')).toBe('zh-TW');
    expect(localeKeyFromMoment('pt-br')).toBe('pt-BR');
    expect(localeKeyFromMoment('cs')).toBe('cz');
    expect(localeKeyFromMoment('nb')).toBe('no');
  });

  it('uses the language part of other codes', () => {
    expect(localeKeyFromMoment('ru')).toBe('ru');
    expect(localeKeyFromMoment('en-gb')).toBe('en');
    expect(localeKeyFromMoment('en')).toBe('en');
  });
});
