const HEALTH_PRESETS = Object.freeze({
  lazy: Object.freeze({
    id: 'lazy',
    label: 'Lazy day',
    tone: 'cozy',
    message: 'Low movement and short REM make Mochi sleepy and clingy.',
    stats: Object.freeze({
      steps: 1800,
      sleepHours: 5.1,
      remHours: 0.6,
      activeMinutes: 8,
      mindfulMinutes: 2,
      restingHeartRate: 82,
      hrv: 18,
    }),
  }),
  balanced: Object.freeze({
    id: 'balanced',
    label: 'Balanced day',
    tone: 'steady',
    message: 'A decent day keeps Mochi curious and comfortable.',
    stats: Object.freeze({
      steps: 7600,
      sleepHours: 6.8,
      remHours: 1.4,
      activeMinutes: 30,
      mindfulMinutes: 9,
      restingHeartRate: 68,
      hrv: 42,
    }),
  }),
  active: Object.freeze({
    id: 'active',
    label: 'Active day',
    tone: 'sparkly',
    message: 'Movement, sleep, and recovery make Mochi glow with guardian energy.',
    stats: Object.freeze({
      steps: 12400,
      sleepHours: 7.8,
      remHours: 2.1,
      activeMinutes: 52,
      mindfulMinutes: 16,
      restingHeartRate: 58,
      hrv: 66,
    }),
  }),
});

export function getHealthPreset(id) {
  const preset = HEALTH_PRESETS[id] ?? HEALTH_PRESETS.balanced;
  return {
    ...preset,
    stats: { ...preset.stats },
  };
}

export function getHealthPresetOptions() {
  return Object.values(HEALTH_PRESETS).map((preset) => ({
    id: preset.id,
    label: preset.label,
    tone: preset.tone,
  }));
}
