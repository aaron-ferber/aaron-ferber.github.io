import { EXAMPLE_CARTRIDGES } from "./examples.js";
import { parseCartridgeInput } from "./payloads.js";

const dbName = "cartridge-player";
const storeName = "cartridges";

const input = document.querySelector("#cartridgeInput");
const fileInput = document.querySelector("#fileInput");
const frame = document.querySelector("#frame");
const shelf = document.querySelector("#shelf");
const status = document.querySelector("#status");
const currentName = document.querySelector("#currentName");
const examples = document.querySelector("#examples");
const scanButton = document.querySelector("#scanButton");
const stopScanButton = document.querySelector("#stopScanButton");
const scannerPanel = document.querySelector("#scannerPanel");
const scannerVideo = document.querySelector("#scannerVideo");
const scannerCanvas = document.querySelector("#scannerCanvas");
const scannerStatus = document.querySelector("#scannerStatus");

let activePayload = "";
let activeTitle = "";
let scannerStream = null;
let scannerFrame = 0;

const sampleCartridge = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; }
    body {
      align-items: center;
      background: #101828;
      color: #f8fafc;
      display: flex;
      font-family: system-ui, sans-serif;
      justify-content: center;
      margin: 0;
      min-height: 100vh;
      padding: 20px;
    }
    main {
      border: 1px solid #334155;
      border-radius: 8px;
      max-width: 460px;
      padding: 24px;
      text-align: center;
    }
    button {
      background: #38bdf8;
      border: 0;
      border-radius: 7px;
      color: #082f49;
      font: inherit;
      font-weight: 800;
      margin-top: 18px;
      padding: 10px 14px;
    }
  </style>
</head>
<body>
  <main>
    <h1>Local cartridge</h1>
    <p>This payload is running from iframe srcdoc. It did not call a server.</p>
    <button onclick="parent.postMessage({type:'cartridge-result', text:'sample complete'}, '*')">Send result</button>
  </main>
</body>
</html>`;

function toast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.append(node);
  window.setTimeout(() => node.remove(), 2200);
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("cartridge-player", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: "id" });
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore(mode, callback) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = callback(store);
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

function getAllCartridges() {
  return new Promise(async (resolve, reject) => {
    try {
      await withStore("readonly", (store) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      reject(error);
    }
  });
}

async function putCartridge(record) {
  await withStore("readwrite", (store) => store.put(record));
}

async function clearCartridges() {
  await withStore("readwrite", (store) => store.clear());
}

function decodePayload(raw) {
  return parseCartridgeInput(raw).payload;
}

function titleFromPayload(payload) {
  const match = payload.match(/<title>(.*?)<\/title>/i);
  if (match && match[1] && match[1].trim()) return match[1].trim().slice(0, 80);
  const heading = payload.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (heading && heading[1] && heading[1].trim())
    return heading[1]
      .replace(/<[^>]+>/g, "")
      .trim()
      .slice(0, 80);
  return `Cartridge ${new Date().toLocaleString()}`;
}

function slugFromTitle(title) {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function runPayload(raw, title = "") {
  const { payload } = parseCartridgeInput(raw);
  if (!payload) {
    toast("Paste or choose a cartridge first.");
    return;
  }
  activePayload = payload;
  activeTitle = title || titleFromPayload(payload);
  currentName.textContent = activeTitle;
  frame.setAttribute("sandbox", "allow-scripts allow-forms allow-modals");
  frame.srcdoc = payload;
}

async function loadExamplePayload(example) {
  if (example.payload) return example.payload;
  if (!example.payloadPath) return "";
  const response = await fetch(example.payloadPath);
  if (!response.ok) {
    throw new Error(`Could not load ${example.title}`);
  }
  return response.text();
}

function parseDeckParam(value) {
  if (!value) return null;
  try {
    const trimmed = value.trim();
    const json = trimmed.startsWith("[")
      ? trimmed
      : new TextDecoder().decode(
          Uint8Array.from(
            atob(
              trimmed
                .replace(/-/g, "+")
                .replace(/_/g, "/")
                .padEnd(
                  trimmed.length + ((4 - (trimmed.length % 4)) % 4),
                  "=",
                ),
            ),
            (char) => char.charCodeAt(0),
          ),
        );
    const deck = JSON.parse(json);
    return Array.isArray(deck) ? deck : null;
  } catch (error) {
    return null;
  }
}

function escapeScriptJson(value) {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (char) => {
    const replacements = {
      "<": "\\u003c",
      ">": "\\u003e",
      "&": "\\u0026",
      "\u2028": "\\u2028",
      "\u2029": "\\u2029",
    };
    return replacements[char];
  });
}

function injectSwipeDeckItems(payload, deck) {
  const injection = `<script>window.__cartridgeSwipeDeckItems=${escapeScriptJson(deck)};</script>`;
  const marker = "<script>\n    const defaultDeck";
  if (payload.includes(marker)) {
    return payload.replace(marker, `${injection}\n  ${marker}`);
  }
  if (payload.includes("</head>")) {
    return payload.replace("</head>", `${injection}\n</head>`);
  }
  return `${injection}\n${payload}`;
}

function applyDirectExampleParams(payload, example, params) {
  if (slugFromTitle(example.title) !== "swipe-decks") return payload;
  const deckParam = params.get("deck");
  if (!deckParam) return payload;
  const deck = parseDeckParam(deckParam);
  if (!deck) {
    toast("Could not read swipe deck.");
    return payload;
  }
  return injectSwipeDeckItems(payload, deck);
}

async function loadDirectExample() {
  const params = new URLSearchParams(location.search);
  const requestedSlug = slugFromTitle(params.get("example") || params.get("game") || "");
  if (!requestedSlug) return false;

  const example = EXAMPLE_CARTRIDGES.find(
    (candidate) => slugFromTitle(candidate.title) === requestedSlug,
  );
  if (!example) {
    toast("Example not found.");
    return false;
  }

  try {
    const payload = applyDirectExampleParams(
      await loadExamplePayload(example),
      example,
      params,
    );
    input.value = payload;
    runPayload(payload, example.title);
    return true;
  } catch (error) {
    toast("Could not load example.");
    return false;
  }
}

async function saveActive() {
  const payload = activePayload || decodePayload(input.value);
  if (!payload) {
    toast("Run or paste a cartridge before saving.");
    return;
  }
  const title = activeTitle || titleFromPayload(payload);
  await putCartridge({
    id: crypto.randomUUID(),
    title,
    payload,
    savedAt: Date.now(),
  });
  await renderShelf();
  toast("Saved locally.");
}

async function renderShelf() {
  const records = (await getAllCartridges()).sort(
    (a, b) => b.savedAt - a.savedAt,
  );
  shelf.replaceChildren();
  if (!records.length) {
    const empty = document.createElement("div");
    empty.className = "shelf-empty";
    empty.textContent = "No saved cartridges yet.";
    shelf.append(empty);
    return;
  }
  for (const record of records) {
    const item = document.createElement("div");
    item.className = "shelf-item";

    const copy = document.createElement("div");
    const name = document.createElement("div");
    name.className = "shelf-name";
    name.textContent = record.title;
    const meta = document.createElement("div");
    meta.className = "shelf-meta";
    meta.textContent = new Date(record.savedAt).toLocaleString();
    copy.append(name, meta);

    const run = document.createElement("button");
    run.type = "button";
    run.textContent = "Run";
    run.addEventListener("click", () =>
      runPayload(record.payload, record.title),
    );

    item.append(copy, run);
    shelf.append(item);
  }
}

function renderExamples() {
  examples.replaceChildren();
  for (const example of EXAMPLE_CARTRIDGES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "example-button";
    button.innerHTML = `<span>${example.title}</span><small>${example.tagline}</small>`;
    button.addEventListener("click", async () => {
      try {
        const payload = await loadExamplePayload(example);
        input.value = payload;
        runPayload(payload, example.title);
      } catch (error) {
        toast("Could not load example.");
      }
    });
    examples.append(button);
  }
}

async function copyActive() {
  const payload = activePayload || decodePayload(input.value);
  if (!payload) {
    toast("Nothing to copy.");
    return;
  }
  await navigator.clipboard.writeText(payload);
  toast("Copied.");
}

function downloadActive() {
  const payload = activePayload || decodePayload(input.value);
  if (!payload) {
    toast("Nothing to download.");
    return;
  }
  const blob = new Blob([payload], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${(activeTitle || "cartridge").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function loadHashPayload() {
  if (!location.hash.startsWith("#cart=")) return false;
  try {
    const { payload } = parseCartridgeInput(location.hash);
    input.value = payload;
    runPayload(payload);
    return true;
  } catch (error) {
    toast("Could not read cartridge from URL.");
    return false;
  }
}

function stopScanner() {
  if (scannerFrame) {
    cancelAnimationFrame(scannerFrame);
    scannerFrame = 0;
  }
  if (scannerStream) {
    for (const track of scannerStream.getTracks()) {
      track.stop();
    }
    scannerStream = null;
  }
  scannerVideo.srcObject = null;
  scannerPanel.hidden = true;
}

function scanVideoFrame() {
  if (!scannerStream) return;
  if (scannerVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    const width = scannerVideo.videoWidth;
    const height = scannerVideo.videoHeight;
    if (width && height) {
      scannerCanvas.width = width;
      scannerCanvas.height = height;
      const context = scannerCanvas.getContext("2d", {
        willReadFrequently: true,
      });
      context.drawImage(scannerVideo, 0, 0, width, height);
      const imageData = context.getImageData(0, 0, width, height);
      const result = window.jsQR(imageData.data, width, height, {
        inversionAttempts: "dontInvert",
      });
      if (result && result.data) {
        input.value = result.data;
        runPayload(result.data);
        stopScanner();
        toast("Scanned cartridge. Save it to keep it.");
        return;
      }
    }
  }
  scannerFrame = requestAnimationFrame(scanVideoFrame);
}

async function startScanner() {
  if (!window.jsQR) {
    toast("QR scanner is unavailable.");
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    toast("Camera access is unavailable here.");
    return;
  }
  stopScanner();
  scannerPanel.hidden = false;
  scannerStatus.textContent = "Point the camera at a cartridge QR.";
  try {
    scannerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    scannerVideo.srcObject = scannerStream;
    await scannerVideo.play();
    scanVideoFrame();
  } catch (error) {
    stopScanner();
    toast("Camera permission was not available.");
  }
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    status.textContent = "no service worker";
    status.className = "status warn";
    return;
  }
  try {
    await navigator.serviceWorker.register("./sw.js", { scope: "./" });
    await navigator.serviceWorker.ready;
    status.textContent = navigator.onLine ? "offline ready" : "offline";
    status.className = "status ready";
  } catch (error) {
    status.textContent = "cache unavailable";
    status.className = "status warn";
  }
}

document
  .querySelector("#runButton")
  .addEventListener("click", () => runPayload(input.value));
document.querySelector("#saveButton").addEventListener("click", saveActive);
scanButton.addEventListener("click", startScanner);
stopScanButton.addEventListener("click", stopScanner);
document.querySelector("#sampleButton").addEventListener("click", () => {
  input.value = sampleCartridge;
  runPayload(sampleCartridge, "Sample cartridge");
});
document.querySelector("#copyButton").addEventListener("click", copyActive);
document
  .querySelector("#downloadButton")
  .addEventListener("click", downloadActive);
document.querySelector("#clearButton").addEventListener("click", async () => {
  await clearCartridges();
  await renderShelf();
  toast("Shelf cleared.");
});
fileInput.addEventListener("change", async () => {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
  const payload = await file.text();
  input.value = payload;
  runPayload(payload, file.name.replace(/\.[^.]+$/, ""));
});
window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "cartridge-result") {
    toast(String(event.data.text || "Result received."));
  }
});
window.addEventListener("online", () => {
  status.textContent = "offline ready";
  status.className = "status ready";
});
window.addEventListener("offline", () => {
  status.textContent = "offline";
  status.className = "status ready";
});

async function start() {
  registerServiceWorker();
  renderExamples();
  await renderShelf();
  if (await loadHashPayload()) return;
  await loadDirectExample();
}

start();
