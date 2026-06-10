const dbName = "cartridge-player";
const storeName = "cartridges";

const input = document.querySelector("#cartridgeInput");
const fileInput = document.querySelector("#fileInput");
const frame = document.querySelector("#frame");
const shelf = document.querySelector("#shelf");
const status = document.querySelector("#status");
const currentName = document.querySelector("#currentName");

let activePayload = "";
let activeTitle = "";

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
  const value = raw.trim();
  if (!value) return "";
  if (/^data:text\/html/i.test(value)) {
    const comma = value.indexOf(",");
    return comma > -1 ? decodeURIComponent(value.slice(comma + 1)) : value;
  }
  if (/^[A-Za-z0-9+/=\s]+$/.test(value) && value.length % 4 === 0 && !value.includes("<")) {
    try {
      const decoded = atob(value.replace(/\s+/g, ""));
      if (decoded.trim().startsWith("<")) return decoded;
    } catch {
      return value;
    }
  }
  return value;
}

function titleFromPayload(payload) {
  const match = payload.match(/<title>(.*?)<\/title>/i);
  if (match?.[1]?.trim()) return match[1].trim().slice(0, 80);
  const heading = payload.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (heading?.[1]?.trim()) return heading[1].replace(/<[^>]+>/g, "").trim().slice(0, 80);
  return `Cartridge ${new Date().toLocaleString()}`;
}

function runPayload(raw, title = "") {
  const payload = decodePayload(raw);
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
    savedAt: Date.now()
  });
  await renderShelf();
  toast("Saved locally.");
}

async function renderShelf() {
  const records = (await getAllCartridges()).sort((a, b) => b.savedAt - a.savedAt);
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
    run.addEventListener("click", () => runPayload(record.payload, record.title));

    item.append(copy, run);
    shelf.append(item);
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
  if (!location.hash.startsWith("#cart=")) return;
  const encoded = location.hash.slice("#cart=".length);
  try {
    const payload = decodeURIComponent(encoded);
    input.value = payload;
    runPayload(payload);
  } catch {
    toast("Could not read cartridge from URL.");
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
  } catch {
    status.textContent = "cache unavailable";
    status.className = "status warn";
  }
}

document.querySelector("#runButton").addEventListener("click", () => runPayload(input.value));
document.querySelector("#saveButton").addEventListener("click", saveActive);
document.querySelector("#sampleButton").addEventListener("click", () => {
  input.value = sampleCartridge;
  runPayload(sampleCartridge, "Sample cartridge");
});
document.querySelector("#copyButton").addEventListener("click", copyActive);
document.querySelector("#downloadButton").addEventListener("click", downloadActive);
document.querySelector("#clearButton").addEventListener("click", async () => {
  await clearCartridges();
  await renderShelf();
  toast("Shelf cleared.");
});
fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  const payload = await file.text();
  input.value = payload;
  runPayload(payload, file.name.replace(/\.[^.]+$/, ""));
});
window.addEventListener("message", (event) => {
  if (event.data?.type === "cartridge-result") {
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

await registerServiceWorker();
await renderShelf();
await loadHashPayload();
