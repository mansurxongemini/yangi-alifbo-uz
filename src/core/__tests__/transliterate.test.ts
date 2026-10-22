import { describe, it, expect } from 'vitest';
import {
  eskiLotinToYangiLotin,
  kirillToYangiLotin,
  yangiLotinToEskiLotin,
  yangiLotinToKirill,
  autoTransliterate
} from '../transliterate';
import { detectScript } from '../detector';

describe('1. Eski Lotin -> Yangi Lotin Konvertatsiyasi', () => {
  it('Oʻ va Gʻ harflarini (turli apostroflar bilan) toʻgʻri oʻgirishi kerak', () => {
    // Standard curly apostrophe (ʻ)
    expect(eskiLotinToYangiLotin('Oʻzbekiston')).toBe('Özbekiston');
    expect(eskiLotinToYangiLotin('oʻquvchi')).toBe('öquvçi');
    expect(eskiLotinToYangiLotin('Gʻalaba')).toBe('Ğalaba');
    expect(eskiLotinToYangiLotin('gʻildirak')).toBe('ğildirak');

    // Left single quote (‘)
    expect(eskiLotinToYangiLotin('O‘zbekiston')).toBe('Özbekiston');
    expect(eskiLotinToYangiLotin('G‘urur')).toBe('Ğurur');

    // Straight apostrophe (')
    expect(eskiLotinToYangiLotin("O'zbekiston")).toBe('Özbekiston');
    expect(eskiLotinToYangiLotin("g'isht")).toBe('ğişt');

    // Backtick (`)
    expect(eskiLotinToYangiLotin('O`zbekiston')).toBe('Özbekiston');
    expect(eskiLotinToYangiLotin('g`alla')).toBe('ğalla');
  });

  it('Sh va Ch harflarini toʻgʻri oʻgirishi kerak', () => {
    expect(eskiLotinToYangiLotin('Shahar')).toBe('Şahar');
    expect(eskiLotinToYangiLotin('shirin')).toBe('şirin');
    expect(eskiLotinToYangiLotin('Choyxona')).toBe('Çoyxona');
    expect(eskiLotinToYangiLotin('chiroyli')).toBe('çiroyli');

    // ALL CAPS holatida
    expect(eskiLotinToYangiLotin('SHAHAR')).toBe('ŞAHAR');
    expect(eskiLotinToYangiLotin('CHOYXONA')).toBe('ÇOYXONA');
  });

  it('Murakkab jumlalarni toʻgʻri oʻgirishi kerak', () => {
    const input = "Oʻzbekiston Respublikasi oʻzining goʻzal shaharlari va mehmondoʻst xalqi bilan mashhur.";
    const expected = "Özbekiston Respublikasi özining gözal şaharlari va mehmondöst xalqi bilan maşhur.";
    expect(eskiLotinToYangiLotin(input)).toBe(expected);
  });

  it("S'H istisnolarini saqlab qolishi kerak (Is'hoq, as-hob)", () => {
    expect(eskiLotinToYangiLotin("Is'hoq")).toBe('Isʼhoq');
    expect(eskiLotinToYangiLotin("as'hob")).toBe('asʼhob');
    expect(eskiLotinToYangiLotin("mus'haf")).toBe('musʼhaf');
  });
});

describe('2. Kirill -> Yangi Lotin Konvertatsiyasi', () => {
  it('Ў, Ғ, Ш, Ч harflarini toʻgʻri oʻgirishi kerak', () => {
    expect(kirillToYangiLotin('Ўзбекистон')).toBe('Özbekiston');
    expect(kirillToYangiLotin('ўқувчи')).toBe('öquvçi');
    expect(kirillToYangiLotin('Ғалаба')).toBe('Ğalaba');
    expect(kirillToYangiLotin('Шаҳар')).toBe('Şahar');
    expect(kirillToYangiLotin('Чойхона')).toBe('Çoyxona');
    expect(kirillToYangiLotin('Шошилинч')).toBe('Şoşilinç');
  });

  it('Е, Ё, Ю, Я harflari fonetik qoidalarini toʻgʻri bajarishi kerak', () => {
    // So'z boshida Ye, o'rtada E
    expect(kirillToYangiLotin('Ер')).toBe('Yer');
    expect(kirillToYangiLotin('Берди')).toBe('Berdi');
    expect(kirillToYangiLotin('Ёшлик')).toBe('Yoşlik');
    expect(kirillToYangiLotin('Юлдуз')).toBe('Yulduz');
    expect(kirillToYangiLotin('Янги')).toBe('Yangi');
  });

  it('Ц harfining sirk / konstitutsiya qoidalarini bajarishi kerak', () => {
    expect(kirillToYangiLotin('цирк')).toBe('sirk');
    expect(kirillToYangiLotin('концерт')).toBe('konsert');
    expect(kirillToYangiLotin('конституция')).toBe('konstitutsiya');
  });

  it('Tutuq belgisi va yumshatish belgilarini toʻgʻri boshqarishi kerak', () => {
    expect(kirillToYangiLotin('Аъло')).toBe('Aʼlo');
    expect(kirillToYangiLotin('Эълон')).toBe('Eʼlon');
    expect(kirillToYangiLotin('лагерь')).toBe('lager');
    expect(kirillToYangiLotin('пальто')).toBe('palto');
  });
});

describe('3. Yangi Lotin -> Eski Lotin va Kirill Teskari Konvertatsiyasi', () => {
  it('Yangi lotindan eski lotinga oʻgirishi kerak', () => {
    expect(yangiLotinToEskiLotin('Özbekiston')).toBe('Oʻzbekiston');
    expect(yangiLotinToEskiLotin('Ğalaba')).toBe('Gʻalaba');
    expect(yangiLotinToEskiLotin('Şahar')).toBe('Shahar');
    expect(yangiLotinToEskiLotin('Çoy')).toBe('Choy');
    expect(yangiLotinToEskiLotin('ŞAHAR')).toBe('SHAHAR');
  });

  it('Yangi lotindan kirillga oʻgirishi kerak', () => {
    expect(yangiLotinToKirill('Özbekiston')).toBe('Ўзбекистон');
    expect(yangiLotinToKirill('Ğalaba')).toBe('Ғалаба');
    expect(yangiLotinToKirill('Şahar')).toBe('Шаҳар');
    expect(yangiLotinToKirill('Çoy')).toBe('Чой');
  });
});

describe('4. Avtomatik Yozuv Turini Aniqlash (Script Detection)', () => {
  it('Kirill matnini aniqlashi kerak', () => {
    const res = detectScript('Бугун ҳаво жуда мусаффо ва қуёшли.');
    expect(res.detectedScript).toBe('cyrillic');
  });

  it('Eski lotin matnini aniqlashi kerak', () => {
    const res = detectScript("Oʻzbekiston mustaqil va goʻzal yurt. Shaharlar obod.");
    expect(res.detectedScript).toBe('eski_lotin');
  });

  it('Yangi lotin matnini aniqlashi kerak', () => {
    const res = detectScript("Özbekiston mustaqil va gözal yurt. Şaharlar obod.");
    expect(res.detectedScript).toBe('new_latin');
  });
});

describe('5. Avtomatik Transliteratsiya (autoTransliterate)', () => {
  it('Kirill matn kiritilganda avtomatik yangi lotinga oʻgirishi kerak', () => {
    const { result, detectedScript } = autoTransliterate('Ўзбекистон келажаagi буюк давлат');
    expect(detectedScript).toBe('cyrillic');
    expect(result).toContain('Özbekiston');
  });

  it('Eski lotin matn kiritilganda avtomatik yangi lotinga oʻgirishi kerak', () => {
    const { result, detectedScript } = autoTransliterate("Oʻzbekiston kelajagi buyuk davlat, shonli va qudratli");
    expect(detectedScript).toBe('eski_lotin');
    expect(result).toBe("Özbekiston kelajagi buyuk davlat, şonli va qudratli");
  });
});
