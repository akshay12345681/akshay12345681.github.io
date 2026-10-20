/* Page setup. Add new page behaviour here. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);

  if (window.Lanyard && $('stage')) {
    window.lanyard = new window.Lanyard({
      stage: $('stage'),
      badge: $('badge'),
      shadow: $('badgeShadow'),
      rope: $('rope'),
      ropeShadow: $('ropeShadow'),
      clasp: $('clasp'),
      hint: $('hint'),
    });
  }

  if (window.initRotators) window.initRotators();
  if (window.initMarquee) window.initMarquee($('toolTrack'));
  if (window.initDeck) window.initDeck($('toolDeck'), $('deckCount'), document.querySelectorAll('.deck-btn'));

  // Top bar: show it once the hero has scrolled out of view
  const topbar = $('topbar'), stage = $('stage');
  if (topbar && stage && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      topbar.classList.toggle('is-visible', !entry.isIntersecting);
    }, { rootMargin: '-52px 0px 0px 0px' }).observe(stage);
  }

  const year = $('year');
  if (year) year.textContent = new Date().getFullYear();

  // Copy buttons: <button data-copy="text to copy">
  document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.copy;
      const label = btn.dataset.label || (btn.dataset.label = btn.textContent);
      const flash = msg => {
        btn.textContent = msg;
        clearTimeout(btn._reset);
        btn._reset = setTimeout(() => { btn.textContent = label; }, 1600);
      };
      const done = () => flash('Copied');
      // No clipboard access: select the text and tell the user to copy it
      const fallback = () => {
        const target = btn.previousElementSibling;
        if (!target) return;
        const range = document.createRange();
        range.selectNodeContents(target);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        flash(/Mac|iPhone|iPad/.test(navigator.platform) ? 'Press ⌘C' : 'Press Ctrl+C');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else {
        fallback();
      }
    });
  });
})();
