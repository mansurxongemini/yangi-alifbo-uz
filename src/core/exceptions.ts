/**
 * O'zbek tili transliteratsiyasida uchraydigan maxsus istisnolar va qoidalar
 */

// S va H harflari alohida tovush bo'lib keladigan so'zlar (sh -> ş ga aylanmasligi kerak)
export const S_H_EXCEPTIONS: Record<string, string> = {
  // Eski lotin (s'h yoki sh) -> Yangi lotin (sʼh yoki sh bo'lib qoladi, ş emas)
  "is'hoq": "isʼhoq",
  "isʼhoq": "isʼhoq",
  "ishoq": "isʼhoq",
  "as'hob": "asʼhob",
  "asʼhob": "asʼhob",
  "ashob": "asʼhob",
  "mus'haf": "musʼhaf",
  "musʼhaf": "musʼhaf",
  "mushaf": "musʼhaf",
  "mas'ul": "masʼul",
  "masʼul": "masʼul",
  "mas'uliyat": "masʼuliyat",
  "masʼuliyat": "masʼuliyat",
  "ta'kid": "taʼkid",
  "taʼkid": "taʼkid",
  "e'lon": "eʼlon",
  "eʼlon": "eʼlon",
  "mo'jiza": "möʼjiza",
  "moʻjiza": "möʼjiza",
  "a'lo": "aʼlo",
  "aʼlo": "aʼlo"
};

// Kirill 'Ц' harfi so'z boshida yoki undoshdan keyin kelsa 's' ga aylanadigan taniqli so'zlar
export const TS_TO_S_WORDS = new Set([
  'цирк', 'цемент', 'циркуль', 'цех', 'центнер', 'цитата', 'сирк',
  'концерт', 'акцент', 'доцент', 'инцидент', 'шанс'
]);

// Yumshatish belgisi (ь) tushib qoladigan ruscha o'zlashma so'zlar
export const SOFT_SIGN_REMOVAL: Record<string, string> = {
  'январь': 'yanvar',
  'февраль': 'fevral',
  'апрель': 'aprel',
  'июнь': 'iyun',
  'июль': 'iyul',
  'сентябрь': 'sentabr',
  'октябрь': 'oktabr',
  'ноябрь': 'noyabr',
  'декабрь': 'dekabr',
  'лагерь': 'lager',
  'альбом': 'albom',
  'пальто': 'palto',
  'фильм': 'film',
  'руль': 'rul',
  'ноль': 'nol',
  'пароль': 'parol',
  'контроль': 'kontrol',
  'модель': 'model',
  'стиль': 'stil',
  'роль': 'rol'
};
