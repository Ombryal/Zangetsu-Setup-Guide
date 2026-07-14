const OWNER = "Spyou";
const REPO = "Zangetsu";
const API_URL = `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`;
const CACHE_KEY = "latestRelease";
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

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

function getCachedRelease() {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      if (Date.now() - data.timestamp < CACHE_DURATION) {
        return data.release;
      }
    }
  } catch (e) {
    // Ignore parse errors
  }
  return null;
}

function setCachedRelease(release) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      release,
      timestamp: Date.now()
    }));
  } catch (e) {
    // Ignore storage full
  }
}

async function loadRelease(forceRefresh = false) {
  const target = document.getElementById("download-area");
  if (!target) return;

  // Loading state
  target.innerHTML = '<div class="loading-spinner"><span>Loading release data…</span></div>';

  try {
    let release;
    if (!forceRefresh) {
      const cached = getCachedRelease();
      if (cached) {
        release = cached;
      }
    }

    if (!release) {
      const response = await fetch(API_URL, {
        headers: { Accept: "application/vnd.github+json" },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      release = await response.json();
      setCachedRelease(release);
    }

    const page = document.body.dataset.page;
    const asset = detectAssetName(page, release.assets || []);

    target.innerHTML = "";

    // Version badge
    const version = document.createElement("div");
    version.className = "badge";
    version.textContent = release.tag_name || "Latest release";
    target.appendChild(version);

    // Release name
    const releaseInfo = document.createElement("p");
    releaseInfo.textContent = release.name || "Latest GitHub release";
    target.appendChild(releaseInfo);

    // Download button if asset found
    if (asset) {
      const link = document.createElement("a");
      link.className = "download-button";
      link.href = asset.browser_download_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", `Download ${asset.name}`);
      link.textContent = `Download ${asset.name}`;
      target.appendChild(link);
    } else {
      const fallback = document.createElement("p");
      fallback.textContent = "No matching asset found in this release.";
      target.appendChild(fallback);
    }

    // Always show release notes link
    const releaseLink = document.createElement("a");
    releaseLink.className = "ghost-button";
    releaseLink.href = release.html_url;
    releaseLink.target = "_blank";
    releaseLink.rel = "noopener noreferrer";
    releaseLink.textContent = "View release notes";
    target.appendChild(releaseLink);

  } catch (error) {
    target.innerHTML = "";
    const errorMsg = document.createElement("p");
    if (error.message.startsWith("GitHub API error")) {
      errorMsg.textContent = error.message;
    } else {
      errorMsg.textContent = "Network error. Check your internet connection.";
    }
    target.appendChild(errorMsg);

    const retryBtn = document.createElement("button");
    retryBtn.className = "ghost-button";
    retryBtn.textContent = "Retry";
    retryBtn.addEventListener("click", () => loadRelease(true));
    target.appendChild(retryBtn);

    console.error(error);
  }
}

loadRelease();
