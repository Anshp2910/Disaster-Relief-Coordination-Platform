(function() {
  var saved, themeName;
  try { saved = localStorage.getItem('theme') } catch(e) {}
  try { themeName = localStorage.getItem('themeName') } catch(e) {}
  var isLight;
  if (saved === 'light') isLight = true;
  else if (saved === 'dark') isLight = false;
  else isLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  if (isLight) document.documentElement.classList.add('light');
  var THEMES = ['midnight','monsoon','heatwave','winter','forest','govt','contrast','compact'];
  if (themeName && THEMES.indexOf(themeName) !== -1 && themeName !== 'midnight') {
    document.documentElement.classList.add('theme-' + themeName);
  }
})();
