export type ScriptType = 'cyrillic' | 'eski_lotin' | 'new_latin' | 'unknown';

export type TargetScript = 'new_latin' | 'old_latin' | 'cyrillic';

export interface ScriptDetectionResult {
  detectedScript: ScriptType;
  confidence: number;
  details: {
    cyrillicChars: number;
    oldLatinMarkers: number;
    newLatinMarkers: number;
    latinChars: number;
    totalLetters: number;
  };
}

export interface TransliterateOptions {
  from?: ScriptType | 'auto';
  to?: TargetScript;
  preserveUnknownWords?: boolean;
}

export interface AlphabetCharPair {
  char: string;
  name: string;
  cyrillic: string;
  oldLatin: string;
  newLatin: string;
  soundType: 'unli' | 'undosh' | 'belgi';
}
