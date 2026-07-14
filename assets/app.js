const OWNER = "Spyou";
const REPO = "Zangetsu";
const API_URL = `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`;
const CACHE_KEY = "latestRelease";
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/* ---------- Theme toggling ---------- */
function updateThemeIcon() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const theme = document.documentElement.getAttribute("data-theme");
  btn.textContent = theme === "light" ? "☀️" : "🌙";
}

function initTheme() {
  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (saved === "light" || (!saved && !prefersDark)) {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  updateThemeIcon();
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  if (current === "light") {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("theme", "dark");
  } else {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("theme", "light");
  }
  updateThemeIcon();
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  const toggleBtn = document.getElementById("theme-toggle");
  if (toggleBtn) toggleBtn.addEventListener("click", toggleTheme);
});

/* ---------- Back to top button ---------- */
function initBackToTop() {
  const btn = document.getElementById("back-to-top");
  if (!btn) return;
  window.addEventListener("scroll", () => {
    btn.style.display = window.scrollY > 300 ? "flex" : "none";
  });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

document.addEventListener("DOMContentLoaded", initBackToTop);

/* ---------- Utility: human-readable file size ---------- */
function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/* ---------- Asset detection ---------- */
function detectAssetName(page, assets) {
  const patterns = {
    android: { platform: 'android', extensions: ['.apk'] },
    tv:      { platform: 'tv',      extensions: ['.apk'] },
    ios:     { platform: 'ios',     extensions: ['.ipa'] },
    windows: { platform: 'windows', extensions: ['.exe', '.msi', '.zip'] },
  };
  const rule = patterns[page];
  if (!rule) return undefined;

  return assets.find(asset => {
    const name = asset.name.toLowerCase();
    const matchesPlatform = name.includes(rule.platform);
    const matchesExt = rule.extensions.some(ext => name.endsWith(ext));
    return matchesPlatform && matchesExt;
  });
}

/* ---------- Caching ---------- */
function getCachedData() {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      if (Date.now() - data.timestamp < CACHE_DURATION) return data;
    }
  } catch (e) { /* ignore */ }
  return null;
}

function setCachedData(release, fetchTime) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      release,
      timestamp: fetchTime || Date.now()
    }));
  } catch (e) { /* ignore */ }
}

/* ---------- QR code ---------- */
function createQRCode(url) {
  const qrContainer = document.createElement("div");
  qrContainer.className = "qr-code";
  const qrImg = document.createElement("img");
  qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;
  qrImg.alt = "QR code for download link";
  qrImg.loading = "lazy";
  qrContainer.appendChild(qrImg);
  const caption = document.createElement("small");
  caption.textContent = "Scan to download";
  qrContainer.appendChild(caption);
  return qrContainer;
}

/* ---------- Copy link button ---------- */
function createCopyButton(url) {
  const btn = document.createElement("button");
  btn.className = "ghost-button copy-btn";
  btn.textContent = "Copy link";
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(url);
      btn.textContent = "Copied!";
      setTimeout(() => (btn.textContent = "Copy link"), 2000);
    } catch {
      btn.textContent = "Failed";
      setTimeout(() => (btn.textContent = "Copy link"), 2000);
    }
  });
  return btn;
}

/* ---------- Release notes preview ---------- */
function createReleaseNotes(body) {
  if (!body) return null;
  const div = document.createElement("div");
  div.className = "release-notes";
  const heading = document.createElement("h3");
  heading.textContent = "What’s new";
  div.appendChild(heading);
  let preview = body.replace(/^#.*$/gm, '').trim().substring(0, 400);
  if (body.length > 400) preview += '…';
  const p = document.createElement("p");
  p.textContent = preview;
  div.appendChild(p);
  return div;
}

/* ---------- Main loader ---------- */
async function loadRelease(forceRefresh = false) {
  const target = document.getElementById("download-area");
  if (!target) return;

  target.innerHTML = '<div class="loading-spinner"><span>Loading release data…</span></div>';

  try {
    let release;
    let fetchTime = Date.now();

    // Check cache unless forced refresh
    if (!forceRefresh) {
      const cached = getCachedData();
      if (cached) {
        release = cached.release;
        fetchTime = cached.timestamp;
      }
    }

    if (!release) {
      const response = await fetch(API_URL, {
        headers: { Accept: "application/vnd.github+json" },
      });

      if (!response.ok) {
        if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") {
          const resetTime = response.headers.get("x-ratelimit-reset");
          const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : null;
          const message = `GitHub API rate limit exceeded. ${
            resetDate ? `Resets at ${resetDate.toLocaleTimeString()}.` : "Please try again later."
          }`;
          throw new Error(message);
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      release = await response.json();
      fetchTime = Date.now();
      setCachedData(release, fetchTime);
    }

    const page = document.body.dataset.page;
    const asset = detectAssetName(page, release.assets || []);

    target.innerHTML = "";

    // Top row: badge + refresh + timestamp
    const topRow = document.createElement("div");
    topRow.className = "download-top-row";

    const versionBadge = document.createElement("div");
    versionBadge.className = "badge";
    versionBadge.textContent = release.tag_name || "Latest release";
    topRow.appendChild(versionBadge);

    // Manual refresh button
    const refreshBtn = document.createElement("button");
    refreshBtn.className = "ghost-button refresh-btn";
    refreshBtn.textContent = "Refresh";
    refreshBtn.addEventListener("click", () => loadRelease(true));
    topRow.appendChild(refreshBtn);

    // Last updated timestamp
    const lastUpdated = document.createElement("span");
    lastUpdated.className = "last-updated";
    lastUpdated.textContent = `Last checked: ${new Date(fetchTime).toLocaleTimeString()}`;
    topRow.appendChild(lastUpdated);

    target.appendChild(topRow);

    // Release name
    const releaseInfo = document.createElement("p");
    releaseInfo.textContent = release.name || "Latest GitHub release";
    target.appendChild(releaseInfo);

    if (asset) {
      const row = document.createElement("div");
      row.className = "download-row";

      const linkWrapper = document.createElement("div");
      linkWrapper.className = "download-link-wrapper";

      const link = document.createElement("a");
      link.className = "download-button";
      link.href = asset.browser_download_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", `Download ${asset.name}`);
      link.textContent = `Download ${asset.name}`;
      link.title = asset.name;
      linkWrapper.appendChild(link);

      // File size
      if (asset.size) {
        const sizeSpan = document.createElement("span");
        sizeSpan.className = "file-size";
        sizeSpan.textContent = formatBytes(asset.size);
        linkWrapper.appendChild(sizeSpan);
      }

      row.appendChild(linkWrapper);
      row.appendChild(createCopyButton(asset.browser_download_url));
      row.appendChild(createQRCode(asset.browser_download_url));

      target.appendChild(row);
    } else {
      const fallback = document.createElement("p");
      fallback.textContent = "No matching asset found in this release.";
      target.appendChild(fallback);
    }

    const notesPreview = createReleaseNotes(release.body);
    if (notesPreview) target.appendChild(notesPreview);

    const releaseLink = document.createElement("a");
    releaseLink.className = "ghost-button";
    releaseLink.href = release.html_url;
    releaseLink.target = "_blank";
    releaseLink.rel = "noopener noreferrer";
    releaseLink.textContent = "View full release notes";
    target.appendChild(releaseLink);

  } catch (error) {
    target.innerHTML = "";
    const msg = document.createElement("p");
    msg.textContent = error.message;
    target.appendChild(msg);

    const retry = document.createElement("button");
    retry.className = "ghost-button";
    retry.textContent = "Retry";
    retry.addEventListener("click", () => loadRelease(true));
    target.appendChild(retry);
    console.error(error);
  }
}

loadRelease();
