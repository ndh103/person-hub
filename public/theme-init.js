// Applies the stored or system theme before first paint to avoid a flash of
// the wrong theme. Same storage key as the app-shell design reference and
// src/components/shell/theme-switch.tsx.
(function () {
  try {
    var stored = localStorage.getItem("ph-theme");
    var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {
    // Storage can be unavailable (private mode); the page starts in the light theme.
  }
})();
