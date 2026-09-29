(() => {
  const key = 'cri-leads-theme';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference;
  try { preference = localStorage.getItem(key); } catch { /* Storage may be unavailable. */ }
  if (!['light', 'dark'].includes(preference)) preference = null;

  function apply(theme) {
    theme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    const button = document.getElementById('theme-toggle');
    if (!button) return;
    const dark = theme === 'dark';
    button.setAttribute('aria-pressed', String(dark));
    button.title = dark ? 'Ativar tema claro' : 'Ativar tema escuro';
    button.setAttribute('aria-label', `Tema ${dark ? 'escuro' : 'claro'} ativo. ${button.title}.`);
    document.getElementById('theme-label').textContent = dark ? 'Tema: Escuro' : 'Tema: Claro';
  }

  apply(preference || (system.matches ? 'dark' : 'light'));
  function initialize() {
    apply(document.documentElement.dataset.theme);
    document.getElementById('theme-toggle').addEventListener('click', () => {
      preference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, preference); } catch { /* Keep theme for this session. */ }
      apply(preference);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
  system.addEventListener('change', () => {
    if (!preference) apply(system.matches ? 'dark' : 'light');
  });
  window.addEventListener('storage', (event) => {
    if (event.key !== key && event.key !== null) return;
    preference = ['light', 'dark'].includes(event.newValue) ? event.newValue : null;
    apply(preference || (system.matches ? 'dark' : 'light'));
  });
})();
