(function() {
  // Set data-theme before paint so the first render matches the saved theme.
  // The CSS in 01-variables.css keys off the [data-theme] attribute on <html>.
  var theme = 'dark' // default must match ThemeContext
  try {
    var stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark' || stored === 'neon') {
      theme = stored
    }
  } catch (e) {
    // localStorage unavailable (privacy mode) — keep default
  }
  document.documentElement.setAttribute('data-theme', theme)
})();
