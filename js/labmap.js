/* Lab map: pointing at, tapping or tabbing to a machine shows what it does below the map.
   Each machine's zone and description live on its button (data-zone, data-role). */
(function () {
  'use strict';

  window.initLabMap = function (map, info) {
    if (!map || !info) return;
    const buttons = Array.from(map.querySelectorAll('.lm-m'));
    const zones = Array.from(map.querySelectorAll('.lm-zone'));
    const name = info.querySelector('.lm-info-name');
    const zone = info.querySelector('.lm-info-zone');
    const role = info.querySelector('.lm-info-role');

    function show(btn) {
      buttons.forEach(b => b.classList.toggle('is-on', b === btn));
      zones.forEach(z => z.classList.toggle('is-on', z.dataset.zone === btn.dataset.zone));
      name.textContent = btn.textContent;
      zone.textContent = btn.dataset.zone;
      role.textContent = btn.dataset.role;
    }

    const pick = e => { const b = e.target.closest('.lm-m'); if (b) show(b); };
    map.addEventListener('mouseover', pick);
    map.addEventListener('focusin', pick);
    map.addEventListener('click', pick);

    // Start on the machine marked in the HTML (the website, the attacker's only way in)
    const first = buttons.find(b => b.classList.contains('is-on')) || buttons[0];
    if (first) show(first);
  };
})();
