/* ---------- Theme toggling ---------- */
function updateThemeIcon(btn) {
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
  const toggleBtn = document.getElementById("theme-toggle");
  if (toggleBtn) updateThemeIcon(toggleBtn);
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
  const btn = document.getElementById("theme-toggle");
  if (btn) updateThemeIcon(btn);
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  const toggleBtn = document.getElementById("theme-toggle");
  if (toggleBtn) toggleBtn.addEventListener("click", toggleTheme);
});

/* ---------- Language selector (placeholder) ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const langSelect = document.getElementById("language-select");
  if (langSelect) {
    langSelect.addEventListener("change", (e) => {
      if (e.target.value !== "en") {
        alert("Language support coming soon!");
        langSelect.value = "en";
      }
    });
  }
});

/* ---------- GitHub star count ---------- */
async function fetchStarCount() {
  const starLink = document.getElementById("github-star");
  if (!starLink) return;
  try {
    const response = await fetch(`https://api.github.com/repos/Spyou/Zangetsu`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (response.ok) {
      const data = await response.json();
      const count = data.stargazers_count;
      starLink.innerHTML = `★ Star <span class="star-count">${count}</span>`;
    }
  } catch {}
}
document.addEventListener("DOMContentLoaded", fetchStarCount);

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

/* ---------- Service Worker ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/assets/sw.js").catch(() => {});
  });
}
