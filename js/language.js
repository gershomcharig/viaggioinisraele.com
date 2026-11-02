/* Automatic selection belongs only to the entry point; explicit URLs always win. */
(() => {
  'use strict';
  const data = document.getElementById('locale-data');
  if (!data) return;
  const { languages, fallbackLanguage } = JSON.parse(data.textContent);
  const storageKey = 'isacco.language';
  const supported = code => languages.find(language => language.code === code);
  const readChoice = () => {
    try { return localStorage.getItem(storageKey); } catch { return null; }
  };
  const saveChoice = code => {
    try { localStorage.setItem(storageKey, code); } catch { /* Links work without storage. */ }
  };

  if (location.pathname === '/' || location.pathname === '/index.html') {
    let language = supported(readChoice());
    if (!language) {
      for (const preference of navigator.languages || [navigator.language]) {
        const code = String(preference).toLowerCase();
        language = languages.find(item => item.code.toLowerCase() === code) ||
          supported(code.split('-')[0]);
        if (language) break;
      }
    }
    language ||= supported(fallbackLanguage);
    location.replace(language.path + location.search + location.hash);
    return;
  }

  const setup = () => {
    document.querySelectorAll('[data-language]').forEach(link => {
      const language = supported(link.dataset.language);
      if (!language) return;
      const updateHref = () => { link.href = language.path + location.search + location.hash; };
      updateHref();
      window.addEventListener('hashchange', updateHref);
      // Updating on click also picks up chapter changes made with history.pushState.
      link.addEventListener('click', () => {
        updateHref();
        saveChoice(language.code);
      });
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
  else setup();
})();
