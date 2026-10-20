/* Rotator: shows one child of .rotator at a time and cycles through them.
   data-interval = ms each line stays (default 5000)
   data-delay    = ms before the first change (default = interval)
   Pauses on hover/focus and while the tab is hidden; stays still with reduced motion. */
(function () {
  'use strict';

  function Rotator(el) {
    const items = Array.from(el.children);
    if (items.length < 2) return;
    const interval = parseInt(el.dataset.interval, 10) || 5000;
    const delay = parseInt(el.dataset.delay, 10) || 0;
    let index = 0, timer = null, paused = false;

    items.forEach((item, i) => {
      item.classList.toggle('is-active', i === 0);
      item.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
    });
    el.classList.add('is-ready');

    function show(next) {
      const current = items[index];
      current.classList.remove('is-active');
      current.classList.add('is-leaving');
      current.setAttribute('aria-hidden', 'true');
      setTimeout(() => current.classList.remove('is-leaving'), 800);
      index = next;
      items[index].classList.add('is-active');
      items[index].setAttribute('aria-hidden', 'false');
    }

    function schedule(wait) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!paused && !document.hidden) show((index + 1) % items.length);
        schedule(interval);
      }, wait);
    }

    const pause = () => { paused = true; };
    const resume = () => { paused = false; };
    el.addEventListener('mouseenter', pause);
    el.addEventListener('mouseleave', resume);
    el.addEventListener('focusin', pause);
    el.addEventListener('focusout', resume);

    // Reduced motion: keep the first line and don't auto-rotate
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    schedule(interval + delay);
  }

  window.initRotators = function (root) {
    (root || document).querySelectorAll('.rotator').forEach(el => Rotator(el));
  };
})();
