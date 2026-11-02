/* Pure formatting shared by the page and regression tests. */
(() => {
  'use strict';
  const format = (template, values) => template.replace(/\{(\w+)\}/g, (_, key) => values[key]);
  globalThis.TourLetter = {
    build(messages, { name, size, period, dreams }) {
      const list = dreams.length < 2 ? dreams.join('') :
        dreams.slice(0, -1).join(', ') + messages.join + dreams.at(-1);
      return format(messages.intro, {
        name: name.trim() || '…', size,
        period: period.trim() ? format(messages.period, { period: period.trim() }) : '',
        dreams: list ? format(messages.dreams, { dreams: list }) : '',
      });
    },
  };
})();
