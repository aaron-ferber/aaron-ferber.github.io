import {
  MET_API_BASE,
  applyCareAction,
  createGalleryPet,
  createInitialCareState,
  extractObjectId,
  extractSearchQuery,
  getCareActions,
  getPetEvolution,
  getPetMood,
  normalizeMetObject,
} from './metPetModel.js';
import {
  calculatePetHealth,
  createMetricSettings,
  getDefaultStats,
  getMetricConfigs,
  getPrimaryNudge,
  getPetStages,
} from './healthModel.js';
import {
  getHealthPreset,
  getHealthPresetOptions,
} from './healthPresets.js';
import {
  classifyMotionSample,
  classifyOrientationSample,
  createReactionQueue,
} from './motionInteractions.js';
import {
  getPetDesign,
} from './petDesigns.js';

const STORAGE_KEY = 'mochi-pulse-gallery-v1';
const LEGACY_STORAGE_KEY = 'metagotchi-gallery-v1';
const HEALTH_STORAGE_KEY = 'mochi-pulse-health-v1';
const DEFAULT_OBJECT_ID = 436535;

const fallbackObjects = {
  [DEFAULT_OBJECT_ID]: {
    objectID: DEFAULT_OBJECT_ID,
    title: 'Wheat Field with Cypresses',
    artistDisplayName: 'Vincent van Gogh',
    department: 'European Paintings',
    objectName: 'Painting',
    medium: 'Oil on canvas',
    objectDate: '1889',
    culture: '',
    period: '',
    primaryImageSmall: 'https://images.metmuseum.org/CRDImages/ep/web-large/DT1567.jpg',
    primaryImage: 'https://images.metmuseum.org/CRDImages/ep/original/DT1567.jpg',
    objectURL: 'https://www.metmuseum.org/art/collection/search/436535',
    isHighlight: true,
    isPublicDomain: true,
    GalleryNumber: '822',
    tags: [{ term: 'Landscapes' }, { term: 'Cypresses' }, { term: 'Trees' }],
  },
};

const samplePrompts = [
  { label: 'Cypress', value: String(DEFAULT_OBJECT_ID), type: 'id', icon: '🌿' },
  { label: 'Irises', value: 'irises van gogh', type: 'query', icon: '🌸' },
  { label: 'Moonlight', value: 'moonlight landscape', type: 'query', icon: '🌙' },
  { label: 'Cat', value: 'cat', type: 'query', icon: '🐱' },
  { label: 'Blue vase', value: 'blue vase', type: 'query', icon: '🏺' },
  { label: 'Armor', value: 'armor', type: 'query', icon: '🛡️' },
];

const careActions = getCareActions();
const petStages = getPetStages();
const careButtonMeta = {
  feed: { icon: '❤', reaction: 'feed', message: 'A tiny museum snack perks this pet right up.' },
  play: { icon: '◔', reaction: 'play', message: 'Mochi bounces through the gallery like a rubber ball.' },
  conserve: { icon: '🍃', reaction: 'conserve', message: 'Tiny gloves, gentle brush, guardian sparkle.' },
  study: { icon: '📖', reaction: 'study', message: 'New trait discovered: artwork curiosity unlocked.' },
};
const motionReactionMap = {
  shake: { careAction: 'play', reaction: 'play', message: 'Shake play makes Mochi do a big happy bounce.' },
  flip: { careAction: 'conserve', reaction: 'conserve', message: 'Upside-down time makes Mochi sparkle and reset.' },
  'tilt-left': { careAction: 'study', reaction: 'study', message: 'Mochi leans left and notices a new detail.' },
  'tilt-right': { careAction: 'study', reaction: 'study', message: 'Mochi leans right and studies the room.' },
};
const state = loadGallery();
const healthState = loadHealthState();
const motionQueue = createReactionQueue({ now: 0 });
let reactionTimer;
let motionEnabled = false;
const uiState = {
  activeSampleValue: String(DEFAULT_OBJECT_ID),
  lastSearchQuery: '',
};

const nodes = {
  app: document.querySelector('#app'),
  hatchForm: document.querySelector('#hatch-form'),
  hatchInput: document.querySelector('#hatch-input'),
  hatchButton: document.querySelector('#hatch-button'),
  status: document.querySelector('#status-message'),
  candidateList: document.querySelector('#candidate-list'),
  sampleRow: document.querySelector('#sample-row'),
  device: document.querySelector('#pet-device'),
  petArt: document.querySelector('#pet-art'),
  reactionEffects: document.querySelector('#reaction-effects'),
  petName: document.querySelector('#pet-name'),
  petMood: document.querySelector('#pet-mood'),
  petLore: document.querySelector('#pet-lore'),
  petMessage: document.querySelector('#pet-message'),
  strengthBadge: document.querySelector('#strength-badge'),
  artTitle: document.querySelector('#art-title'),
  artMeta: document.querySelector('#art-meta'),
  artTags: document.querySelector('#art-tags'),
  metLink: document.querySelector('#met-link'),
  careButtons: document.querySelector('#care-buttons'),
  meterList: document.querySelector('#meter-list'),
  gallery: document.querySelector('#gallery'),
  healthForm: document.querySelector('#health-form'),
  healthRing: document.querySelector('#health-ring'),
  healthScore: document.querySelector('#health-score'),
  healthNudge: document.querySelector('#health-nudge'),
  healthScoreCopy: document.querySelector('#health-score-copy'),
  healthStageLegend: document.querySelector('#health-stage-legend'),
  healthMetricCards: document.querySelector('#health-metric-cards'),
  healthPresets: document.querySelector('#health-presets'),
  healthEnabledCount: document.querySelector('#health-enabled-count'),
  healthPicker: document.querySelector('#health-picker'),
  healthValues: document.querySelector('#health-values'),
  motionButton: document.querySelector('#motion-button'),
  tipCopy: document.querySelector('#tip-copy'),
};

renderSamples();
renderCareButtons();
render();
ensureStarterPet();

nodes.hatchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const value = nodes.hatchInput.value.trim();
  if (!value) return;

  await handleHatchInput(value);
});

nodes.healthForm.addEventListener('input', (event) => {
  if (event.target.matches('[data-health-value]')) {
    handleHealthInput(event);
  }
});

nodes.healthForm.addEventListener('change', handleHealthInput);
nodes.motionButton.addEventListener('click', enableMotionPlay);

async function handleHatchInput(value) {
  const objectId = extractObjectId(value);
  if (objectId) {
    setActiveSampleFromValue(String(objectId));
    renderSamples();
    await adoptObject(objectId);
    return;
  }

  const query = extractSearchQuery(value);
  if (!query) {
    setStatus('Paste a Met object link, an object ID, or a searchable artwork phrase.', 'error');
    return;
  }

  await searchObjects(query);
}

async function ensureStarterPet() {
  if (state.activeId) return;
  setStatus('Hatching a soft starter pet from The Met collection...', 'loading');
  await adoptObject(DEFAULT_OBJECT_ID, { silent: true });
}

async function adoptObject(objectId, options = {}) {
  try {
    setBusy(true);
    if (!options.silent) setStatus(`Fetching Met object ${objectId}...`, 'loading');
    if (samplePrompts.some((sample) => sample.value === String(objectId))) {
      setActiveSampleFromValue(String(objectId));
      renderSamples();
    }
    uiState.lastSearchQuery = '';

    const rawObject = await fetchMetObject(objectId);
    const artwork = normalizeMetObject(rawObject);
    const pet = createGalleryPet(artwork);
    const existing = state.petsById[pet.id];

    state.petsById[pet.id] = {
      pet,
      care: existing?.care ?? createInitialCareState(pet.id),
    };

    if (!state.adoptedOrder.includes(pet.id)) {
      state.adoptedOrder.unshift(pet.id);
    }
    state.activeId = pet.id;

    saveGallery();
    render();
    setStatus(`${pet.name} joined the Mochi shelf.`, 'success');
    triggerReaction('hatch', `${pet.name} bounced into the room.`);
    nodes.hatchInput.value = '';
    nodes.candidateList.innerHTML = '';
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    setBusy(false);
  }
}

async function searchObjects(query) {
  try {
    setBusy(true);
    setActiveSampleFromQuery(query);
    uiState.lastSearchQuery = query;
    renderSamples();
    refreshTip();
    setStatus(`Searching The Met for "${query}"...`, 'loading');
    const response = await fetch(`${MET_API_BASE}/search?hasImages=true&q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('The Met search did not respond.');

    const data = await response.json();
    const ids = Array.isArray(data.objectIDs) ? data.objectIDs.slice(0, 6) : [];
    if (!ids.length) {
      nodes.candidateList.innerHTML = '';
      setStatus(`No image-backed Met objects found for "${query}".`, 'error');
      return;
    }

    const candidates = await fetchCandidateObjects(ids);
    renderCandidates(candidates);
    setStatus(`Choose one ${query} object as Mochi's backdrop.`, 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    setBusy(false);
  }
}

async function fetchCandidateObjects(ids) {
  const results = await Promise.allSettled(ids.map((id) => fetchMetObject(id)));

  return results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => normalizeMetObject(result.value))
    .filter((artwork) => artwork.imageUrl)
    .slice(0, 6);
}

async function fetchMetObject(objectId) {
  const fallback = fallbackObjects[objectId];

  try {
    const response = await fetch(`${MET_API_BASE}/objects/${objectId}`);
    if (!response.ok) throw new Error(`Met object ${objectId} was not found.`);

    const data = await response.json();
    if (data.message) throw new Error(data.message);
    return data;
  } catch (error) {
    if (fallback) return fallback;
    throw error;
  }
}

function render() {
  const healthResult = calculatePetHealth(healthState.stats, healthState.settings);
  renderHealth(healthResult);

  const activeEntry = state.petsById[state.activeId];
  nodes.app.dataset.empty = activeEntry ? 'false' : 'true';

  if (!activeEntry) {
    renderEmptyPet(healthResult);
    renderGallery();
    return;
  }

  const { pet, care } = activeEntry;
  const mood = getPetMood(care);
  const evolution = getPetEvolution(care, healthResult.score);
  const design = getPetDesign({
    id: `${pet.id}-${activeEntry.lookSeed ?? 0}`,
    name: pet.name,
    healthScore: healthResult.score,
    evolutionId: evolution.id,
  });

  nodes.device.style.setProperty('--pet-hue', pet.palette.hue);
  nodes.device.style.setProperty('--pet-accent', pet.palette.accent);
  nodes.device.style.setProperty('--pet-shadow', pet.palette.shadow);
  nodes.device.dataset.mood = mood.id;
  nodes.device.dataset.pattern = pet.shellPattern;
  nodes.device.dataset.evolution = evolution.id;
  nodes.device.dataset.designTier = design.tier;
  applyLookDataset(design.parts);

  nodes.petName.textContent = pet.name;
  nodes.petMood.textContent = `${mood.label.toUpperCase()} • ${evolution.label.toUpperCase()}`;
  nodes.petLore.textContent = pet.lore;
  nodes.petMessage.textContent = care.lastMessage || `${evolution.message} ${healthResult.stage.message}`;
  nodes.strengthBadge.textContent = `${healthResult.stage.label} energy • ${design.parts.body.label} • STR ${evolution.strength}`;
  nodes.artTitle.textContent = pet.title;
  nodes.artMeta.textContent = [pet.artist, pet.date, pet.department].filter(Boolean).join(' - ');
  nodes.metLink.href = pet.metUrl;
  nodes.metLink.textContent = 'The Met';

  if (pet.imageUrl) {
    nodes.petArt.hidden = false;
    nodes.petArt.src = pet.imageUrl;
    nodes.petArt.alt = pet.title;
  } else {
    nodes.petArt.hidden = true;
    nodes.petArt.removeAttribute('src');
    nodes.petArt.alt = '';
  }

  renderTags(pet);
  renderMeters(care);
  renderGallery();
  markFavoriteCare(pet.favoriteCare);
  renderTip(healthResult, activeEntry);
}

function renderEmptyPet(healthResult) {
  const emptyCare = createInitialCareState(0);
  const evolution = getPetEvolution(emptyCare, healthResult.score);

  nodes.device.dataset.mood = healthResult.stage.id === 'fragile' ? 'wilting' : 'steady';
  nodes.device.dataset.pattern = 'brush';
  nodes.device.dataset.evolution = evolution.id;
  const design = getPetDesign({
    id: 0,
    name: 'Mochi',
    healthScore: healthResult.score,
    evolutionId: evolution.id,
  });
  nodes.device.dataset.designTier = design.tier;
  applyLookDataset(design.parts);
  nodes.petName.textContent = 'Awaiting hatch';
  nodes.petMood.textContent = `DORMANT • ${evolution.label.toUpperCase()}`;
  nodes.petLore.textContent = 'Choose a Met object to wake the first pet.';
  nodes.petMessage.textContent = 'Pick a Met artwork to bring the gallery to life.';
  nodes.strengthBadge.textContent = `${healthResult.stage.label} energy • STR ${evolution.strength}`;
  nodes.artTitle.textContent = 'No artwork selected';
  nodes.artMeta.textContent = '';
  nodes.artTags.innerHTML = '';
  nodes.petArt.hidden = true;
  nodes.petArt.removeAttribute('src');
  nodes.metLink.removeAttribute('href');
  nodes.metLink.textContent = 'The Met';
  renderMeters(emptyCare);
  renderTip(healthResult);
}

function renderSamples() {
  nodes.sampleRow.innerHTML = samplePrompts
    .map((sample) => `
      <button
        type="button"
        data-sample-type="${sample.type}"
        data-sample-value="${escapeHtml(sample.value)}"
        aria-pressed="${uiState.activeSampleValue === sample.value ? 'true' : 'false'}"
      >
        <span aria-hidden="true">${escapeHtml(sample.icon ?? '✨')}</span>
        <span>${escapeHtml(sample.label)}</span>
      </button>
    `)
    .join('');

  nodes.sampleRow.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', async () => {
      uiState.activeSampleValue = button.dataset.sampleValue;
      renderSamples();
      if (button.dataset.sampleType === 'id') {
        await adoptObject(Number(button.dataset.sampleValue));
      } else {
        await searchObjects(button.dataset.sampleValue);
      }
    });
  });
}

function renderCareButtons() {
  nodes.careButtons.innerHTML = Object.entries(careActions)
    .map(([id, action]) => `
      <button type="button" data-care-action="${id}">
        <span aria-hidden="true">${careButtonMeta[id]?.icon ?? '✨'}</span>
        <span>${escapeHtml(action.label)}</span>
      </button>
    `)
    .join('')
    + '<button type="button" data-resample-look><span aria-hidden="true">🎲</span><span>Resample</span></button>';

  nodes.careButtons.querySelectorAll('[data-care-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const activeEntry = state.petsById[state.activeId];
      if (!activeEntry) return;

      const actionId = button.dataset.careAction;
      activeEntry.care = applyCareAction(activeEntry.care, actionId);
      saveGallery();
      render();
      triggerReaction(careButtonMeta[actionId]?.reaction ?? actionId, careButtonMeta[actionId]?.message ?? activeEntry.care.lastMessage);
    });
  });

  nodes.careButtons.querySelector('[data-resample-look]').addEventListener('click', () => {
    const activeEntry = state.petsById[state.activeId];
    if (!activeEntry) return;

    activeEntry.lookSeed = ((activeEntry.lookSeed ?? 0) + 1) % 997;
    saveGallery();
    render();
    triggerReaction('hatch', 'Mochi tries a fresh tiny form.');
  });
}

function renderCandidates(candidates) {
  if (!candidates.length) {
    nodes.candidateList.innerHTML = '';
    return;
  }

  nodes.candidateList.innerHTML = candidates
    .map((artwork) => `
      <button type="button" class="candidate-card" data-object-id="${artwork.id}">
        <img src="${escapeAttribute(artwork.imageUrl)}" alt="" loading="lazy" />
        <span>
          <strong>${escapeHtml(artwork.title)}</strong>
          <small>${escapeHtml(artwork.artist)}</small>
        </span>
      </button>
    `)
    .join('');

  nodes.candidateList.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => adoptObject(Number(button.dataset.objectId)));
  });
}

function renderHealth(healthResult) {
  const configs = getMetricConfigs(healthState.settings);
  const activeCount = healthResult.activeMetricCount;

  nodes.healthRing.style.setProperty('--score', healthResult.score);
  nodes.healthRing.dataset.stage = healthResult.stage.id;
  nodes.healthScore.textContent = String(healthResult.score);
  nodes.healthNudge.textContent = `${healthResult.stage.message} ${getPrimaryNudge(healthResult)}`;
  nodes.healthEnabledCount.textContent = `${activeCount} active`;

  renderHealthScoreCopy(healthResult, activeCount);
  renderHealthStageLegend(healthResult);
  renderHealthMetricCards(healthResult);
  renderHealthPresets();
  renderHealthPicker(configs);
  renderHealthValues(configs);
}

function renderTip(healthResult, activeEntry) {
  nodes.tipCopy.textContent = buildTipMessage(healthResult, activeEntry);
}

function refreshTip() {
  renderTip(
    calculatePetHealth(healthState.stats, healthState.settings),
    state.petsById[state.activeId],
  );
}

function buildTipMessage(healthResult, activeEntry) {
  if (uiState.lastSearchQuery) {
    return `TIP: Pick one of the ${uiState.lastSearchQuery} results to restyle Mochi's room.`;
  }

  if (activeEntry?.pet) {
    const favoriteCare = careActions[activeEntry.pet.favoriteCare]?.label?.toLowerCase() ?? 'play';
    return `TIP: ${activeEntry.pet.name} responds best to ${favoriteCare} when the gallery feels quiet.`;
  }

  if (healthResult?.weakestMetric) {
    const weakestLabel = healthResult.breakdown[healthResult.weakestMetric]?.label?.toLowerCase() ?? 'health';
    return `TIP: Nudge ${weakestLabel} upward to help Mochi glow a little brighter.`;
  }

  return 'TIP: Pick a new Met object to repaint Mochi\'s gallery mood.';
}

function renderHealthScoreCopy(healthResult, activeCount) {
  if (!activeCount) {
    nodes.healthScoreCopy.textContent = 'Turn on at least one stat to score Mochi. Disabled stats stay out of the total.';
    return;
  }

  const leadCopy = activeCount === 1
    ? '1 enabled stat drives the full score.'
    : `${activeCount} enabled stats share the full score.`;
  const weakestLabel = healthResult.weakestMetric
    ? healthResult.breakdown[healthResult.weakestMetric]?.label
    : '';
  const weakestCopy = weakestLabel ? ` ${weakestLabel} is pulling the score down most right now.` : '';
  nodes.healthScoreCopy.textContent = `${leadCopy} Each card shows its weight share and points.${weakestCopy}`;
}

function renderHealthStageLegend(healthResult) {
  nodes.healthStageLegend.innerHTML = petStages
    .map((stage) => `
      <div class="health-stage-chip" data-active="${stage.id === healthResult.stage.id ? 'true' : 'false'}">
        <strong>${escapeHtml(stage.label)}</strong>
        <small>${escapeHtml(stage.range)}</small>
      </div>
    `)
    .join('');
}

function renderHealthMetricCards(healthResult) {
  const metricEntries = Object.entries(healthResult.breakdown);

  if (!metricEntries.length) {
    nodes.healthMetricCards.innerHTML = '<p class="health-nudge">Turn on at least one stat to see Mochi\'s score breakdown.</p>';
    return;
  }

  nodes.healthMetricCards.innerHTML = metricEntries
    .map(([, metric]) => `
      <article class="health-mini-card ${metric.status === 'watch' ? 'watch' : ''}">
        <div class="health-mini-head">
          <h3>${escapeHtml(metric.label)}</h3>
          <span class="health-contribution">${escapeHtml(formatScoreContribution(metric.contribution))}</span>
        </div>
        <p>${escapeHtml(formatMetricProgress(metric))}</p>
        <strong>${escapeHtml(formatMetricValue(metric.value, metric.unit))}</strong>
        <small>${escapeHtml(`${formatMetricGap(metric)} • ${formatWeightShare(metric)}`)}</small>
        <div class="health-bar" aria-hidden="true"><i style="--progress: ${Math.round(metric.progress * 100)}%"></i></div>
      </article>
    `)
    .join('');
}

function renderHealthPresets() {
  nodes.healthPresets.innerHTML = getHealthPresetOptions()
    .map((preset) => `
      <button
        type="button"
        data-health-preset="${preset.id}"
        data-tone="${preset.tone}"
        aria-pressed="${healthState.lastPreset === preset.id ? 'true' : 'false'}"
      >
        ${escapeHtml(preset.label)}
      </button>
    `)
    .join('');

  nodes.healthPresets.querySelectorAll('[data-health-preset]').forEach((button) => {
    button.addEventListener('click', () => applyHealthPreset(button.dataset.healthPreset));
  });
}

function renderHealthPicker(configs) {
  nodes.healthPicker.innerHTML = Object.entries(configs)
    .map(([key, config]) => `
      <label class="health-option">
        <span class="health-option-main">
          <input
            type="checkbox"
            data-health-enabled="${key}"
            ${config.enabled ? 'checked' : ''}
          />
          <span>
            <strong>${escapeHtml(config.shortLabel)}</strong>
            <small>${escapeHtml(config.category)}</small>
          </span>
        </span>
        <span class="goal-field">
          <input
            type="number"
            min="${config.min}"
            max="${config.max}"
            step="${config.step}"
            value="${escapeAttribute(config.target)}"
            data-health-target="${key}"
            aria-label="${escapeAttribute(`${config.label} goal`)}"
          />
          <small>${config.direction === 'lower' ? 'Goal below' : 'Goal'}</small>
        </span>
      </label>
    `)
    .join('');
}

function renderHealthValues(configs) {
  const activeEntries = Object.entries(configs).filter(([, config]) => config.enabled);

  nodes.healthValues.innerHTML = activeEntries
    .map(([key, config]) => {
      const value = getHealthValue(config);
      return `
        <div class="health-control-row">
          <label for="health-value-${key}">${escapeHtml(config.shortLabel)}</label>
          <output for="health-value-${key}">${escapeHtml(formatMetricValue(value, config.unit))}</output>
          <input
            id="health-value-${key}"
            type="range"
            min="${config.min}"
            max="${config.max}"
            step="${config.step}"
            value="${escapeAttribute(value)}"
            data-health-value="${key}"
          />
        </div>
      `;
    })
    .join('');
}

function handleHealthInput(event) {
  const target = event.target;
  if (!target.matches('[data-health-enabled], [data-health-target], [data-health-value]')) return;

  const configs = getMetricConfigs(healthState.settings);

  if (target.matches('[data-health-enabled]')) {
    const key = target.dataset.healthEnabled;
    healthState.settings[key].enabled = target.checked;
  }

  if (target.matches('[data-health-target]')) {
    const key = target.dataset.healthTarget;
    const config = configs[key];
    if (config) {
      healthState.settings[key].target = clampNumber(Number(target.value), config.min, config.max, config.defaultTarget);
    }
  }

  if (target.matches('[data-health-value]')) {
    const key = target.dataset.healthValue;
    const config = configs[key];
    if (config) {
      healthState.stats[config.sourceKey] = clampNumber(Number(target.value), config.min, config.max, config.defaultValue);
    }
  }

  healthState.lastPreset = 'custom';
  saveHealthState();
  render();
  triggerReaction('health', 'Mochi listens to the new health signal.');
}

function applyHealthPreset(presetId) {
  const preset = getHealthPreset(presetId);
  healthState.stats = {
    ...healthState.stats,
    ...preset.stats,
  };
  healthState.lastPreset = preset.id;
  saveHealthState();
  render();

  const reaction = preset.id === 'active'
    ? 'health-boost'
    : preset.id === 'lazy'
      ? 'sleepy'
      : 'health';
  triggerReaction(reaction, preset.message, 1800);
}

async function enableMotionPlay() {
  if (motionEnabled) {
    triggerReaction('health', 'Motion play is already listening.');
    return;
  }

  try {
    const motionPermission = await requestSensorPermission(window.DeviceMotionEvent);
    const orientationPermission = await requestSensorPermission(window.DeviceOrientationEvent);
    if (motionPermission === 'denied' || orientationPermission === 'denied') {
      setStatus('Motion access was not allowed. Buttons and sliders still work.', 'error');
      return;
    }

    window.addEventListener('devicemotion', handleDeviceMotion);
    window.addEventListener('deviceorientation', handleDeviceOrientation);
    motionEnabled = true;
    nodes.motionButton.textContent = 'Motion play active';
    nodes.motionButton.disabled = true;
    setStatus('Motion play is active: shake, tilt, or flip the phone to play with Mochi.', 'success');
    triggerReaction('play', 'Mochi is ready for shake and tilt play.');
  } catch {
    setStatus('Motion sensors are unavailable in this browser. Buttons and sliders still work.', 'error');
  }
}

async function requestSensorPermission(eventClass) {
  if (!eventClass?.requestPermission) return 'granted';
  return eventClass.requestPermission();
}

function handleDeviceMotion(event) {
  const acceleration = event.accelerationIncludingGravity ?? event.acceleration;
  if (!acceleration) return;

  const reaction = motionQueue.push(classifyMotionSample({
    x: acceleration.x,
    y: acceleration.y,
    z: acceleration.z,
    interval: event.interval,
  }), performance.now());
  applyMotionReaction(reaction);
}

function handleDeviceOrientation(event) {
  const reaction = motionQueue.push(classifyOrientationSample({
    beta: event.beta,
    gamma: event.gamma,
  }), performance.now());
  applyMotionReaction(reaction);
}

function applyMotionReaction(motionReaction) {
  const mapped = motionReactionMap[motionReaction?.action];
  if (!mapped) return;

  const activeEntry = state.petsById[state.activeId];
  if (activeEntry) {
    activeEntry.care = applyCareAction(activeEntry.care, mapped.careAction);
    saveGallery();
    render();
  }
  triggerReaction(mapped.reaction, mapped.message);
}

function triggerReaction(reaction, message, duration = 1200) {
  nodes.device.dataset.reaction = reaction;
  renderReactionEffects(reaction);
  if (message) nodes.petMessage.textContent = message;
  clearTimeout(reactionTimer);
  reactionTimer = setTimeout(() => {
    delete nodes.device.dataset.reaction;
    nodes.reactionEffects.innerHTML = '';
  }, duration);
}

function renderReactionEffects(reaction) {
  const effects = {
    feed: ['🍓', '🍪', '✨', '💗', '🍓'],
    play: ['⚽', '🦋', '♫', '✨', '💫'],
    study: ['🔎', '📚', '💡', '✨', '👀'],
    conserve: ['🧹', '✨', '🏛️', '🌟', '🧤'],
    hatch: ['🌈', '✨', '🖼️', '💫', '🌱'],
    health: ['💓', '✨', '🌿', '💫', '💓'],
    'health-boost': ['🌈', '⭐', '💪', '✨', '🏛️'],
    sleepy: ['💤', '🌙', '🥺', '☁️', '💤'],
  }[reaction] ?? ['✨', '💫', '⭐'];

  nodes.reactionEffects.innerHTML = effects
    .map((effect, index) => `<span style="--i: ${index}">${effect}</span>`)
    .join('');
}

function applyLookDataset(parts) {
  const datasetMap = {
    body: parts.body?.id,
    ears: parts.ears?.id,
    arms: parts.arms?.id,
    feet: parts.feet?.id,
    eyes: parts.eyes?.id,
    cheeks: parts.cheeks?.id,
    tuft: parts.tuft?.id,
    accessory: parts.accessory?.id,
  };

  Object.entries(datasetMap).forEach(([key, value]) => {
    if (value) nodes.device.dataset[key] = value;
  });
}

function renderMeters(care) {
  const meters = [
    ['hunger', 'Fed'],
    ['joy', 'Joy'],
    ['shine', 'Shine'],
    ['curiosity', 'Wonder'],
  ];

  nodes.meterList.innerHTML = meters
    .map(([key, label]) => {
      const value = care[key] ?? 0;
      const emotion = getCareEmotion(key, value);
      return `
        <div class="meter emotion-chip" data-state="${emotion.state}">
          <span class="emotion-face" aria-hidden="true">${emotion.face}</span>
          <span>
            <strong>${label}</strong>
            <small>${emotion.label}</small>
          </span>
        </div>
      `;
    })
    .join('');
}

function getCareEmotion(key, value) {
  if (key === 'hunger') {
    if (value >= 82) return { state: 'happy', face: '😋', label: 'Full' };
    if (value >= 48) return { state: 'curious', face: '😊', label: 'Snacky' };
    return { state: 'hungry', face: '🥺', label: 'Hungry' };
  }
  if (key === 'joy') {
    if (value >= 82) return { state: 'excited', face: '🤩', label: 'Excited' };
    if (value >= 48) return { state: 'happy', face: '😊', label: 'Happy' };
    return { state: 'sleepy', face: '😴', label: 'Low play' };
  }
  if (key === 'shine') {
    if (value >= 82) return { state: 'proud', face: '😎', label: 'Proud' };
    if (value >= 48) return { state: 'inspired', face: '✨', label: 'Glowing' };
    return { state: 'sleepy', face: '😴', label: 'Dusty' };
  }
  if (value >= 82) return { state: 'inspired', face: '✨', label: 'Inspired' };
  if (value >= 48) return { state: 'curious', face: '👀', label: 'Curious' };
  return { state: 'hungry', face: '🥺', label: 'Bored' };
}

function renderTags(pet) {
  const labels = [
    pet.displayType,
    pet.medium,
    pet.galleryNumber ? `Gallery ${pet.galleryNumber}` : '',
    ...pet.tags.slice(0, 3),
  ].filter(Boolean);

  nodes.artTags.innerHTML = labels
    .map((label) => `<span>${escapeHtml(label)}</span>`)
    .join('');
}

function renderGallery() {
  if (!state.adoptedOrder.length) {
    nodes.gallery.innerHTML = '<p class="empty-gallery">No pets yet.</p>';
    return;
  }

  nodes.gallery.innerHTML = state.adoptedOrder
    .map((id) => {
      const entry = state.petsById[id];
      if (!entry) return '';
      const mood = getPetMood(entry.care);
      const selected = state.activeId === id ? 'true' : 'false';

      return `
        <button type="button" class="gallery-card" data-pet-id="${id}" aria-pressed="${selected}">
          ${renderThumbnail(entry.pet.imageUrl)}
          <span>
            <strong>${escapeHtml(entry.pet.name)}</strong>
            <small>${escapeHtml(`${mood.label} • ${entry.pet.department}`)}</small>
          </span>
        </button>
      `;
    })
    .join('');

  nodes.gallery.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeId = Number(button.dataset.petId);
      saveGallery();
      render();
    });
  });
}

function renderThumbnail(imageUrl) {
  if (!imageUrl) return '<span class="thumb-placeholder" aria-hidden="true"></span>';
  return `<img src="${escapeAttribute(imageUrl)}" alt="" loading="lazy" />`;
}

function markFavoriteCare(favoriteCare) {
  nodes.careButtons.querySelectorAll('button').forEach((button) => {
    button.dataset.favorite = button.dataset.careAction === favoriteCare ? 'true' : 'false';
  });
}

function setActiveSampleFromValue(value) {
  const normalized = String(value ?? '');
  uiState.activeSampleValue = samplePrompts.some((sample) => sample.value === normalized)
    ? normalized
    : '';
}

function setActiveSampleFromQuery(query) {
  const normalized = String(query ?? '').trim().toLowerCase();
  const match = samplePrompts.find((sample) => (
    sample.type === 'query'
    && sample.value.toLowerCase() === normalized
  ));

  uiState.activeSampleValue = match?.value ?? '';
}

function loadGallery() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    const saved = JSON.parse(raw);
    if (saved?.petsById && Array.isArray(saved.adoptedOrder)) {
      return {
        activeId: saved.activeId ?? saved.adoptedOrder[0] ?? null,
        petsById: saved.petsById,
        adoptedOrder: saved.adoptedOrder,
      };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    activeId: null,
    petsById: {},
    adoptedOrder: [],
  };
}

function saveGallery() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadHealthState() {
  const defaults = {
    stats: getDefaultStats(),
    settings: createMetricSettings(),
  };

  try {
    const saved = JSON.parse(localStorage.getItem(HEALTH_STORAGE_KEY));
    if (!saved) return defaults;

    return {
      stats: {
        ...defaults.stats,
        ...sanitizeStats(saved.stats),
      },
      settings: createMetricSettings(saved.settings ?? {}),
    };
  } catch {
    localStorage.removeItem(HEALTH_STORAGE_KEY);
    return defaults;
  }
}

function saveHealthState() {
  localStorage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(healthState));
}

function sanitizeStats(stats) {
  return Object.fromEntries(
    Object.entries(stats ?? {}).filter(([, value]) => Number.isFinite(value)),
  );
}

function getHealthValue(config) {
  const value = healthState.stats[config.sourceKey];
  return Number.isFinite(value) ? value : config.defaultValue;
}

function formatGoal(metric) {
  const comparison = metric.direction === 'lower' ? 'Goal below' : 'Goal';
  return `${comparison} ${formatMetricValue(metric.target, metric.unit)}`;
}

function formatMetricProgress(metric) {
  return `${formatGoal(metric)} • ${Math.round(metric.progress * 100)}% there`;
}

function formatMetricGap(metric) {
  if (metric.progress >= 1) return 'Goal met';

  const gap = metric.direction === 'lower'
    ? Math.max(metric.value - metric.target, 0)
    : Math.max(metric.target - metric.value, 0);
  const label = metric.direction === 'lower' ? 'above goal' : 'short of goal';
  return `${formatMetricValue(gap, metric.unit)} ${label}`;
}

function formatWeightShare(metric) {
  return `${formatPercent(metric.weightShare * 100)} weight share`;
}

function formatScoreContribution(contribution) {
  return `+${formatMetricValue(Math.round(contribution * 10) / 10)} pts`;
}

function formatMetricValue(value, unit = '') {
  const options = Number.isInteger(value)
    ? { maximumFractionDigits: 0 }
    : { maximumFractionDigits: 1 };
  const formatted = new Intl.NumberFormat('en-US', options).format(value);
  return unit ? `${formatted}${unit}` : formatted;
}

function formatPercent(value) {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)}%`;
}

function clampNumber(value, min, max, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

function setBusy(isBusy) {
  nodes.hatchButton.disabled = isBusy;
  nodes.hatchInput.disabled = isBusy;
  nodes.sampleRow.querySelectorAll('button').forEach((button) => {
    button.disabled = isBusy;
  });
}

function setStatus(message, tone = 'neutral') {
  nodes.status.textContent = message;
  nodes.status.dataset.tone = tone;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('`', '&#096;');
}
