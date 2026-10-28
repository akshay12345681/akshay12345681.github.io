/* Rotator: shows one child of .rotator at a time and cycles through them.
   data-interval = ms each line stays (default 5000)
   data-delay    = ms before the first change (default = interval)
   data-sync     = optional group name. Rotators with the same name change
                   together on one timer (interval and delay come from the first
                   one), and pointing at any of them pauses the whole group.
   Pauses on hover/focus and while the tab is hidden; stays still with reduced motion. */
(function () {
  'use strict';

  // One rotating element: knows its items and how to move to the next one
  function Rotator(el) {
    const items = Array.from(el.children);
    if (items.length < 2) return null;
    let index = 0;

    items.forEach((item, i) => {
      item.classList.toggle('is-active', i === 0);
      item.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
    });
    el.classList.add('is-ready');

    return {
      el,
      next() {
        const current = items[index];
        current.classList.remove('is-active');
        current.classList.add('is-leaving');
        current.setAttribute('aria-hidden', 'true');
        setTimeout(() => current.classList.remove('is-leaving'), 800);
        index = (index + 1) % items.length;
        items[index].classList.add('is-active');
        items[index].setAttribute('aria-hidden', 'false');
      },
    };
  }

  // One timer for a set of rotators, so they always change at the same moment
  function run(rotators, settings) {
    const interval = parseInt(settings.interval, 10) || 5000;
    const delay = parseInt(settings.delay, 10) || 0;
    let timer = null, paused = false;

    function schedule(wait) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!paused && !document.hidden) rotators.forEach(r => r.next());
        schedule(interval);
      }, wait);
    }

    const pause = () => { paused = true; };
    const resume = () => { paused = false; };
    rotators.forEach(({ el }) => {
      el.addEventListener('mouseenter', pause);
      el.addEventListener('mouseleave', resume);
      el.addEventListener('focusin', pause);
      el.addEventListener('focusout', resume);
    });

    // Reduced motion: keep the first line and don't auto-rotate
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    schedule(interval + delay);
  }

  window.initRotators = function (root) {
    const groups = new Map();
    (root || document).querySelectorAll('.rotator').forEach(el => {
      const r = Rotator(el);
      if (!r) return;
      const name = el.dataset.sync;
      if (!name) { run([r], el.dataset); return; }
      if (!groups.has(name)) groups.set(name, { settings: el.dataset, list: [] });
      groups.get(name).list.push(r);
    });
    groups.forEach(g => run(g.list, g.settings));
  };
})();
