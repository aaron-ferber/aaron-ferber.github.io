const EVOLUTION_POWER = {
  baby: 0,
  bright: 17,
  guardian: 20,
};

export const PET_PART_DATABASE = deepFreeze({
  bodyShapes: [
    { id: 'dumpling', label: 'Dumpling body', animalHint: 'hamster', power: 0, silhouette: 'round' },
    { id: 'bean', label: 'Bean body', animalHint: 'guinea pig', power: 0, silhouette: 'squish' },
    { id: 'moss_loaf', label: 'Moss loaf body', animalHint: 'forest bunny', power: 1, silhouette: 'loaf' },
    { id: 'peach_puff', label: 'Peach puff body', animalHint: 'kitten', power: 1, silhouette: 'puff' },
    { id: 'cloud_bun', label: 'Cloud bun body', animalHint: 'rabbit', power: 2, silhouette: 'springy' },
    { id: 'star_otter', label: 'Star otter body', animalHint: 'otter', power: 2, silhouette: 'sleek' },
    { id: 'moon_fox', label: 'Moon fox body', animalHint: 'fox', power: 3, silhouette: 'nimble' },
    { id: 'tiny_guardian', label: 'Tiny guardian body', animalHint: 'lion cub', power: 4, silhouette: 'proud' },
  ],
  ears: [
    { id: 'nubby', label: 'Nubby ears', animalHint: 'bear cub', power: 0, pose: 'soft' },
    { id: 'button', label: 'Button ears', animalHint: 'mouse', power: 0, pose: 'round' },
    { id: 'floppy', label: 'Floppy ears', animalHint: 'puppy', power: 1, pose: 'droopy' },
    { id: 'sprout', label: 'Sprout ears', animalHint: 'bunny', power: 1, pose: 'perky' },
    { id: 'leaf', label: 'Leaf ears', animalHint: 'deer', power: 2, pose: 'alert' },
    { id: 'star_tip', label: 'Star-tip ears', animalHint: 'fox', power: 3, pose: 'bright' },
    { id: 'halo_fin', label: 'Halo fin ears', animalHint: 'axolotl', power: 3, pose: 'glowing' },
    { id: 'crown_tuft', label: 'Crown tuft ears', animalHint: 'lion cub', power: 4, pose: 'heroic' },
  ],
  arms: [
    { id: 'tiny_peeks', label: 'Tiny peek arms', animalHint: 'hamster', power: 0, gesture: 'tucked' },
    { id: 'mittens', label: 'Mitten arms', animalHint: 'kitten', power: 0, gesture: 'held close' },
    { id: 'hug_paws', label: 'Hug paws', animalHint: 'bear cub', power: 1, gesture: 'open' },
    { id: 'wavy_paws', label: 'Wavy paws', animalHint: 'puppy', power: 1, gesture: 'waving' },
    { id: 'leaf_paws', label: 'Leaf paws', animalHint: 'bunny', power: 2, gesture: 'balanced' },
    { id: 'star_paws', label: 'Star paws', animalHint: 'fox', power: 3, gesture: 'sparkly' },
    { id: 'brave_paws', label: 'Brave paws', animalHint: 'otter', power: 3, gesture: 'ready' },
    { id: 'guardian_paws', label: 'Guardian paws', animalHint: 'lion cub', power: 4, gesture: 'protective' },
  ],
  feet: [
    { id: 'seed_toes', label: 'Seed toes', animalHint: 'mouse', power: 0, stance: 'shy' },
    { id: 'marshmallow', label: 'Marshmallow feet', animalHint: 'hamster', power: 0, stance: 'squishy' },
    { id: 'puddle_pads', label: 'Puddle pads', animalHint: 'otter', power: 1, stance: 'wobbly' },
    { id: 'bunny_hops', label: 'Bunny hop feet', animalHint: 'rabbit', power: 1, stance: 'bouncy' },
    { id: 'cloud_pads', label: 'Cloud pads', animalHint: 'puppy', power: 2, stance: 'steady' },
    { id: 'moon_pads', label: 'Moon pads', animalHint: 'fox', power: 3, stance: 'nimble' },
    { id: 'star_socks', label: 'Star socks', animalHint: 'kitten', power: 3, stance: 'sparkly' },
    { id: 'hero_boots', label: 'Hero boots', animalHint: 'lion cub', power: 4, stance: 'strong' },
  ],
  eyes: [
    { id: 'sleepy_dots', label: 'Sleepy dot eyes', animalHint: 'hamster', power: 0, expression: 'drowsy' },
    { id: 'shy_beads', label: 'Shy bead eyes', animalHint: 'mouse', power: 0, expression: 'gentle' },
    { id: 'wide_beans', label: 'Wide bean eyes', animalHint: 'puppy', power: 1, expression: 'curious' },
    { id: 'soft_sparkles', label: 'Soft sparkle eyes', animalHint: 'kitten', power: 1, expression: 'sweet' },
    { id: 'crescent', label: 'Crescent eyes', animalHint: 'rabbit', power: 2, expression: 'happy' },
    { id: 'glimmer', label: 'Glimmer eyes', animalHint: 'otter', power: 3, expression: 'awake' },
    { id: 'starry', label: 'Starry eyes', animalHint: 'fox', power: 3, expression: 'radiant' },
    { id: 'guardian_glow', label: 'Guardian glow eyes', animalHint: 'lion cub', power: 4, expression: 'confident' },
  ],
  cheeks: [
    { id: 'faint_blush', label: 'Faint blush cheeks', animalHint: 'hamster', power: 0, mark: 'soft dots' },
    { id: 'peach_dots', label: 'Peach dot cheeks', animalHint: 'mouse', power: 0, mark: 'tiny dots' },
    { id: 'berry_blush', label: 'Berry blush cheeks', animalHint: 'kitten', power: 1, mark: 'round blush' },
    { id: 'freckles', label: 'Freckle cheeks', animalHint: 'puppy', power: 1, mark: 'freckles' },
    { id: 'heart_blush', label: 'Heart blush cheeks', animalHint: 'bunny', power: 2, mark: 'hearts' },
    { id: 'glow_dots', label: 'Glow dot cheeks', animalHint: 'otter', power: 3, mark: 'glow dots' },
    { id: 'star_blush', label: 'Star blush cheeks', animalHint: 'fox', power: 3, mark: 'stars' },
    { id: 'crest_blush', label: 'Crest blush cheeks', animalHint: 'lion cub', power: 4, mark: 'crest' },
  ],
  tufts: [
    { id: 'single_curl', label: 'Single curl tuft', animalHint: 'baby chick', power: 0, placement: 'forehead' },
    { id: 'little_sprig', label: 'Little sprig tuft', animalHint: 'bunny', power: 0, placement: 'forehead' },
    { id: 'cotton_puff', label: 'Cotton puff tuft', animalHint: 'sheep', power: 1, placement: 'crown' },
    { id: 'leaf_cowlick', label: 'Leaf cowlick tuft', animalHint: 'deer', power: 1, placement: 'crown' },
    { id: 'cloud_crest', label: 'Cloud crest tuft', animalHint: 'puppy', power: 2, placement: 'crown' },
    { id: 'moon_curl', label: 'Moon curl tuft', animalHint: 'fox', power: 3, placement: 'crown' },
    { id: 'star_fluff', label: 'Star fluff tuft', animalHint: 'otter', power: 3, placement: 'crown' },
    { id: 'sun_mane', label: 'Sun mane tuft', animalHint: 'lion cub', power: 4, placement: 'crown' },
  ],
  accessories: [
    { id: 'none', label: 'No accessory', animalHint: 'new hatchling', power: 0, slot: 'none' },
    { id: 'tiny_bow', label: 'Tiny bow', animalHint: 'kitten', power: 0, slot: 'neck' },
    { id: 'acorn_bag', label: 'Acorn bag', animalHint: 'squirrel', power: 1, slot: 'side' },
    { id: 'flower_pin', label: 'Flower pin', animalHint: 'bunny', power: 1, slot: 'ear' },
    { id: 'cozy_scarf', label: 'Cozy scarf', animalHint: 'puppy', power: 2, slot: 'neck' },
    { id: 'moon_charm', label: 'Moon charm', animalHint: 'fox', power: 3, slot: 'neck' },
    { id: 'star_bandana', label: 'Star bandana', animalHint: 'otter', power: 3, slot: 'neck' },
    { id: 'guardian_cape', label: 'Guardian cape', animalHint: 'lion cub', power: 4, slot: 'back' },
  ],
});

const PART_KEYS = [
  ['body', 'bodyShapes'],
  ['ears', 'ears'],
  ['arms', 'arms'],
  ['feet', 'feet'],
  ['eyes', 'eyes'],
  ['cheeks', 'cheeks'],
  ['tuft', 'tufts'],
  ['accessory', 'accessories'],
];

const TIER_POWER_RANGES = {
  fragile: { min: 0, max: 1 },
  cozy: { min: 0, max: 2 },
  bright: { min: 1, max: 3 },
  guardian: { min: 3, max: 4 },
};

export function getPetDesign(input = {}) {
  const healthScore = clampScore(input.healthScore);
  const evolutionId = normalizeEvolutionId(input.evolutionId);
  const tier = getPetDesignTier(healthScore, evolutionId);
  const strength = Math.floor((healthScore * 0.8) + EVOLUTION_POWER[evolutionId]);
  const seedKey = [
    input.id ?? '',
    input.name ?? '',
    evolutionId,
    healthScore,
  ].join('|');
  const seed = hashString(seedKey);
  const parts = {};

  for (const [outputKey, databaseKey] of PART_KEYS) {
    parts[outputKey] = selectPart(PET_PART_DATABASE[databaseKey], tier, seed, outputKey);
  }

  return {
    seedKey,
    tier,
    strength,
    healthScore,
    evolutionId,
    parts,
    animalHints: [...new Set(Object.values(parts).map((part) => part.animalHint))],
  };
}

export function getPetDesignTier(healthScore = 0, evolutionId = 'baby') {
  const safeHealthScore = clampScore(healthScore);
  const safeEvolutionId = normalizeEvolutionId(evolutionId);

  if (safeHealthScore < 35) return 'fragile';
  if (safeEvolutionId === 'guardian' && safeHealthScore >= 85) return 'guardian';
  if (safeEvolutionId === 'bright' && safeHealthScore >= 65) return 'bright';
  if (safeEvolutionId === 'guardian' && safeHealthScore >= 65) return 'bright';
  return 'cozy';
}

function selectPart(parts, tier, seed, salt) {
  const { min, max } = TIER_POWER_RANGES[tier];
  const candidates = parts.filter((part) => part.power >= min && part.power <= max);
  const salted = hashString(`${seed}|${salt}`);
  const preferredPower = min + (salted % (max - min + 1));
  const preferred = candidates.filter((part) => part.power === preferredPower);
  const pool = preferred.length > 0 ? preferred : candidates;

  return pool[Math.floor(salted / 7) % pool.length];
}

function normalizeEvolutionId(value) {
  return Object.hasOwn(EVOLUTION_POWER, value) ? value : 'baby';
}

function clampScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(Math.max(Math.round(number), 0), 100);
}

function hashString(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object') return value;
  Object.freeze(value);

  for (const nested of Object.values(value)) {
    deepFreeze(nested);
  }

  return value;
}
