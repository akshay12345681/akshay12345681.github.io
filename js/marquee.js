/* Tool strip marquee: adds logos, duplicates the list for a seamless loop,
   and sets the speed from the list's width so it always moves at the same pace. */
(function () {
  'use strict';
  const SPEED = 45; // px per second

  window.initMarquee = function (track) {
    if (!track) return;
    // Second copy for the loop (hidden from screen readers)
    Array.from(track.children).forEach(li => {
      const copy = li.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      track.appendChild(copy);
    });

    // Logo for each tool: assets/logos/<data-logo>; the name shows alone if the file is missing
    Array.from(track.children).forEach(li => {
      const file = li.dataset.logo;
      if (!file) return;
      const img = document.createElement('img');
      img.className = 'tool-logo';
      img.alt = '';
      img.width = 26; img.height = 26;
      img.decoding = 'async';
      img.addEventListener('error', () => img.remove());
      img.src = `assets/logos/${file}`;
      li.prepend(img);
    });

    const setSpeed = () => {
      const half = track.scrollWidth / 2;
      track.style.setProperty('--marquee-duration', `${Math.max(half / SPEED, 10)}s`);
    };
    setSpeed();
    window.addEventListener('load', setSpeed);
  };
})();
