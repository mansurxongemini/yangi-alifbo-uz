import { ScriptDetectionResult } from './types';

/**
 * Matnning qaysi alifboda yozilganini (Kirill, Eski lotin, Yangi lotin) yuqori aniqlikda aniqlaydi.
 */
export function detectScript(text: string): ScriptDetectionResult {
  if (!text || text.trim().length === 0) {
    return {
      detectedScript: 'unknown',
      confidence: 0,
      details: {
        cyrillicChars: 0,
        oldLatinMarkers: 0,
        newLatinMarkers: 0,
        latinChars: 0,
        totalLetters: 0,
      },
    };
  }

  let cyrillicChars = 0;
  let latinChars = 0;
  let newLatinMarkers = 0;
  let oldLatinMarkers = 0;

  // New Latin specific characters: Ö, ö, Ğ, ğ, Ş, ş, Ç, ç
  const newLatinRegex = /[öğşçÖĞŞÇ]/g;
  const newLatinMatches = text.match(newLatinRegex);
  if (newLatinMatches) {
    newLatinMarkers = newLatinMatches.length;
  }

  // Old Latin specific patterns: o‘, oʻ, o', o`, g‘, gʻ, g', g`, sh, ch
  const oldApostropheOandG = /[oOgG][ʻ‘'`]/g;
  const oldOGMatches = text.match(oldApostropheOandG);
  if (oldOGMatches) {
    oldLatinMarkers += oldOGMatches.length * 3; // strong weight
  }

  const oldShCh = /\b[a-zA-Z]*(?:sh|ch)[a-zA-Z]*\b/gi;
  const oldShChMatches = text.match(oldShCh);
  if (oldShChMatches && newLatinMarkers === 0) {
    oldLatinMarkers += oldShChMatches.length;
  }

  // General character counts
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Cyrillic unicode block: 0x0400 to 0x04FF
    if ((code >= 0x0400 && code <= 0x04ff) || code === 0x049a || code === 0x049b || code === 0x04b3 || code === 0x04b2) {
      cyrillicChars++;
    } else if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
      latinChars++;
    }
  }

  const totalLetters = cyrillicChars + latinChars + newLatinMarkers;

  if (totalLetters === 0) {
    return {
      detectedScript: 'unknown',
      confidence: 0,
      details: {
        cyrillicChars,
        oldLatinMarkers,
        newLatinMarkers,
        latinChars,
        totalLetters,
      },
    };
  }

  // Cyrillic check
  if (cyrillicChars > latinChars + newLatinMarkers) {
    const confidence = Math.min(1, Math.round((cyrillicChars / totalLetters) * 100) / 100);
    return {
      detectedScript: 'cyrillic',
      confidence,
      details: {
        cyrillicChars,
        oldLatinMarkers,
        newLatinMarkers,
        latinChars,
        totalLetters,
      },
    };
  }

  // If new Latin markers dominate or are present without old apostrophes
  if (newLatinMarkers > 0 && newLatinMarkers >= oldLatinMarkers) {
    return {
      detectedScript: 'new_latin',
      confidence: 0.95,
      details: {
        cyrillicChars,
        oldLatinMarkers,
        newLatinMarkers,
        latinChars,
        totalLetters,
      },
    };
  }

  // If old latin markers are detected
  if (oldLatinMarkers > 0) {
    return {
      detectedScript: 'eski_lotin',
      confidence: 0.9,
      details: {
        cyrillicChars,
        oldLatinMarkers,
        newLatinMarkers,
        latinChars,
        totalLetters,
      },
    };
  }

  // Default to old latin for standard ASCII english/latin text
  return {
    detectedScript: 'eski_lotin',
    confidence: 0.7,
    details: {
      cyrillicChars,
      oldLatinMarkers,
      newLatinMarkers,
      latinChars,
      totalLetters,
    },
  };
}
