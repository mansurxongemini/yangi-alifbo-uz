import { AlphabetCharPair } from './types';

export const ALPHABET_DATA: AlphabetCharPair[] = [
  { char: 'A', name: 'A', cyrillic: 'А а', oldLatin: 'A a', newLatin: 'A a', soundType: 'unli' },
  { char: 'B', name: 'Be', cyrillic: 'Б б', oldLatin: 'B b', newLatin: 'B b', soundType: 'undosh' },
  { char: 'D', name: 'De', cyrillic: 'Д д', oldLatin: 'D d', newLatin: 'D d', soundType: 'undosh' },
  { char: 'E', name: 'E', cyrillic: 'Э э / Е е', oldLatin: 'E e', newLatin: 'E e', soundType: 'unli' },
  { char: 'F', name: 'Ef', cyrillic: 'Ф ф', oldLatin: 'F f', newLatin: 'F f', soundType: 'undosh' },
  { char: 'G', name: 'Ge', cyrillic: 'Г г', oldLatin: 'G g', newLatin: 'G g', soundType: 'undosh' },
  { char: 'H', name: 'Ha', cyrillic: 'Ҳ ҳ', oldLatin: 'H h', newLatin: 'H h', soundType: 'undosh' },
  { char: 'I', name: 'I', cyrillic: 'И и', oldLatin: 'I i', newLatin: 'I i', soundType: 'unli' },
  { char: 'J', name: 'Je', cyrillic: 'Ж ж', oldLatin: 'J j', newLatin: 'J j', soundType: 'undosh' },
  { char: 'K', name: 'Ka', cyrillic: 'К к', oldLatin: 'K k', newLatin: 'K k', soundType: 'undosh' },
  { char: 'L', name: 'El', cyrillic: 'Л л', oldLatin: 'L l', newLatin: 'L l', soundType: 'undosh' },
  { char: 'M', name: 'Em', cyrillic: 'М м', oldLatin: 'M m', newLatin: 'M m', soundType: 'undosh' },
  { char: 'N', name: 'En', cyrillic: 'Н н', oldLatin: 'N n', newLatin: 'N n', soundType: 'undosh' },
  { char: 'O', name: 'O', cyrillic: 'О о', oldLatin: 'O o', newLatin: 'O o', soundType: 'unli' },
  { char: 'P', name: 'Pe', cyrillic: 'П п', oldLatin: 'P p', newLatin: 'P p', soundType: 'undosh' },
  { char: 'Q', name: 'Qa', cyrillic: 'Қ қ', oldLatin: 'Q q', newLatin: 'Q q', soundType: 'undosh' },
  { char: 'R', name: 'Er', cyrillic: 'Р р', oldLatin: 'R r', newLatin: 'R r', soundType: 'undosh' },
  { char: 'S', name: 'Es', cyrillic: 'С с', oldLatin: 'S s', newLatin: 'S s', soundType: 'undosh' },
  { char: 'T', name: 'Te', cyrillic: 'Т т', oldLatin: 'T t', newLatin: 'T t', soundType: 'undosh' },
  { char: 'U', name: 'U', cyrillic: 'У у', oldLatin: 'U u', newLatin: 'U u', soundType: 'unli' },
  { char: 'V', name: 'Ve', cyrillic: 'В в', oldLatin: 'V v', newLatin: 'V v', soundType: 'undosh' },
  { char: 'X', name: 'Xa', cyrillic: 'Х х', oldLatin: 'X x', newLatin: 'X x', soundType: 'undosh' },
  { char: 'Y', name: 'Yot', cyrillic: 'Й й', oldLatin: 'Y y', newLatin: 'Y y', soundType: 'undosh' },
  { char: 'Z', name: 'Zet', cyrillic: 'З з', oldLatin: 'Z z', newLatin: 'Z z', soundType: 'undosh' },
  { char: 'Ö', name: 'Ö', cyrillic: 'Ў ў', oldLatin: 'Oʻ oʻ (o‘)', newLatin: 'Ö ö', soundType: 'unli' },
  { char: 'Ğ', name: 'Ğe', cyrillic: 'Ғ ғ', oldLatin: 'Gʻ gʻ (g‘)', newLatin: 'Ğ ğ', soundType: 'undosh' },
  { char: 'Ş', name: 'Şa', cyrillic: 'Ш ш', oldLatin: 'Sh sh', newLatin: 'Ş ş', soundType: 'undosh' },
  { char: 'Ç', name: 'Ça', cyrillic: 'Ч ч', oldLatin: 'Ch ch', newLatin: 'Ç ç', soundType: 'undosh' },
  { char: 'ʼ', name: 'Tutuq belgisi', cyrillic: 'Ъ ъ', oldLatin: 'ʼ / \'', newLatin: 'ʼ / \'', soundType: 'belgi' }
];

export const NEW_SPECIAL_CHARS = [
  { upper: 'Ö', lower: 'ö', name: 'Ö' },
  { upper: 'Ğ', lower: 'ğ', name: 'Ğ' },
  { upper: 'Ş', lower: 'ş', name: 'Ş' },
  { upper: 'Ç', lower: 'ç', name: 'Ç' },
  { upper: 'ʼ', lower: 'ʼ', name: 'Tutuq' }
];
