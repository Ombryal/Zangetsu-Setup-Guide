document.addEventListener("DOMContentLoaded", () => {
  // Theme toggle (dedicated ID for settings page)
  const themeBtn = document.getElementById("theme-toggle-settings");
  function updateIcon() {
    if (!themeBtn) return;
    const theme = document.documentElement.getAttribute("data-theme");
    themeBtn.textContent = theme === "light" ? "☀️" : "🌙";
  }
  updateIcon();
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      if (current === "light") {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.setAttribute("data-theme", "light");
        localStorage.setItem("theme", "light");
      }
      updateIcon();
    });
  }

  // Clear cache
  const clearBtn = document.getElementById("clear-cache-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      sessionStorage.removeItem("latestRelease");
      alert("Release cache cleared. Next page load will fetch fresh data.");
    });
  }

  // Reset installation count
  const resetBtn = document.getElementById("reset-install-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      localStorage.removeItem("installCount");
      alert("Installation count reset.");
    });
  }
});
