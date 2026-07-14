const OWNER = "Spyou";
const REPO = "Zangetsu";
const API_URL = `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`;

function detectAssetName(page, assets) {
  const rules = {
    android: ["android", ".apk"],
    tv: ["tv", ".apk"],
    ios: ["ios", ".ipa"],
    windows: ["windows", ".exe", ".msi", ".zip"],
  };

  const keywords = rules[page] || [];
  return assets.find((asset) => {
    const name = asset.name.toLowerCase();
    return keywords.every((keyword) =>
      name.includes(keyword.replace(".", "")) || name.endsWith(keyword)
    );
  });
}

async function loadRelease() {
  const target = document.getElementById("download-area");
  if (!target) return;

  try {
    const response = await fetch(API_URL, {
      headers: {
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }

    const release = await response.json();
    const page = document.body.dataset.page;
    const asset = detectAssetName(page, release.assets || []);

    target.innerHTML = "";

    const version = document.createElement("div");
    version.className = "badge";
    version.textContent = release.tag_name || "Latest release";
    target.appendChild(version);

    const releaseInfo = document.createElement("p");
    releaseInfo.textContent = release.name ? release.name : "Latest GitHub release found.";
    target.appendChild(releaseInfo);

    if (asset) {
      const link = document.createElement("a");
      link.className = "download-button";
      link.href = asset.browser_download_url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = `Download ${asset.name}`;
      target.appendChild(link);
    } else {
      const fallback = document.createElement("p");
      fallback.textContent = "No matching asset was found in the latest release.";
      target.appendChild(fallback);
    }

    const notes = document.createElement("a");
    notes.className = "ghost-button";
    notes.href = release.html_url;
    notes.target = "_blank";
    notes.rel = "noreferrer";
    notes.textContent = "View release notes";
    target.appendChild(notes);
  } catch (error) {
    target.innerHTML = "";
    const msg = document.createElement("p");
    msg.textContent = `Could not load GitHub release data: ${error.message}`;
    target.appendChild(msg);
    console.error(error);
  }
}

loadRelease();
