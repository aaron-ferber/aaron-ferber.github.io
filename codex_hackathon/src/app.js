import {
  MET_API_BASE,
  applyCareAction,
  createGalleryPet,
  createInitialCareState,
  extractObjectId,
  extractSearchQuery,
  getCareActions,
  getPetMood,
  normalizeMetObject,
} from './metPetModel.js';

const STORAGE_KEY = 'metagotchi-gallery-v1';
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
  { label: 'Cypress', value: String(DEFAULT_OBJECT_ID), type: 'id' },
  { label: 'Cat', value: 'cat', type: 'query' },
  { label: 'Armor', value: 'armor', type: 'query' },
  { label: 'Blue vase', value: 'blue vase', type: 'query' },
];

const careActions = getCareActions();
const state = loadGallery();

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
  petName: document.querySelector('#pet-name'),
  petMood: document.querySelector('#pet-mood'),
  petLore: document.querySelector('#pet-lore'),
  petMessage: document.querySelector('#pet-message'),
  artTitle: document.querySelector('#art-title'),
  artMeta: document.querySelector('#art-meta'),
  artTags: document.querySelector('#art-tags'),
  metLink: document.querySelector('#met-link'),
  careButtons: document.querySelector('#care-buttons'),
  meterList: document.querySelector('#meter-list'),
  gallery: document.querySelector('#gallery'),
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

async function handleHatchInput(value) {
  const objectId = extractObjectId(value);
  if (objectId) {
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
  setStatus('Hatching a gallery pet from The Met collection...', 'loading');
  await adoptObject(DEFAULT_OBJECT_ID, { silent: true });
}

async function adoptObject(objectId, options = {}) {
  try {
    setBusy(true);
    if (!options.silent) setStatus(`Fetching Met object ${objectId}...`, 'loading');

    const rawObject = await fetchMetObject(objectId);
    const artwork = normalizeMetObject(rawObject);
    const pet = createGalleryPet(artwork);
    const existing = state.petsById[pet.id];

    state.petsById[pet.id] = {
      pet,
      care: existing && existing.care ? existing.care : createInitialCareState(pet.id),
    };

    if (!state.adoptedOrder.includes(pet.id)) {
      state.adoptedOrder.unshift(pet.id);
    }
    state.activeId = pet.id;

    saveGallery();
    render();
    setStatus(`${pet.name} joined the gallery.`, 'success');
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
    setStatus(`Choose one ${query} object to hatch.`, 'success');
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
  const activeEntry = state.petsById[state.activeId];
  nodes.app.dataset.empty = activeEntry ? 'false' : 'true';

  if (!activeEntry) {
    renderEmptyPet();
    renderGallery();
    return;
  }

  const { pet, care } = activeEntry;
  const mood = getPetMood(care);

  nodes.device.style.setProperty('--pet-hue', pet.palette.hue);
  nodes.device.style.setProperty('--pet-accent', pet.palette.accent);
  nodes.device.style.setProperty('--pet-shadow', pet.palette.shadow);
  nodes.device.dataset.mood = mood.id;
  nodes.device.dataset.pattern = pet.shellPattern;

  nodes.petName.textContent = pet.name;
  nodes.petMood.textContent = mood.label;
  nodes.petLore.textContent = pet.lore;
  nodes.petMessage.textContent = care.lastMessage || mood.message;
  nodes.artTitle.textContent = pet.title;
  nodes.artMeta.textContent = [pet.artist, pet.date, pet.department].filter(Boolean).join(' · ');
  nodes.metLink.href = pet.metUrl;
  nodes.metLink.textContent = `Met object ${pet.artworkId}`;

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
}

function renderEmptyPet() {
  nodes.petName.textContent = 'Awaiting hatch';
  nodes.petMood.textContent = 'Dormant';
  nodes.petLore.textContent = 'Choose a Met object to wake the first pet.';
  nodes.petMessage.textContent = 'The gallery shelf is empty.';
  nodes.artTitle.textContent = 'No artwork selected';
  nodes.artMeta.textContent = '';
  nodes.artTags.innerHTML = '';
  nodes.petArt.hidden = true;
  nodes.petArt.removeAttribute('src');
  nodes.metLink.removeAttribute('href');
  nodes.metLink.textContent = 'The Met';
  renderMeters(createInitialCareState(0));
}

function renderSamples() {
  nodes.sampleRow.innerHTML = samplePrompts
    .map((sample) => `
      <button type="button" data-sample-type="${sample.type}" data-sample-value="${escapeHtml(sample.value)}">
        ${escapeHtml(sample.label)}
      </button>
    `)
    .join('');

  nodes.sampleRow.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', async () => {
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
        <span>${escapeHtml(action.label)}</span>
      </button>
    `)
    .join('');

  nodes.careButtons.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      const activeEntry = state.petsById[state.activeId];
      if (!activeEntry) return;

      activeEntry.care = applyCareAction(activeEntry.care, button.dataset.careAction);
      saveGallery();
      render();
    });
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

function renderMeters(care) {
  const meters = [
    ['hunger', 'Fed'],
    ['joy', 'Joy'],
    ['shine', 'Shine'],
    ['curiosity', 'Wonder'],
  ];

  nodes.meterList.innerHTML = meters
    .map(([key, label]) => {
      const value = typeof care[key] === 'number' ? care[key] : 0;
      return `
        <div class="meter">
          <span>${label}</span>
          <div class="meter-track" aria-hidden="true"><i style="width: ${value}%"></i></div>
          <output>${Math.round(value)}</output>
        </div>
      `;
    })
    .join('');
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
            <small>${escapeHtml(mood.label)} · ${escapeHtml(entry.pet.department)}</small>
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

function loadGallery() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.petsById && Array.isArray(saved.adoptedOrder)) {
      return {
        activeId: saved.activeId != null ? saved.activeId : (saved.adoptedOrder[0] || null),
        petsById: saved.petsById,
        adoptedOrder: saved.adoptedOrder,
      };
    }
  } catch (error) {
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

function setBusy(isBusy) {
  nodes.hatchButton.disabled = isBusy;
  nodes.hatchInput.disabled = isBusy;
}

function setStatus(message, tone = 'neutral') {
  nodes.status.textContent = message;
  nodes.status.dataset.tone = tone;
}

function escapeHtml(value) {
  return String(value)
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;')
    .split("'").join('&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value).split('`').join('&#096;');
}
