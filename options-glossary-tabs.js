'use strict';

(function () {
  const tabs = [...document.querySelectorAll('[data-glossary-tab]')];
  const panels = [...document.querySelectorAll('[data-glossary-panel]')];
  if (!tabs.length || !panels.length) return;

  const validNames = new Set(tabs.map(tab => tab.dataset.glossaryTab));
  const storageKey = 'vibe-reading.glossary-active-tab';

  function activate(name, { focus = false } = {}) {
    const selected = validNames.has(name) ? name : 'file';

    for (const tab of tabs) {
      const active = tab.dataset.glossaryTab === selected;
      tab.classList.toggle('is-selected', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
    }

    for (const panel of panels) {
      panel.hidden = panel.dataset.glossaryPanel !== selected;
    }

    try { sessionStorage.setItem(storageKey, selected); } catch (_) {}
  }

  function moveFrom(current, direction) {
    const index = tabs.indexOf(current);
    if (index < 0) return;
    const nextIndex = (index + direction + tabs.length) % tabs.length;
    activate(tabs[nextIndex].dataset.glossaryTab, { focus: true });
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => activate(tab.dataset.glossaryTab));
    tab.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight') { event.preventDefault(); moveFrom(tab, 1); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); moveFrom(tab, -1); }
      else if (event.key === 'Home') { event.preventDefault(); activate(tabs[0].dataset.glossaryTab, { focus: true }); }
      else if (event.key === 'End') { event.preventDefault(); activate(tabs[tabs.length - 1].dataset.glossaryTab, { focus: true }); }
    });
  }

  let initial = 'file';
  try { initial = sessionStorage.getItem(storageKey) || initial; } catch (_) {}
  activate(initial);
})();
