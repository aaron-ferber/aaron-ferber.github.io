export const MET_API_BASE = 'https://collectionapi.metmuseum.org/public/collection/v1';

const CARE_ACTIONS = {
  feed: {
    label: 'Feed',
    deltas: { hunger: 14, joy: 2, shine: 0, curiosity: 0 },
    message: 'A tiny museum snack perks this pet right up.',
  },
  play: {
    label: 'Play',
    deltas: { hunger: -2, joy: 16, shine: 0, curiosity: 4 },
    message: 'It bounces around like a gallery opening just started.',
  },
  conserve: {
    label: 'Conserve',
    deltas: { hunger: 0, joy: 1, shine: 18, curiosity: 3 },
    message: 'A careful polish brings back the glow.',
  },
  study: {
    label: 'Study',
    deltas: { hunger: -1, joy: 0, shine: 2, curiosity: 17 },
    message: 'It learns a new detail from its wall label.',
  },
};

const MOODS = [
  {
    id: 'wilting',
    label: 'Wilting',
    message: 'This pet needs attention before it fades into storage.',
  },
  {
    id: 'restless',
    label: 'Restless',
    message: 'This pet is awake, but it wants one more kind of care.',
  },
  {
    id: 'steady',
    label: 'Steady',
    message: 'This pet is settled into its gallery niche.',
  },
  {
    id: 'radiant',
    label: 'Radiant',
    message: 'This pet is glowing like a freshly lit masterpiece.',
  },
];

const EVOLUTIONS = [
  {
    id: 'baby',
    label: 'Baby',
    message: 'Small, soft, and ready to grow.',
  },
  {
    id: 'bright',
    label: 'Bright',
    message: 'Brighter and steadier with every care streak.',
  },
  {
    id: 'guardian',
    label: 'Guardian',
    message: 'Strong enough to look after the whole gallery.',
  },
];

const ARCHETYPES = [
  'dreamer',
  'guardian',
  'scholar',
  'dancer',
  'sprite',
  'oracle',
];

const PATTERNS = [
  'brush',
  'halo',
  'plume',
  'marble',
  'mosaic',
  'stitch',
];

const FAVORITE_BY_DEPARTMENT = new Map([
  ['Arms and Armor', 'conserve'],
  ['Costume Institute', 'conserve'],
  ['Drawings and Prints', 'study'],
  ['European Paintings', 'play'],
  ['Musical Instruments', 'play'],
  ['Photographs', 'study'],
]);

const clamp = (value, min = 0, max = 100) => Math.min(Math.max(value, min), max);

export function extractObjectId(input) {
  const trimmed = String(input ?? '').trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const pathMatch = parsed.pathname.match(/\/(?:search|objects)\/(\d+)\/?$/);
  if (pathMatch) return Number(pathMatch[1]);

  const queryId = parsed.searchParams.get('objectID')
    ?? parsed.searchParams.get('objectId')
    ?? parsed.searchParams.get('oid')
    ?? parsed.searchParams.get('id');
  if (queryId && /^\d+$/.test(queryId)) return Number(queryId);

  return null;
}

export function extractSearchQuery(input) {
  const trimmed = String(input ?? '').trim();
  if (!trimmed || /^\d+$/.test(trimmed)) return '';

  try {
    const parsed = new URL(trimmed);
    const directQuery = parsed.searchParams.get('q')
      ?? parsed.searchParams.get('ft')
      ?? parsed.searchParams.get('search');
    if (directQuery) return directQuery.trim();

    const hashQuery = parsed.hash.match(/[?&](?:q|ft|search)=([^&]+)/);
    if (hashQuery) return decodeURIComponent(hashQuery[1].replace(/\+/g, ' ')).trim();

    return '';
  } catch {
    return trimmed;
  }
}

export function normalizeMetObject(object) {
  const tags = Array.isArray(object.tags)
    ? object.tags.map((tag) => tag?.term).filter(Boolean).slice(0, 6)
    : [];

  return {
    id: object.objectID,
    title: object.title || 'Untitled Met object',
    artist: object.artistDisplayName || object.culture || 'Unknown maker',
    department: object.department || 'The Met Collection',
    displayType: object.objectName || object.classification || 'Artwork',
    medium: object.medium || 'Unknown medium',
    date: object.objectDate || object.period || 'Date unknown',
    culture: object.culture || object.period || '',
    imageUrl: object.primaryImageSmall || object.primaryImage || '',
    metUrl: object.objectURL || `https://www.metmuseum.org/art/collection/search/${object.objectID}`,
    isHighlight: Boolean(object.isHighlight),
    isPublicDomain: Boolean(object.isPublicDomain),
    galleryNumber: object.GalleryNumber || '',
    tags,
  };
}

export function createGalleryPet(artwork) {
  const seedText = [
    artwork.id,
    artwork.title,
    artwork.artist,
    artwork.department,
    artwork.medium,
    artwork.date,
    artwork.tags.join(','),
  ].join('|');
  const seed = hashString(seedText);
  const favoriteCare = chooseFavoriteCare(artwork, seed);

  return {
    id: artwork.id,
    artworkId: artwork.id,
    name: makePetName(artwork),
    title: artwork.title,
    artist: artwork.artist,
    department: artwork.department,
    displayType: artwork.displayType,
    medium: artwork.medium,
    date: artwork.date,
    imageUrl: artwork.imageUrl,
    metUrl: artwork.metUrl,
    tags: artwork.tags,
    galleryNumber: artwork.galleryNumber,
    archetype: ARCHETYPES[seed % ARCHETYPES.length],
    favoriteCare,
    shellPattern: PATTERNS[Math.floor(seed / 7) % PATTERNS.length],
    palette: createPalette(seed, artwork.department),
    lore: makeLore(artwork, favoriteCare),
  };
}

export function createInitialCareState(seedId) {
  const seed = hashString(String(seedId));

  return {
    hunger: 58 + (seed % 18),
    joy: 56 + ((seed >> 3) % 20),
    shine: 54 + ((seed >> 5) % 22),
    curiosity: 60 + ((seed >> 7) % 16),
    lastAction: 'hatched',
    lastMessage: 'A new artwork pet has hatched.',
    updatedAt: Date.now(),
  };
}

export function applyCareAction(state, action) {
  const care = CARE_ACTIONS[action];
  if (!care) return state;

  return {
    hunger: clamp((state.hunger ?? 0) + care.deltas.hunger),
    joy: clamp((state.joy ?? 0) + care.deltas.joy),
    shine: clamp((state.shine ?? 0) + care.deltas.shine),
    curiosity: clamp((state.curiosity ?? 0) + care.deltas.curiosity),
    lastAction: action,
    lastMessage: care.message,
    updatedAt: Date.now(),
  };
}

export function getPetMood(state) {
  const values = [
    state.hunger ?? 0,
    state.joy ?? 0,
    state.shine ?? 0,
    state.curiosity ?? 0,
  ];
  const average = values.reduce((total, value) => total + value, 0) / values.length;
  const weakest = Math.min(...values);

  if (average >= 90 && weakest >= 84) return MOODS[3];
  if (average >= 56 && weakest >= 48) return MOODS[2];
  if (average >= 38 && weakest >= 22) return MOODS[1];
  return MOODS[0];
}

export function getPetEvolution(state, healthScore = 0) {
  const careValues = [
    state.hunger ?? 0,
    state.joy ?? 0,
    state.shine ?? 0,
    state.curiosity ?? 0,
  ];
  const careAverage = careValues.reduce((total, value) => total + value, 0) / careValues.length;
  const weakestCare = Math.min(...careValues);
  const safeHealthScore = clamp(Number.isFinite(healthScore) ? healthScore : 0);
  const strength = Math.floor((careAverage * 0.65) + (safeHealthScore * 0.35));

  if (strength >= 80 && weakestCare >= 70 && safeHealthScore >= 75) {
    return { ...EVOLUTIONS[2], strength };
  }
  if (strength >= 55 && weakestCare >= 40 && safeHealthScore >= 45) {
    return { ...EVOLUTIONS[1], strength };
  }
  return { ...EVOLUTIONS[0], strength };
}

export function getCareActions() {
  return structuredClone(CARE_ACTIONS);
}

function chooseFavoriteCare(artwork, seed) {
  if (FAVORITE_BY_DEPARTMENT.has(artwork.department)) {
    return FAVORITE_BY_DEPARTMENT.get(artwork.department);
  }

  const text = `${artwork.medium} ${artwork.displayType} ${artwork.tags.join(' ')}`.toLowerCase();
  if (/armor|metal|silver|gold|bronze|ceramic|glass/.test(text)) return 'conserve';
  if (/book|print|drawing|text|letter|manuscript/.test(text)) return 'study';
  if (/toy|instrument|dance|music|landscape|bird|animal/.test(text)) return 'play';
  return Object.keys(CARE_ACTIONS)[seed % Object.keys(CARE_ACTIONS).length];
}

function makePetName(artwork) {
  const words = artwork.title
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .split(/\s+/)
    .filter((word) => word.length > 2);
  const cypressWord = words.find((word) => /^cypress/i.test(word));
  const anchor = cypressWord
    ?? words.find((word) => !/^(the|with|and|from|for|after|study|portrait|field)$/i.test(word))
    ?? 'Met';
  const suffixes = ['Sprout', 'Mote', 'Bean', 'Whisp', 'Nub', 'Pip'];
  const suffix = cypressWord ? 'Sprout' : suffixes[hashString(artwork.title) % suffixes.length];

  return `${toTitleCase(singularize(anchor))} ${suffix}`;
}

function makeLore(artwork, favoriteCare) {
  const actionLabel = CARE_ACTIONS[favoriteCare].label.toLowerCase();
  const maker = artwork.artist === 'Unknown maker' ? 'an unknown maker' : artwork.artist;

  return `Born from ${artwork.department}, this ${artwork.displayType.toLowerCase()} pet remembers ${maker} and likes to ${actionLabel}.`;
}

function createPalette(seed, department) {
  const departmentOffset = hashString(department) % 36;
  const hue = (seed + departmentOffset) % 360;

  return {
    hue,
    accent: (hue + 44) % 360,
    shadow: (hue + 320) % 360,
  };
}

function hashString(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function singularize(value) {
  if (/ies$/i.test(value)) return value.replace(/ies$/i, 'y');
  if (/(s|x|z|ch|sh)es$/i.test(value)) return value.replace(/es$/i, '');
  if (/s$/i.test(value) && value.length > 4) return value.slice(0, -1);
  return value;
}

function toTitleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
