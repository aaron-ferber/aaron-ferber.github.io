const METRIC_LIBRARY = {
  steps: {
    label: 'Steps',
    shortLabel: 'Steps',
    sourceKey: 'steps',
    category: 'Activity',
    unit: '',
    defaultTarget: 10000,
    defaultValue: 7200,
    min: 0,
    max: 18000,
    step: 100,
    weight: 0.22,
    direction: 'higher',
    defaultEnabled: true,
    nudge: 'Take a short walk and see whether your pet perks up after more steps.',
  },
  sleep: {
    label: 'Sleep duration',
    shortLabel: 'Sleep',
    sourceKey: 'sleepHours',
    category: 'Sleep',
    unit: 'h',
    defaultTarget: 7,
    defaultValue: 6.6,
    min: 0,
    max: 11,
    step: 0.1,
    weight: 0.22,
    direction: 'higher',
    defaultEnabled: true,
    nudge: 'Protect a little more sleep time and compare how your pet looks tomorrow.',
  },
  rem: {
    label: 'REM sleep',
    shortLabel: 'REM',
    sourceKey: 'remHours',
    category: 'Sleep',
    unit: 'h',
    defaultTarget: 1.8,
    defaultValue: 1.4,
    min: 0,
    max: 3.5,
    step: 0.1,
    weight: 0.18,
    direction: 'higher',
    defaultEnabled: true,
    nudge: 'Try a calmer wind-down tonight and compare tomorrow’s REM trend.',
  },
  active: {
    label: 'Active minutes',
    shortLabel: 'Active',
    sourceKey: 'activeMinutes',
    category: 'Activity',
    unit: 'm',
    defaultTarget: 30,
    defaultValue: 30,
    min: 0,
    max: 120,
    step: 1,
    weight: 0.25,
    direction: 'higher',
    defaultEnabled: true,
    nudge: 'Add a few active minutes with something gentle and repeatable.',
  },
  mindful: {
    label: 'Mindful minutes',
    shortLabel: 'Mindful',
    sourceKey: 'mindfulMinutes',
    category: 'Mindfulness',
    unit: 'm',
    defaultTarget: 10,
    defaultValue: 8,
    min: 0,
    max: 40,
    step: 1,
    weight: 0.13,
    direction: 'higher',
    defaultEnabled: true,
    nudge: 'Give your pet a quiet reset with a few mindful minutes.',
  },
  restingHeartRate: {
    label: 'Resting heart rate',
    shortLabel: 'Resting HR',
    sourceKey: 'restingHeartRate',
    category: 'Vitals',
    unit: 'bpm',
    defaultTarget: 62,
    defaultValue: 68,
    min: 45,
    max: 105,
    step: 1,
    weight: 0.16,
    direction: 'lower',
    defaultEnabled: false,
    nudge: 'Check whether stress, illness, caffeine, or recovery may be affecting your resting heart rate.',
  },
  hrv: {
    label: 'Heart rate variability',
    shortLabel: 'HRV',
    sourceKey: 'hrv',
    category: 'Vitals',
    unit: 'ms',
    defaultTarget: 50,
    defaultValue: 42,
    min: 10,
    max: 120,
    step: 1,
    weight: 0.16,
    direction: 'higher',
    defaultEnabled: false,
    nudge: 'Treat HRV as a personal trend and look for recovery patterns, not a one-day grade.',
  },
};

const PET_STAGES = [
  {
    id: 'fragile',
    label: 'Fragile',
    mood: 'needs care',
    range: '0-34',
    message: 'Your pet is asking you to check today’s recovery signals.',
  },
  {
    id: 'tired',
    label: 'Tired',
    mood: 'low battery',
    range: '35-54',
    message: 'Your pet can recover with one small health-supporting choice.',
  },
  {
    id: 'steady',
    label: 'Steady',
    mood: 'okay',
    range: '55-81',
    message: 'Your pet is stable, with a little room to feel brighter.',
  },
  {
    id: 'thriving',
    label: 'Thriving',
    mood: 'sparkly',
    range: '82-100',
    message: 'Your pet is glowing because today’s signals look balanced.',
  },
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function calculatePetHealth(stats, metricSettings = createMetricSettings()) {
  const activeConfigs = getEnabledMetricConfigs(metricSettings);
  const totalWeight = activeConfigs.reduce((total, [, config]) => total + config.weight, 0) || 1;
  const breakdown = {};

  activeConfigs.forEach(([key, config]) => {
    const normalizedWeight = config.weight / totalWeight;
    breakdown[key] = scoreMetric(stats[config.sourceKey], config, normalizedWeight);
  });

  const rawScore = Math.floor(
    Object.values(breakdown).reduce((total, metric) => total + metric.contribution, 0),
  );
  const score = applyRecoveryCaps(rawScore, breakdown);

  return {
    score,
    stage: getPetStage(score),
    breakdown,
    weakestMetric: choosePriorityMetric(breakdown),
  };
}

export function createMetricSettings(overrides = {}) {
  return Object.fromEntries(
    Object.entries(METRIC_LIBRARY).map(([key, config]) => {
      const override = overrides[key] ?? {};

      return [
        key,
        {
          enabled: override.enabled ?? config.defaultEnabled,
          target: Number.isFinite(override.target) ? override.target : config.defaultTarget,
        },
      ];
    }),
  );
}

export function getDefaultStats() {
  return Object.fromEntries(
    Object.values(METRIC_LIBRARY).map((config) => [config.sourceKey, config.defaultValue]),
  );
}

export function getPetStage(score) {
  const safeScore = clamp(Math.round(score), 0, 100);

  if (safeScore >= 82) return PET_STAGES[3];
  if (safeScore >= 55) return PET_STAGES[2];
  if (safeScore >= 35) return PET_STAGES[1];
  return PET_STAGES[0];
}

export function getPrimaryNudge(result) {
  const metric = METRIC_LIBRARY[result.weakestMetric];
  return metric?.nudge ?? 'Check the metric that changed most today.';
}

export function getMetricConfigs(metricSettings = createMetricSettings()) {
  return Object.fromEntries(
    Object.entries(METRIC_LIBRARY).map(([key, config]) => [
      key,
      {
        ...structuredClone(config),
        enabled: metricSettings[key]?.enabled ?? config.defaultEnabled,
        target: metricSettings[key]?.target ?? config.defaultTarget,
      },
    ]),
  );
}

function scoreMetric(value, config, normalizedWeight) {
  const safeValue = Number.isFinite(value) ? Math.max(value, 0) : 0;
  const target = Math.max(config.target, Number.EPSILON);
  const progress =
    config.direction === 'lower'
      ? safeValue > 0
        ? clamp(target / safeValue, 0, 1)
        : 0
      : clamp(safeValue / target, 0, 1);

  return {
    label: config.label,
    value: safeValue,
    unit: config.unit,
    target: config.target,
    score: Math.round(progress * 100),
    contribution: progress * normalizedWeight * 100,
    status: progress >= 1 ? 'met' : 'watch',
    progress,
    direction: config.direction,
  };
}

function getEnabledMetricConfigs(metricSettings) {
  return Object.entries(METRIC_LIBRARY)
    .filter(([key]) => metricSettings[key]?.enabled)
    .map(([key, config]) => [
      key,
      {
        ...config,
        target: metricSettings[key]?.target ?? config.defaultTarget,
      },
    ]);
}

function choosePriorityMetric(breakdown) {
  const entries = Object.entries(breakdown);
  if (entries.length === 0) return undefined;

  if (breakdown.rem?.value < 1.2) return 'rem';
  if (breakdown.sleep?.value < 6) return 'sleep';
  if (breakdown.steps?.value < 5000) return 'steps';
  if (breakdown.active?.value < 20) return 'active';
  if (breakdown.mindful?.value < 8) return 'mindful';

  return entries.sort(([, a], [, b]) => a.progress - b.progress)[0][0];
}

function applyRecoveryCaps(score, breakdown) {
  if (breakdown.rem?.value < 0.9 && breakdown.steps?.value < 3000 && breakdown.active?.value < 20) {
    return Math.min(score, 30);
  }

  if (breakdown.rem?.value < 0.9) return Math.min(score, 50);
  if (breakdown.rem?.value < 1.2) return Math.min(score, 54);
  if (breakdown.sleep?.value < 5.5) return Math.min(score, 54);
  if (breakdown.steps?.value < 2500) return Math.min(score, 48);

  return score;
}
