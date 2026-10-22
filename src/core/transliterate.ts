import { detectScript } from './detector';
import { S_H_EXCEPTIONS, SOFT_SIGN_REMOVAL, TS_TO_S_WORDS } from './exceptions';
import { ScriptType, TargetScript } from './types';

// Apostrophe characters pattern
const APOSTROPHE_PATTERN = "[ʻ‘'`’ʹ]";

/**
 * Eski lotin alifbosidagi matnni Yangi lotin alifbosiga o'giradi.
 * Oʻ/O‘ -> Ö, Gʻ/G‘ -> Ğ, Sh -> Ş, Ch -> Ç
 */
export function eskiLotinToYangiLotin(text: string): string {
  if (!text) return '';

  // 1. Qat'iy istisnolarni himoyalash (masalan: Is'hoq, as-hob)
  let result = text;

  // Preserve S'H exceptions using placeholders
  const preservedExceptions: { placeholder: string; original: string; replacement: string }[] = [];
  let placeholderCounter = 0;

  for (const [key, value] of Object.entries(S_H_EXCEPTIONS)) {
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    result = result.replace(regex, (match) => {
      const placeholder = `__EXC_${placeholderCounter++}__`;
      // Match case
      let replacement = value;
      if (match === match.toUpperCase()) {
        replacement = value.toUpperCase();
      } else if (match[0] === match[0].toUpperCase()) {
        replacement = value[0].toUpperCase() + value.slice(1);
      }
      preservedExceptions.push({ placeholder, original: match, replacement });
      return placeholder;
    });
  }

  // 2. O' va G' harflarini o'girish (turli xil apostroflarni hisobga olgan holda)
  // Oʻ / O‘ / O' / O` -> Ö
  result = result.replace(new RegExp(`O${APOSTROPHE_PATTERN}`, 'g'), 'Ö');
  result = result.replace(new RegExp(`o${APOSTROPHE_PATTERN}`, 'g'), 'ö');

  // Gʻ / G‘ / G' / G` -> Ğ
  result = result.replace(new RegExp(`G${APOSTROPHE_PATTERN}`, 'g'), 'Ğ');
  result = result.replace(new RegExp(`g${APOSTROPHE_PATTERN}`, 'g'), 'ğ');

  // 3. Sh va Ch harflarini o'girish (Case-sensitive)
  // Check if following character is uppercase to preserve ALL CAPS (e.g. SHAHAR -> ŞAHAR)
  result = result.replace(/SH(?=[A-ZÖĞŞÇ]|\b)/g, 'Ş');
  result = result.replace(/Sh/g, 'Ş');
  result = result.replace(/sH/g, 'ş');
  result = result.replace(/sh/g, 'ş');

  result = result.replace(/CH(?=[A-ZÖĞŞÇ]|\b)/g, 'Ç');
  result = result.replace(/Ch/g, 'Ç');
  result = result.replace(/cH/g, 'ç');
  result = result.replace(/ch/g, 'ç');

  // 4. Istisnolarni qaytarish
  for (const item of preservedExceptions) {
    result = result.replace(item.placeholder, item.replacement);
  }

  // 5. Standart tutuq belgisini to'g'rilash (bir xil tipografik me'yor: ʼ)
  result = result.replace(/([a-zA-ZöğşçÖĞŞÇ])[ʻ‘`’ʹ]([a-zA-ZöğşçÖĞŞÇ])/g, '$1ʼ$2');

  return result;
}

/**
 * Kirill alifbosidagi matnni Yangi lotin alifbosiga o'giradi.
 * Ў -> Ö, Ғ -> Ğ, Ш -> Ş, Ч -> Ç, Е, Ё, Ю, Я, Ц qoidalari bilan.
 */
export function kirillToYangiLotin(text: string): string {
  if (!text) return '';

  const cyrillicVowels = new Set(['а', 'е', 'ё', 'и', 'о', 'у', 'э', 'ю', 'я', 'ў', 'ы']);

  // So'zlarga ajratib yoki belgilar oqimi bilan tahlil qilish
  const words = text.split(/(\s+|[^\p{L}\p{N}]+)/u);

  const transformedWords = words.map((word) => {
    if (!word || !/[\u0400-\u04FF]/.test(word)) {
      return word;
    }

    const lowerWord = word.toLowerCase();

    // Maxsus so'zlar: yumshatish belgisi tushadigan so'zlar
    if (SOFT_SIGN_REMOVAL[lowerWord]) {
      const rep = SOFT_SIGN_REMOVAL[lowerWord];
      if (word === word.toUpperCase()) return rep.toUpperCase();
      if (word[0] === word[0].toUpperCase()) return rep[0].toUpperCase() + rep.slice(1);
      return rep;
    }

    let res = '';
    const len = word.length;

    for (let i = 0; i < len; i++) {
      const char = word[i];
      const prevChar = i > 0 ? word[i - 1].toLowerCase() : null;
      const nextChar = i < len - 1 ? word[i + 1] : null;
      const isNextUpper = nextChar ? nextChar === nextChar.toUpperCase() && nextChar !== nextChar.toLowerCase() : false;

      // E / e qoidasi
      if (char === 'Е' || char === 'е') {
        const isUpper = char === 'Е';
        const isStartOrAfterVowel = i === 0 || (prevChar && cyrillicVowels.has(prevChar));

        if (isStartOrAfterVowel) {
          if (isUpper) {
            res += isNextUpper ? 'YE' : 'Ye';
          } else {
            res += 'ye';
          }
        } else {
          res += isUpper ? 'E' : 'e';
        }
        continue;
      }

      // Ё / ё
      if (char === 'Ё' || char === 'ё') {
        const isUpper = char === 'Ё';
        if (isUpper) {
          res += isNextUpper ? 'YO' : 'Yo';
        } else {
          res += 'yo';
        }
        continue;
      }

      // Ю / ю
      if (char === 'Ю' || char === 'ю') {
        const isUpper = char === 'Ю';
        if (isUpper) {
          res += isNextUpper ? 'YU' : 'Yu';
        } else {
          res += 'yu';
        }
        continue;
      }

      // Я / я
      if (char === 'Я' || char === 'я') {
        const isUpper = char === 'Я';
        if (isUpper) {
          res += isNextUpper ? 'YA' : 'Ya';
        } else {
          res += 'ya';
        }
        continue;
      }

      // Ц / ц qoidasi
      if (char === 'Ц' || char === 'ц') {
        const isUpper = char === 'Ц';
        const isWordStart = i === 0;
        const isAfterConsonant = prevChar && !cyrillicVowels.has(prevChar);

        if (isWordStart || isAfterConsonant || TS_TO_S_WORDS.has(lowerWord)) {
          res += isUpper ? 'S' : 's';
        } else {
          if (isUpper) {
            res += isNextUpper ? 'TS' : 'Ts';
          } else {
            res += 'ts';
          }
        }
        continue;
      }

      // Yangi alifbodagi asosiy o'zgarishlar
      // Ў -> Ö
      if (char === 'Ў') { res += 'Ö'; continue; }
      if (char === 'ў') { res += 'ö'; continue; }

      // Ғ -> Ğ
      if (char === 'Ғ') { res += 'Ğ'; continue; }
      if (char === 'ғ') { res += 'ğ'; continue; }

      // Ш -> Ş
      if (char === 'Ш') { res += 'Ş'; continue; }
      if (char === 'ш') { res += 'ş'; continue; }

      // Ч -> Ç
      if (char === 'Ч') { res += 'Ç'; continue; }
      if (char === 'ч') { res += 'ç'; continue; }

      // Щ -> Ş (o'zbek tilida ş deb o'giriladi)
      if (char === 'Щ') { res += 'Ş'; continue; }
      if (char === 'щ') { res += 'ş'; continue; }

      // Ъ -> Tutuq belgisi (ʼ)
      if (char === 'Ъ' || char === 'ъ') {
        res += 'ʼ';
        continue;
      }

      // Ь -> Yumshatish belgisi (odatda tushib qoladi)
      if (char === 'Ь' || char === 'ь') {
        continue;
      }

      // Oddiy harflar xaritasi
      const standardMap: Record<string, string> = {
        'А': 'A', 'а': 'a',
        'Б': 'B', 'б': 'b',
        'В': 'V', 'в': 'v',
        'Г': 'G', 'г': 'g',
        'Д': 'D', 'д': 'd',
        'Ж': 'J', 'ж': 'j',
        'З': 'Z', 'з': 'z',
        'И': 'I', 'и': 'i',
        'Й': 'Y', 'й': 'y',
        'К': 'K', 'к': 'k',
        'Л': 'L', 'л': 'l',
        'М': 'M', 'м': 'm',
        'Н': 'N', 'н': 'n',
        'О': 'O', 'о': 'o',
        'П': 'P', 'п': 'p',
        'Р': 'R', 'р': 'r',
        'С': 'S', 'с': 's',
        'Т': 'T', 'т': 't',
        'У': 'U', 'у': 'u',
        'Ф': 'F', 'ф': 'f',
        'Х': 'X', 'х': 'x',
        'Э': 'E', 'э': 'e',
        'Қ': 'Q', 'қ': 'q',
        'Ҳ': 'H', 'ҳ': 'h',
        'Ы': 'I', 'ы': 'i',
      };

      if (standardMap[char]) {
        res += standardMap[char];
      } else {
        res += char;
      }
    }

    return res;
  });

  return transformedWords.join('');
}

/**
 * Yangi lotin alifbosidagi matnni Eski lotin alifbosiga o'giradi.
 * Ö -> Oʻ, Ğ -> Gʻ, Ş -> Sh, Ç -> Ch
 */
export function yangiLotinToEskiLotin(text: string): string {
  if (!text) return '';

  let result = text;

  // Ö -> Oʻ
  result = result.replace(/Ö/g, 'Oʻ');
  result = result.replace(/ö/g, 'oʻ');

  // Ğ -> Gʻ
  result = result.replace(/Ğ/g, 'Gʻ');
  result = result.replace(/ğ/g, 'gʻ');

  // Ş -> Sh (agar keyingi harf bosh harf bo'lsa yoki butun so'z bosh harflarda bo'lsa SH)
  result = result.replace(/Ş(?=[\p{Lu}])/gu, 'SH');
  result = result.replace(/Ş(?=[^\p{Ll}]|$)/gu, 'SH'); // e.g. standalone "Ş " or end of uppercase word
  result = result.replace(/Ş/g, 'Sh');
  result = result.replace(/ş/g, 'sh');

  // Ç -> Ch
  result = result.replace(/Ç(?=[\p{Lu}])/gu, 'CH');
  result = result.replace(/Ç(?=[^\p{Ll}]|$)/gu, 'CH');
  result = result.replace(/Ç/g, 'Ch');
  result = result.replace(/ç/g, 'ch');

  return result;
}

/**
 * Yangi lotin alifbosidagi matnni Kirill alifbosiga o'giradi.
 */
export function yangiLotinToKirill(text: string): string {
  if (!text) return '';

  let result = text;

  // Birikmalar va maxsus harflar (katta-kichik registr)
  result = result.replace(/Ö/g, 'Ў');
  result = result.replace(/ö/g, 'ў');
  result = result.replace(/Ğ/g, 'Ғ');
  result = result.replace(/ğ/g, 'ғ');
  result = result.replace(/Ş/g, 'Ш');
  result = result.replace(/ş/g, 'ш');
  result = result.replace(/Ç/g, 'Ч');
  result = result.replace(/ç/g, 'ч');

  // Ye / Yo / Yu / Ya birikmalari
  result = result.replace(/YE\b/g, 'Е');
  result = result.replace(/Ye/g, 'Е');
  result = result.replace(/ye/g, 'е');

  result = result.replace(/YO\b/g, 'Ё');
  result = result.replace(/Yo/g, 'Ё');
  result = result.replace(/yo/g, 'ё');

  result = result.replace(/YU\b/g, 'Ю');
  result = result.replace(/Yu/g, 'Ю');
  result = result.replace(/yu/g, 'ю');

  result = result.replace(/YA\b/g, 'Я');
  result = result.replace(/Ya/g, 'Я');
  result = result.replace(/ya/g, 'я');

  result = result.replace(/TS\b/g, 'Ц');
  result = result.replace(/Ts/g, 'Ц');
  result = result.replace(/ts/g, 'ц');

  // Tutuq belgisi -> Ъ / ъ
  result = result.replace(/ʼ/g, 'ъ');
  result = result.replace(/'/g, 'ъ');

  const latinToCyrillicMap: Record<string, string> = {
    'A': 'А', 'a': 'а',
    'B': 'Б', 'b': 'б',
    'D': 'Д', 'd': 'д',
    'E': 'Э', 'e': 'е',
    'F': 'Ф', 'f': 'ф',
    'G': 'Г', 'g': 'г',
    'H': 'Ҳ', 'h': 'ҳ',
    'I': 'И', 'i': 'и',
    'J': 'Ж', 'j': 'ж',
    'K': 'К', 'k': 'к',
    'L': 'Л', 'l': 'л',
    'M': 'М', 'm': 'м',
    'N': 'Н', 'n': 'н',
    'O': 'О', 'o': 'о',
    'P': 'П', 'p': 'п',
    'Q': 'Қ', 'q': 'қ',
    'R': 'Р', 'r': 'р',
    'S': 'С', 's': 'с',
    'T': 'Т', 't': 'т',
    'U': 'У', 'u': 'у',
    'V': 'В', 'v': 'в',
    'X': 'Х', 'x': 'х',
    'Y': 'Й', 'y': 'й',
    'Z': 'З', 'z': 'з',
  };

  let finalRes = '';
  for (let i = 0; i < result.length; i++) {
    const ch = result[i];
    finalRes += latinToCyrillicMap[ch] !== undefined ? latinToCyrillicMap[ch] : ch;
  }

  return finalRes;
}

/**
 * Avtomatik yo'nalishni aniqlab o'giradi.
 */
export function autoTransliterate(
  text: string,
  targetScript: TargetScript = 'new_latin'
): { result: string; detectedScript: ScriptType } {
  if (!text || text.trim().length === 0) {
    return { result: '', detectedScript: 'unknown' };
  }

  const detection = detectScript(text);
  const detected = detection.detectedScript;

  let result = '';

  if (targetScript === 'new_latin') {
    if (detected === 'cyrillic') {
      result = kirillToYangiLotin(text);
    } else {
      // old_latin or new_latin or unknown
      result = eskiLotinToYangiLotin(text);
    }
  } else if (targetScript === 'old_latin') {
    if (detected === 'cyrillic') {
      const newLat = kirillToYangiLotin(text);
      result = yangiLotinToEskiLotin(newLat);
    } else {
      result = yangiLotinToEskiLotin(text);
    }
  } else if (targetScript === 'cyrillic') {
    if (detected === 'cyrillic') {
      result = text; // Allaqachon kirill
    } else if (detected === 'new_latin') {
      result = yangiLotinToKirill(text);
    } else {
      // Eski lotinni avval yangi lotinga, keyin kirillga
      const newLat = eskiLotinToYangiLotin(text);
      result = yangiLotinToKirill(newLat);
    }
  }

  return { result, detectedScript: detected };
}
