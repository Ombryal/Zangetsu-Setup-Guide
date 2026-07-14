/* ---------- Constants ---------- */
const OWNER = "Spyou";
const REPO = "Zangetsu";
const API_URL = `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`;
const CACHE_KEY = "latestRelease";
const CACHE_DURATION = 10 * 60 * 1000;

/* ---------- Utility: human-readable file size ---------- */
function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/* ---------- Utility: format date ---------- */
function formatDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
  } catch (e) {}
  return null;
}

function setCachedData(release, fetchTime) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ release, timestamp: fetchTime || Date.now() }));
  } catch (e) {}
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

/* ---------- Share page button ---------- */
function createShareButton() {
  const btn = document.createElement("button");
  btn.className = "ghost-button copy-btn";
  btn.textContent = "Share page";
  btn.addEventListener("click", async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      btn.textContent = "Link copied!";
      setTimeout(() => (btn.textContent = "Share page"), 2000);
    } catch {
      btn.textContent = "Failed";
      setTimeout(() => (btn.textContent = "Share page"), 2000);
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

/* ---------- Installation feedback ---------- */
function initInstallFeedback() {
  const main = document.querySelector("main");
  if (!main || !document.body.dataset.page) return;

  const feedbackDiv = document.createElement("section");
  feedbackDiv.className = "panel install-feedback";
  feedbackDiv.innerHTML = `<h2>Installation</h2><p>Let us know you’ve installed Zangetsu!</p>`;
  const btn = document.createElement("button");
  btn.className = "ghost-button install-btn";
  btn.textContent = "I installed Zangetsu";
  btn.addEventListener("click", () => {
    const count = parseInt(localStorage.getItem("installCount") || "0") + 1;
    localStorage.setItem("installCount", count);
    btn.textContent = `Thanks! (${count})`;
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = "I installed Zangetsu";
      btn.disabled = false;
    }, 2000);
  });
  feedbackDiv.appendChild(btn);
  main.appendChild(feedbackDiv);
}
document.addEventListener("DOMContentLoaded", initInstallFeedback);

/* ---------- Keyboard shortcut: R to refresh ---------- */
document.addEventListener("keydown", (e) => {
  if (e.key === "r" || e.key === "R") {
    const activeTag = document.activeElement.tagName.toLowerCase();
    if (activeTag !== "input" && activeTag !== "textarea") {
      e.preventDefault();
      loadRelease(true);
    }
  }
});

/* ---------- Main loader ---------- */
async function loadRelease(forceRefresh = false) {
  const target = document.getElementById("download-area");
  if (!target) return;

  target.innerHTML = '<div class="loading-spinner"><span>Loading release data…</span></div>';

  try {
    let release;
    let fetchTime = Date.now();

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
          throw new Error(`GitHub API rate limit exceeded. ${resetDate ? `Resets at ${resetDate.toLocaleTimeString()}.` : "Please try again later."}`);
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      release = await response.json();
      fetchTime = Date.now();
      setCachedData(release, fetchTime);
    }

    const page = document.body.dataset.page;
    const asset = detectAssetName(page, release.assets || []);
    const checksumAsset = release.assets?.find(a => a.name.toLowerCase().includes("checksum") || a.name.toLowerCase().includes("sha256") || a.name.toLowerCase().endsWith(".sha256"));

    target.innerHTML = "";

    // Top row
    const topRow = document.createElement("div");
    topRow.className = "download-top-row";

    const versionBadge = document.createElement("div");
    versionBadge.className = "badge";
    versionBadge.textContent = release.tag_name || "Latest release";
    topRow.appendChild(versionBadge);

    if (release.published_at) {
      const dateSpan = document.createElement("span");
      dateSpan.className = "release-date";
      dateSpan.textContent = `Published ${formatDate(release.published_at)}`;
      topRow.appendChild(dateSpan);
    }

    const refreshBtn = document.createElement("button");
    refreshBtn.className = "ghost-button refresh-btn";
    refreshBtn.textContent = "Refresh";
    refreshBtn.addEventListener("click", () => loadRelease(true));
    topRow.appendChild(refreshBtn);

    topRow.appendChild(createShareButton());

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

      if (checksumAsset) {
        const checksumRow = document.createElement("div");
        checksumRow.className = "checksum-row";
        const checksumLink = document.createElement("a");
        checksumLink.className = "ghost-button";
        checksumLink.href = checksumAsset.browser_download_url;
        checksumLink.target = "_blank";
        checksumLink.rel = "noopener noreferrer";
        checksumLink.textContent = "Verify checksum";
        checksumRow.appendChild(checksumLink);

        const copyChecksumBtn = document.createElement("button");
        copyChecksumBtn.className = "ghost-button copy-btn";
        copyChecksumBtn.textContent = "Copy checksum URL";
        copyChecksumBtn.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(checksumAsset.browser_download_url);
            copyChecksumBtn.textContent = "Copied!";
            setTimeout(() => (copyChecksumBtn.textContent = "Copy checksum URL"), 2000);
          } catch {
            copyChecksumBtn.textContent = "Failed";
            setTimeout(() => (copyChecksumBtn.textContent = "Copy checksum URL"), 2000);
          }
        });
        checksumRow.appendChild(copyChecksumBtn);
        target.appendChild(checksumRow);
      }
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
