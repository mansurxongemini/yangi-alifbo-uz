import { describe, it, expect } from 'vitest';
import { convertText, convertSegments, detectScripts } from '../engine';

const toNew = (t: string, from: 'auto' | 'cyrillic' | 'old_latin' | 'new_latin' = 'auto') =>
  convertText(t, { from, to: 'new_latin' });
const toOld = (t: string) => convertText(t, { from: 'auto', to: 'old_latin' });
const toCyr = (t: string) => convertText(t, { from: 'auto', to: 'cyrillic' });

describe('Kirill -> Yangi lotin', () => {
  it('asosiy harflar', () => {
    expect(toNew('Ўзбекистон Республикаси')).toBe('Özbekiston Respublikasi');
    expect(toNew('ғалаба, шаҳар, чироқ, қишлоқ')).toBe('ğalaba, şahar, çiroq, qişloq');
  });
  it('Е, Ё, Ю, Я, Ц qoidalari', () => {
    expect(toNew('ер, бепул, оила еди')).toBe('yer, bepul, oila yedi');
    expect(toNew('Ёшлар юрт яшайди')).toBe('Yoşlar yurt yaşaydi');
    expect(toNew('цирк, милиция, лицей')).toBe('sirk, militsiya, litsey');
    expect(toNew('объект, маъно, съезд')).toBe('obyekt, maʼno, syezd');
  });
  it('bosh harfli soʻzlar', () => {
    expect(toNew('ЎЗБЕКИСТОН ЁШЛАРИ')).toBe('ÖZBEKISTON YOŞLARI');
    expect(toNew('ШАҲАР')).toBe('ŞAHAR');
  });
  it('oy nomlari', () => {
    expect(toNew('15 сентябрь, октябрда')).toBe('15 sentabr, oktabrda');
  });
});

describe('Eski lotin -> Yangi lotin', () => {
  it('barcha apostrof turlari', () => {
    expect(toNew("O'zbekiston, Oʻzbekiston, O‘zbekiston, O`zbekiston, O’zbekiston")).toBe(
      'Özbekiston, Özbekiston, Özbekiston, Özbekiston, Özbekiston'
    );
    expect(toNew("bog' g'alaba")).toBe('boğ ğalaba');
  });
  it('sh/ch va tutuq', () => {
    expect(toNew('Toshkent shahri, choy')).toBe('Toşkent şahri, çoy');
    expect(toNew("ma'no, e'lon, Qur'on")).toBe('maʼno, eʼlon, Qurʼon');
    expect(toNew("SHAHAR O'ZBEKISTON")).toBe('ŞAHAR ÖZBEKISTON');
  });
  it('yangi lotin oʻzgarmaydi (idempotent)', () => {
    const t = 'Özbekiston Respublikasi Toşkent şahri, çoy, maʼno';
    expect(toNew(t)).toBe(t);
  });
});

describe('Aralash matn', () => {
  it('kirill + eski lotin + yangi lotin bitta matnda', () => {
    expect(toNew("Ўзбекистон va O'zbekiston hamda Özbekiston")).toBe(
      'Özbekiston va Özbekiston hamda Özbekiston'
    );
  });
  it('notoʻgʻri tanlangan manba ham ishlaydi', () => {
    expect(toNew("O'zbekiston shahri", 'cyrillic')).toBe('Özbekiston şahri');
    expect(toNew('Ўзбекистон', 'old_latin')).toBe('Özbekiston');
    expect(toNew("Toshkent O'zbekiston", 'new_latin')).toBe('Toşkent Özbekiston');
  });
  it('kirill soʻz ichidagi lotin homoglif harflari', () => {
    // "Тoшкент" — "o" lotincha
    expect(toNew('Тoшкент')).toBe('Toşkent');
    // "Tошкент"ning lotincha T si bilan
    expect(toNew('Tошкент шаҳри')).toBe('Toşkent şahri');
  });
  it('URL va e-pochta oʻzgarmaydi', () => {
    expect(toNew('Сайт: https://www.gov.uz/shahar va info@chorsu.uz')).toBe(
      'Sayt: https://www.gov.uz/shahar va info@chorsu.uz'
    );
  });
});

describe('Yangi lotin -> Eski lotin', () => {
  it('asosiy', () => {
    expect(toOld('Özbekiston Toşkent şahri, çoy, ğalaba')).toBe('Oʻzbekiston Toshkent shahri, choy, gʻalaba');
    expect(toOld('ŞAHAR')).toBe('SHAHAR');
    expect(toOld('Şahar')).toBe('Shahar');
  });
  it('eski lotin soʻzlar oʻzgarmaydi', () => {
    expect(toOld("Toshkent shahri O'zbekiston")).toBe("Toshkent shahri O'zbekiston");
  });
  it('kirilldan toʻgʻridan-toʻgʻri', () => {
    expect(toOld('Ўзбекистон шаҳри')).toBe('Oʻzbekiston shahri');
  });
});

describe('Yangi lotin -> Kirill', () => {
  it('asosiy', () => {
    expect(toCyr('Özbekiston Respublikasi')).toBe('Ўзбекистон Республикаси');
    expect(toCyr('Toşkent şahri, çiroq, ğalaba')).toBe('Тошкент шаҳри, чироқ, ғалаба');
  });
  it('ye/yo/yu/ya, e boshida', () => {
    expect(toCyr('yer, Yoşlar, yurt, yaşaydi, eʼlon')).toBe('ер, Ёшлар, юрт, яшайди, эълон');
  });
  it('ts: ketsa -> кетса, militsiya -> милиция', () => {
    expect(toCyr('ketsa, aytsa, militsiya, litsey')).toBe('кетса, айтса, милиция, лицей');
  });
  it('qoʻshtirnoq kirillda ъ ga aylanmaydi', () => {
    expect(toCyr("'Kitob' maʼno")).toBe("'Китоб' маъно");
  });
  it('eski lotin ham kirillga', () => {
    expect(toCyr("O'zbekiston shahri")).toBe('Ўзбекистон шаҳри');
  });
  it('kirill paragrafidagi lotincha nomlar oʻzgarmaydi', () => {
    expect(toCyr('Биз Microsoft Word дастурида ишлаймиз')).toBe('Биз Microsoft Word дастурида ишлаймиз');
  });
  it('xorijiy nomlar (Microsoft Word) aralash matnda ham oʻzgarmaydi', () => {
    expect(toCyr('Microsoft Word')).toBe('Microsoft Word');
    expect(toCyr('Excel fayli')).toBe('Excel файли');
  });
  it('oy nomlari', () => {
    expect(toCyr('sentabr, oktabrda')).toBe('сентябрь, октябрда');
  });
});

describe('Markdown himoyasi', () => {
  it('kod va havola manzili oʻzgarmaydi', () => {
    const md = '# Шаҳар\n\n`shahar` va [шаҳар](https://x.uz/shahar)\n\n```\nshahar\nчой\n```\nчой';
    expect(convertText(md, { to: 'new_latin', markdown: true })).toBe(
      '# Şahar\n\n`shahar` va [şahar](https://x.uz/shahar)\n\n```\nshahar\nчой\n```\nçoy'
    );
  });
});

describe('Segmentlar (Word run) boʻyicha oʻgirish', () => {
  it('soʻz bir necha boʻlakka boʻlinganda ham toʻgʻri', () => {
    const r = convertSegments(['O', "'zbek", 'iston ', 'sh', 'ahri'], { to: 'new_latin' });
    expect(r.segments).toEqual(['Ö', 'zbek', 'iston ', 'ş', 'ahri']);
  });
  it('kirill soʻz boʻlaklari', () => {
    const r = convertSegments(['Е', 'р', ' юзи'], { to: 'new_latin' });
    expect(r.segments).toEqual(['Ye', 'r', ' yuzi']);
  });
});

describe('Aniqlash', () => {
  it('aralash matnni aniqlaydi', () => {
    const d = detectScripts("Ўзбекистон Республикаси пойтахти. O'zbekiston shahri bog'lari");
    expect(d.mixed).toBe(true);
  });
  it('sof kirill', () => {
    const d = detectScripts('Ўзбекистон Республикаси пойтахти Тошкент шаҳри');
    expect(d.dominant).toBe('cyrillic');
    expect(d.mixed).toBe(false);
  });
});

describe('Oʻzgarishlar roʻyxati', () => {
  it('juftliklar va natijadagi oʻrinlar', async () => {
    const { convertTextDetailed, listPairs } = await import('../engine');
    const r = convertTextDetailed('Ёшлар ва Kitob, ёшлар ва ёшлар', { to: 'new_latin' });
    expect(r.text).toBe('Yoşlar va Kitob, yoşlar va yoşlar');
    expect(listPairs(r.stats)).toEqual([
      { from: 'ва', to: 'va', count: 2 },
      { from: 'ёшлар', to: 'yoşlar', count: 2 },
      { from: 'Ёшлар', to: 'Yoşlar', count: 1 },
    ]);
    expect(r.spans.map((s) => r.text.slice(s.start, s.end))).toEqual(['Yoşlar', 'va', 'yoşlar', 'va', 'yoşlar']);
    expect(r.spans[0].original).toBe('Ёшлар');
  });
});
