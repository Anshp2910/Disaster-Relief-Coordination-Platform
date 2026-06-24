(function() {
  var saved;
  try { saved = localStorage.getItem('theme') } catch(e) {}
  var isLight;
  if (saved === 'light') isLight = true;
  else if (saved === 'dark') isLight = false;
  else isLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  if (isLight) document.documentElement.classList.add('dark');
})();
