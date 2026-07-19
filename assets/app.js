/* ---------- Service Worker ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/assets/sw.js").catch(() => {});
  });
}

/* ---------- GitHub star count ---------- */
async function fetchStarCount() {
  const starLink = document.getElementById("github-star");
  if (!starLink) return;
  try {
    const response = await fetch("https://api.github.com/repos/Spyou/Zangetsu", {
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
