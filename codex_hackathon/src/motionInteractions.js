const GRAVITY = 9.8;
const SHAKE_THRESHOLD = 11;
const HARD_SHAKE_THRESHOLD = 20;
const TILT_THRESHOLD = 24;
const FLIP_BETA_THRESHOLD = 150;

const COOLDOWNS = {
  shake: 900,
  'tilt-left': 450,
  'tilt-right': 450,
  flip: 1200,
  calm: 250,
};

function toNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function makeReaction(action, options = {}) {
  return {
    action,
    intensity: options.intensity ?? 'medium',
    source: options.source ?? 'system',
    cooldownMs: options.cooldownMs ?? COOLDOWNS[action] ?? 500,
    score: Math.round((options.score ?? 0) * 10) / 10,
    reason: options.reason ?? action,
  };
}

export function classifyMotionSample(sample = {}) {
  const x = toNumber(sample.x);
  const y = toNumber(sample.y);
  const z = toNumber(sample.z);
  const interval = Math.max(toNumber(sample.interval, 100), 16);
  const magnitude = Math.hypot(x, y, z);
  const shakeScore = Math.abs(magnitude - GRAVITY) * Math.min(1.5, 100 / interval);

  if (shakeScore >= SHAKE_THRESHOLD) {
    return makeReaction('shake', {
      intensity: shakeScore >= HARD_SHAKE_THRESHOLD ? 'high' : 'medium',
      source: 'motion',
      score: shakeScore,
    });
  }

  return makeReaction('calm', {
    intensity: 'low',
    source: 'motion',
    score: shakeScore,
    reason: 'idle',
  });
}

export function classifyOrientationSample(sample = {}) {
  const beta = toNumber(sample.beta);
  const gamma = toNumber(sample.gamma);
  const absBeta = Math.abs(beta);
  const absGamma = Math.abs(gamma);

  if (absBeta >= FLIP_BETA_THRESHOLD) {
    return makeReaction('flip', {
      intensity: 'high',
      source: 'orientation',
      score: absBeta,
    });
  }

  if (gamma <= -TILT_THRESHOLD) {
    return makeReaction('tilt-left', {
      intensity: absGamma >= 40 ? 'high' : 'medium',
      source: 'orientation',
      score: absGamma,
    });
  }

  if (gamma >= TILT_THRESHOLD) {
    return makeReaction('tilt-right', {
      intensity: absGamma >= 40 ? 'high' : 'medium',
      source: 'orientation',
      score: absGamma,
    });
  }

  return makeReaction('calm', {
    intensity: 'low',
    source: 'orientation',
    score: Math.max(absBeta, absGamma),
    reason: 'idle',
  });
}

export function createReactionQueue(options = {}) {
  const reactions = [];
  const lastAcceptedAt = new Map();
  let lastNow = toNumber(options.now, 0);

  return {
    push(reaction, now = lastNow) {
      lastNow = toNumber(now, lastNow);

      if (!reaction || reaction.action === 'calm') {
        return reaction ?? makeReaction('calm', { intensity: 'low', reason: 'idle' });
      }

      const lastAt = lastAcceptedAt.get(reaction.action);
      const cooldownMs = toNumber(reaction.cooldownMs, COOLDOWNS[reaction.action] ?? 500);

      if (Number.isFinite(lastAt) && lastNow - lastAt < cooldownMs) {
        return makeReaction('calm', {
          intensity: 'low',
          source: reaction.source,
          cooldownMs: COOLDOWNS.calm,
          reason: 'cooldown',
        });
      }

      lastAcceptedAt.set(reaction.action, lastNow);
      reactions.push({ ...reaction, acceptedAt: lastNow });
      return reaction;
    },
    next() {
      return reactions.shift() ?? makeReaction('calm', { intensity: 'low', reason: 'empty' });
    },
    size() {
      return reactions.length;
    },
  };
}

export function nextReaction(queue) {
  return queue?.next?.() ?? makeReaction('calm', { intensity: 'low', reason: 'missing-queue' });
}
