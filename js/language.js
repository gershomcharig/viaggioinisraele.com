/* Every URL keeps its language; switching is always an explicit link. */
(() => {
  'use strict';
  const data = document.getElementById('locale-data');
  if (!data) return;
  const { languages } = JSON.parse(data.textContent);
  const supported = code => languages.find(language => language.code === code);
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
      });
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
  else setup();
})();
