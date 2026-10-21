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

    // Pause / play button, so keyboard and touch users can stop the motion too
    const strip = track.closest('.tool-strip');
    if (!strip) return;
    const ICON_PAUSE = '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="1.5" y="1" width="3" height="10" rx=".5"/><rect x="7.5" y="1" width="3" height="10" rx=".5"/></svg>';
    const ICON_PLAY = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 1.2v9.6a.5.5 0 0 0 .76.43l7.7-4.8a.5.5 0 0 0 0-.86l-7.7-4.8a.5.5 0 0 0-.76.43z"/></svg>';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tool-pause';
    const render = paused => {
      btn.innerHTML = paused ? ICON_PLAY : ICON_PAUSE;
      btn.setAttribute('aria-label', paused ? 'Play tool list' : 'Pause tool list');
    };
    btn.addEventListener('click', () => render(strip.classList.toggle('is-paused')));
    render(false);
    strip.appendChild(btn);
  };
})();
