/**
 * Phase 7C: lightweight, deterministic interpretation of public dentist searches.
 *
 * This deliberately maps natural-language phrases to the fields supported by
 * the existing GET /booking/dentists endpoint (query and location). It does
 * not claim to perform clinical diagnosis or availability matching.
 */

export type DentistSearchIntent =
  | 'broad'
  | 'specialization'
  | 'dentist_name'
  | 'dental_concern';

export interface InterpretedDentistSearch {
  originalQuery: string;
  query?: string;
  location?: string;
  intent: DentistSearchIntent;
  explanation: string;
}

const FILLER_WORDS = new Set([
  'a', 'an', 'the', 'please', 'find', 'search', 'show', 'me', 'i', 'am',
  'looking', 'for', 'need', 'want', 'to', 'get', 'book', 'booking',
  'dentist', 'dentists', 'dental', 'doctor', 'doctors', 'clinic', 'clinics',
  'nearby', 'near', 'around', 'in', 'at', 'my', 'area', 'place', 'local',
  'best', 'good', 'dr', 'prof', 'mr', 'mrs', 'available', 'some', 'any', 'with', 'who', 'can', 'help',
]);

const SPECIALIZATION_RULES: Array<{
  pattern: RegExp;
  query: string;
  explanation: string;
}> = [
  {
    pattern: /\b(orthodont|braces?|aligners?|invisalign|crooked teeth|teeth alignment)\b/i,
    query: 'Orthodont',
    explanation: 'Orthodontic care (braces and teeth alignment)',
  },
  {
    pattern: /\b(pediatric|paediatric|children|child|kids?|baby|young patients?)\b/i,
    query: 'Pediatric',
    explanation: 'Pediatric dental care',
  },
  {
    pattern: /\b(root canal|endodont|tooth nerve)\b/i,
    query: 'Endodont',
    explanation: 'Root canal and endodontic care',
  },
  {
    pattern: /\b(gum disease|gum treatment|bleeding gums|periodont|gum specialist)\b/i,
    query: 'Periodont',
    explanation: 'Gum care (periodontics)',
  },
  {
    pattern: /\b(wisdom tooth|tooth extraction|remove a tooth|remove tooth|oral surg|dental surg)\b/i,
    query: 'Oral',
    explanation: 'Oral surgery / extraction',
  },
];

const BROAD_DENTAL_CONCERNS =
  /\b(toothache|tooth pain|teeth pain|pain in (my )?tooth|sore tooth|cavity|cavities|tooth decay|filling|cleaning|scaling|polishing|whitening|sensitive teeth|dental pain|broken tooth|chipped tooth|implant|dentures?)\b/i;

function cleanLocation(value: string): string {
  return value
    .replace(/[?.!,;]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts an explicit trailing location ("near Pune", "in Pune").
 * The currently selected location remains the fallback.
 */
function extractExplicitLocation(text: string): { text: string; location?: string } {
  const match = text.match(/\b(?:near|around|in|at)\s+([a-z][a-z .'-]{1,40})\s*$/i);
  if (!match) return { text };

  const candidate = cleanLocation(match[1]);
  if (!candidate || /^(me|my area|nearby|here|there)$/i.test(candidate)) {
    return { text };
  }

  const remaining = text.slice(0, match.index).trim();
  // Do not treat conversational fillers or dental intent words as a place.
  if (!remaining && /^(me|my area|nearby)$/i.test(candidate)) return { text };
  return { text: remaining, location: candidate };
}

function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function interpretDentistSearch(
  rawQuery: string,
  selectedLocation?: string,
): InterpretedDentistSearch {
  const originalQuery = rawQuery.trim();
  const extracted = extractExplicitLocation(originalQuery);
  const text = extracted.text;
  const location = extracted.location || selectedLocation?.trim() || undefined;

  if (!text || /^(dentist|dentists|dental|clinic|clinics|doctor|doctors|find dentist|find dentists)$/i.test(text)) {
    return {
      originalQuery,
      location,
      intent: 'broad',
      explanation: 'Showing dentists in the selected location',
    };
  }

  for (const rule of SPECIALIZATION_RULES) {
    if (rule.pattern.test(text)) {
      return {
        originalQuery,
        query: rule.query,
        location,
        intent: 'specialization',
        explanation: `Searching for ${rule.explanation}`,
      };
    }
  }

  if (BROAD_DENTAL_CONCERNS.test(text)) {
    return {
      originalQuery,
      location,
      intent: 'dental_concern',
      explanation: 'Showing dentists who may help with this dental concern',
    };
  }

  // Remove conversational words but retain meaningful terms for dentist-name
  // or specialization searches. If nothing remains, perform a broad search.
  const tokens = normalize(text).split(' ').filter(Boolean);
  const keywords = tokens.filter((token) => !FILLER_WORDS.has(token));
  const query = keywords.join(' ').trim();

  if (!query) {
    return {
      originalQuery,
      location,
      intent: 'broad',
      explanation: 'Showing dentists in the selected location',
    };
  }

  return {
    originalQuery,
    query,
    location,
    intent: 'dentist_name',
    explanation: `Searching dentists for "${query}"`,
  };
}
