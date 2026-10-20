/* Toolkit deck: cards fan out in 3D around the active card.
   Moving the pointer across the cards brings each one forward in turn.
   Also works with tap, swipe, the arrow buttons and the arrow keys. */
(function () {
  'use strict';

  const HOVER_COOLDOWN = 160; // ms between hover switches, stops cards flickering while they move

  window.initDeck = function (deck, counter, buttons) {
    if (!deck) return;
    const cards = Array.from(deck.querySelectorAll('.deck-card'));
    if (!cards.length) return;
    let active = Math.min(2, cards.length - 1);
    let lastSwitch = 0;
    const pad = n => String(n).padStart(2, '0');

    function layout() {
      const w = deck.clientWidth;
      const narrow = w < 560;
      const step = narrow ? w * 0.16 : Math.min(w * 0.15, 175);
      const maxVisible = narrow ? 2 : 3;

      cards.forEach((card, i) => {
        const o = i - active, a = Math.abs(o), dir = Math.sign(o);
        // First neighbour sits a full step away; cards further out bunch up behind it
        const x = dir * (step * Math.min(a, 1) + step * 0.55 * Math.max(a - 1, 0));
        const s = card.style;
        s.setProperty('--x', `${x.toFixed(1)}px`);
        s.setProperty('--z', `${-a * 140}px`);
        s.setProperty('--ry', `${Math.max(-40, Math.min(40, -o * 16))}deg`);
        s.setProperty('--s', (1 - a * 0.04).toFixed(3));
        s.setProperty('--dim', Math.min(a * 0.2, 0.6).toFixed(2));
        s.zIndex = String(100 - a);
        const hidden = a > maxVisible;
        s.opacity = hidden ? '0' : '1';
        s.pointerEvents = hidden ? 'none' : '';
        card.classList.toggle('is-active', o === 0);
        card.setAttribute('aria-current', o === 0 ? 'true' : 'false');
      });
      if (counter) counter.textContent = `${pad(active + 1)} / ${pad(cards.length)}`;
    }

    function go(i, focus) {
      const next = Math.max(0, Math.min(cards.length - 1, i));
      if (next !== active) {
        active = next;
        lastSwitch = performance.now();
        layout();
      }
      if (focus) cards[active].focus({ preventScroll: true });
    }

    // Hover: only real pointer movement switches cards (not cards sliding under a still cursor)
    deck.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      if (!e.movementX && !e.movementY) return;
      if (performance.now() - lastSwitch < HOVER_COOLDOWN) return;
      const card = e.target.closest('.deck-card');
      if (card) go(cards.indexOf(card));
    });

    // Tap or click a card to bring it forward; swipe to move along
    let downX = null, swiped = false;
    deck.addEventListener('pointerdown', e => { downX = e.clientX; swiped = false; });
    deck.addEventListener('pointerup', e => {
      if (downX === null) return;
      const dx = e.clientX - downX;
      downX = null;
      if (Math.abs(dx) > 40) { swiped = true; go(active + (dx < 0 ? 1 : -1)); }
    });
    cards.forEach((card, i) => {
      card.addEventListener('click', () => { if (!swiped) go(i); });
      card.addEventListener('focus', () => go(i));
    });

    deck.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { go(active + 1, true); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { go(active - 1, true); e.preventDefault(); }
    });

    (buttons || []).forEach(btn => {
      btn.addEventListener('click', () => go(active + Number(btn.dataset.dir)));
    });

    let timer;
    window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(layout, 120); });
    layout();
  };
})();
