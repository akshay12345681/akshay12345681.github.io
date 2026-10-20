/* ==========================================================
   Lanyard badge
   A verlet rope (two-strand lanyard) holding a rigid card.
   The card is five particles (four corners + the slot) held
   rigid by distance constraints, so grabbing it anywhere
   produces real torque: grab a corner and it pivots.
   A damped spring adds a 3D turn around the vertical axis,
   driven by how the card accelerates and spins.
   ========================================================== */
(function () {
  'use strict';

  // ---- Tuning ----
  const STEP = 1 / 180;           // fixed physics step (s)
  const GRAVITY = 4200;           // px/s² — lower = floatier, higher = snappier
  const G = GRAVITY * STEP * STEP;
  const ITERATIONS = 12;          // constraint passes per step (stiffness)
  const SEGMENTS = 16;            // rope resolution
  const AIR = 0.9985;             // card air drag per step
  const ROPE_AIR = 0.99;          // rope air drag per step
  const MAX_V = 40;               // px per step, stops runaway throws
  const TWIST_SPRING = 0.0016;    // how fast the card turns back to face you
  const TWIST_DAMP = 0.01;
  const TWIST_FROM_ACCEL = 0.006; // sideways acceleration → turn
  const TWIST_FROM_SPIN = 0.04;   // in-plane spin → turn
  const SVGNS = 'http://www.w3.org/2000/svg';

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  const pt = (x, y, inv) => ({ x, y, px: x, py: y, inv });

  function svg(name, attrs, parent) {
    const e = document.createElementNS(SVGNS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // Move two particles toward a rest distance, weighted by inverse mass.
  // slack = true lets them get closer (a rope), false keeps them exact (a rod).
  function solve(a, b, rest, slack) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1e-6;
    if (slack && d <= rest) return;
    const w = a.inv + b.inv;
    if (!w) return;
    const k = (d - rest) / (d * w);
    a.x += dx * k * a.inv; a.y += dy * k * a.inv;
    b.x -= dx * k * b.inv; b.y -= dy * k * b.inv;
  }

  function integrate(p, air) {
    let vx = (p.x - p.px) * air, vy = (p.y - p.py) * air;
    const v = Math.hypot(vx, vy);
    if (v > MAX_V) { vx *= MAX_V / v; vy *= MAX_V / v; }
    p.px = p.x; p.py = p.y;
    p.x += vx; p.y += vy + G;
  }

  function smooth(points) {
    const f = n => n.toFixed(1);
    let d = `M${f(points[0][0])} ${f(points[0][1])}`;
    for (let i = 1; i < points.length - 1; i++) {
      const mx = (points[i][0] + points[i + 1][0]) / 2;
      const my = (points[i][1] + points[i + 1][1]) / 2;
      d += ` Q${f(points[i][0])} ${f(points[i][1])} ${f(mx)} ${f(my)}`;
    }
    const last = points[points.length - 1];
    return d + ` L${f(last[0])} ${f(last[1])}`;
  }

  class Lanyard {
    /**
     * @param {object} o
     * @param {HTMLElement} o.stage   positioned container
     * @param {HTMLElement} o.badge   the card element
     * @param {HTMLElement} [o.shadow] wall shadow element
     * @param {SVGElement}  [o.ropeShadow] svg for the straps' shadow on the wall
     * @param {SVGElement}  o.rope    svg behind the card (straps)
     * @param {SVGElement}  o.clasp   svg in front of the card (metal clip)
     * @param {HTMLElement} [o.hint]  "grab the badge" label
     */
    constructor(o) {
      Object.assign(this, o);
      this.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.grab = null;
      this.running = false;
      this.visible = true;
      this.restSteps = 0;
      this.loopBound = t => this.loop(t);

      this.buildSvg();
      this.measure();
      this.reset(!this.reduce);
      this.bindEvents();
      this.render();
      this.observe();
    }

    // ---------- Setup ----------
    buildSvg() {
      if (this.ropeShadow) {
        this.backShadow = svg('path', {}, this.ropeShadow);
        this.frontShadow = svg('path', {}, this.ropeShadow);
        this.claspShadow = svg('path', {}, this.ropeShadow);
      }
      this.back = svg('path', { class: 'strand-back' }, this.rope);
      this.front = svg('path', { class: 'strand-front' }, this.rope);
      this.shine = svg('path', { class: 'strand-shine', 'stroke-width': 1.2 }, this.rope);

      const defs = svg('defs', {}, this.clasp);
      const grad = svg('linearGradient', { id: 'lanyardMetal', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      svg('stop', { offset: '0', 'stop-color': 'var(--metal-hi)', style: 'stop-color:var(--metal-hi)' }, grad);
      svg('stop', { offset: '.55', style: 'stop-color:var(--metal-mid)' }, grad);
      svg('stop', { offset: '1', style: 'stop-color:var(--metal-lo)' }, grad);

      this.claspG = svg('g', {}, this.clasp);
      this.crimp = svg('rect', { class: 'crimp', rx: 2 }, this.claspG);
      this.band = svg('rect', { fill: 'url(#lanyardMetal)', rx: 1 }, this.claspG);
      this.swivel = svg('rect', { fill: 'url(#lanyardMetal)' }, this.claspG);
      this.ring = svg('circle', { fill: 'none', stroke: 'url(#lanyardMetal)', 'stroke-width': 2.2 }, this.claspG);
    }

    measure() {
      const cs = getComputedStyle(this.stage);
      this.W = this.stage.clientWidth;
      this.H = this.stage.clientHeight;
      this.cw = this.badge.offsetWidth;
      this.ch = this.badge.offsetHeight;

      const slot = this.badge.querySelector('.badge-slot');
      const holeY = slot ? slot.offsetTop + slot.offsetHeight / 2 : this.ch * 0.06;

      this.anchor = { x: this.W * (parseFloat(cs.getPropertyValue('--anchor-x')) || 0.5), y: -40 };
      this.ropeLen = clamp(this.H * 0.3, 140, 230);
      this.segLen = this.ropeLen / SEGMENTS;
      this.clipLen = clamp(this.cw * 0.12, 18, 28);
      this.strapW = clamp(this.cw * 0.05, 7, 11);
      this.spread = this.cw * 0.13;
      this.ringR = Math.max(5, this.cw * 0.035);

      const hw = this.cw / 2, hh = this.ch / 2;
      this.local = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh], [0, -hh + holeY]];

      // static svg geometry
      const s = this.strapW;
      this.back.setAttribute('stroke-width', s);
      this.front.setAttribute('stroke-width', s);
      if (this.ropeShadow) {
        this.backShadow.setAttribute('stroke-width', s);
        this.frontShadow.setAttribute('stroke-width', s);
        this.claspShadow.setAttribute('stroke-width', s * 0.9);
      }
      Object.entries({ x: -s * 0.9, y: -s * 0.62, width: s * 1.5, height: s * 1.24 }).forEach(([k, v]) => this.crimp.setAttribute(k, v));
      Object.entries({ x: s * 0.45, y: -s * 0.62, width: 2.5, height: s * 1.24 }).forEach(([k, v]) => this.band.setAttribute(k, v));
      const swX = s * 0.95, swLen = this.clipLen - swX - this.ringR * 0.55;
      Object.entries({ x: swX, y: -s * 0.36, width: Math.max(swLen, 4), height: s * 0.72, rx: s * 0.36 }).forEach(([k, v]) => this.swivel.setAttribute(k, v));
      this.ring.setAttribute('cx', this.clipLen);
      this.ring.setAttribute('cy', 0);
      this.ring.setAttribute('r', this.ringR);

      if (this.hint) {
        this.hint.style.left = `${this.anchor.x + this.cw / 2 + 28}px`;
        this.hint.style.top = `${this.anchor.y + this.ropeLen + this.clipLen + this.ch * 0.42}px`;
      }
    }

    // Place everything. drop = start held up to the side and let it fall into a swing.
    reset(drop) {
      const a = this.anchor;
      const reach = this.ropeLen + this.clipLen;
      let hole = { x: a.x, y: a.y + reach }, ang = 0;
      if (drop) {
        const theta = 0.85; // rad from vertical
        hole = { x: a.x + Math.sin(theta) * reach * 0.94, y: a.y + Math.cos(theta) * reach * 0.94 };
        ang = -theta + 0.55;
      }
      const [hx0, hy0] = this.local[4];
      const c = Math.cos(ang), s = Math.sin(ang);
      this.body = this.local.map(([lx, ly]) => {
        const rx = lx - hx0, ry = ly - hy0;
        return pt(hole.x + rx * c - ry * s, hole.y + rx * s + ry * c, 1);
      });

      this.links = [];
      for (let i = 0; i < 5; i++) {
        for (let j = i + 1; j < 5; j++) {
          const [ax, ay] = this.local[i], [bx, by] = this.local[j];
          this.links.push([i, j, Math.hypot(bx - ax, by - ay)]);
        }
      }

      const h = this.body[4];
      const d = dist(a, h) || 1;
      const end = { x: h.x - (h.x - a.x) / d * this.clipLen, y: h.y - (h.y - a.y) / d * this.clipLen };
      this.rope = [];
      for (let i = 0; i <= SEGMENTS; i++) {
        const t = i / SEGMENTS;
        this.rope.push(pt(a.x + (end.x - a.x) * t, a.y + (end.y - a.y) * t, i === 0 ? 0 : 2.5));
      }

      this.twist = drop ? 0.5 : 0;
      this.twistV = 0;
      this.lastC = this.center();
      this.lastV = { x: 0, y: 0 };
      this.lastAng = this.angle();
      if (!drop) for (let i = 0; i < 360; i++) this.step();
    }

    // ---------- Simulation ----------
    step() {
      const r = this.rope, b = this.body, g = this.grab;
      for (let i = 1; i < r.length; i++) integrate(r[i], ROPE_AIR);
      for (const p of b) integrate(p, AIR);

      for (let k = 0; k < ITERATIONS; k++) {
        for (let i = 0; i < SEGMENTS; i++) solve(r[i], r[i + 1], this.segLen, true);
        solve(r[SEGMENTS], b[4], this.clipLen, false);
        if (g) for (let j = 0; j < 5; j++) solve(g.p, b[j], g.rest[j], false);
        for (const [i, j, len] of this.links) solve(b[i], b[j], len, false);
      }
      this.updateTwist();
    }

    updateTwist() {
      const c = this.center(), ang = this.angle();
      const vx = c.x - this.lastC.x, vy = c.y - this.lastC.y;
      const ax = vx - this.lastV.x;
      let spin = ang - this.lastAng;
      if (spin > Math.PI) spin -= 2 * Math.PI; else if (spin < -Math.PI) spin += 2 * Math.PI;

      this.twistV += -TWIST_SPRING * this.twist - TWIST_DAMP * this.twistV + ax * TWIST_FROM_ACCEL + spin * TWIST_FROM_SPIN;
      this.twist += this.twistV;
      if (Math.abs(this.twist) > 0.8) { this.twist = Math.sign(this.twist) * 0.8; this.twistV *= -0.3; }

      this.lastC = c; this.lastV = { x: vx, y: vy }; this.lastAng = ang;
    }

    center() {
      const b = this.body;
      return { x: (b[0].x + b[1].x + b[2].x + b[3].x) / 4, y: (b[0].y + b[1].y + b[2].y + b[3].y) / 4 };
    }

    angle() {
      const b = this.body;
      return Math.atan2(b[1].y - b[0].y, b[1].x - b[0].x);
    }

    // ---------- Drawing ----------
    render() {
      const c = this.center(), ang = this.angle(), tw = this.twist;
      const x = c.x - this.cw / 2, y = c.y - this.ch / 2;

      const st = this.badge.style;
      st.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${ang.toFixed(4)}rad) perspective(${this.cw * 5}px) rotateY(${tw.toFixed(4)}rad)`;
      const sin = Math.sin(tw);
      st.setProperty('--tw', sin.toFixed(3));
      const shade = Math.min(Math.abs(sin) * 0.32, 0.28).toFixed(3);
      st.setProperty('--shade-l', tw < 0 ? shade : 0);
      st.setProperty('--shade-r', tw > 0 ? shade : 0);

      if (this.shadow) {
        const lift = this.grab ? 1.6 : 1;
        this.shadow.style.transform =
          `translate3d(${(x + 14 * lift).toFixed(2)}px,${(y + 24 * lift).toFixed(2)}px,0) rotate(${ang.toFixed(4)}rad) scaleX(${Math.max(Math.abs(Math.cos(tw)), 0.12).toFixed(3)})`;
        this.shadow.style.opacity = this.grab ? 0.4 : 0.55;
      }

      // Two straps that meet at the clip, like a lanyard around a neck
      const r = this.rope, n = r.length, front = [], back = [], shine = [];
      for (let i = 0; i < n; i++) {
        const p0 = r[Math.max(i - 1, 0)], p1 = r[Math.min(i + 1, n - 1)];
        const tx = p1.x - p0.x, ty = p1.y - p0.y, len = Math.hypot(tx, ty) || 1;
        const nx = -ty / len, ny = tx / len;
        const spread = this.spread * Math.pow(1 - i / (n - 1), 1.2);
        front.push([r[i].x + nx * spread, r[i].y + ny * spread]);
        back.push([r[i].x - nx * spread, r[i].y - ny * spread]);
        const o = spread + this.strapW * 0.3;
        shine.push([r[i].x + nx * o, r[i].y + ny * o]);
      }
      this.back.setAttribute('d', smooth(back));
      this.front.setAttribute('d', smooth(front));
      this.shine.setAttribute('d', smooth(shine.slice(0, -2)));

      const e = r[n - 1], h = this.body[4];
      if (this.ropeShadow) {
        const backD = smooth(back), frontD = smooth(front);
        this.backShadow.setAttribute('d', backD);
        this.frontShadow.setAttribute('d', frontD);
        this.claspShadow.setAttribute('d', `M${e.x.toFixed(1)} ${e.y.toFixed(1)} L${h.x.toFixed(1)} ${h.y.toFixed(1)}`);
      }
      const a = Math.atan2(h.y - e.y, h.x - e.x) * 180 / Math.PI;
      this.claspG.setAttribute('transform', `translate(${e.x.toFixed(1)} ${e.y.toFixed(1)}) rotate(${a.toFixed(2)})`);
    }

    // ---------- Loop ----------
    wake() {
      this.restSteps = 0;
      if (this.running || !this.visible) return;
      this.running = true;
      this.last = performance.now();
      this.acc = 0;
      requestAnimationFrame(this.loopBound);
    }

    loop(now) {
      if (!this.visible) { this.running = false; return; }
      const dt = Math.min((now - this.last) / 1000, 0.05);
      this.last = now;
      this.acc += dt;
      const steps = Math.floor(this.acc / STEP);
      this.acc -= steps * STEP;

      const g = this.grab;
      for (let k = 0; k < steps; k++) {
        if (g) {
          const t = (k + 1) / steps;
          g.p.x = g.from.x + (g.target.x - g.from.x) * t;
          g.p.y = g.from.y + (g.target.y - g.from.y) * t;
        }
        this.step();
      }
      if (g && steps) g.from = { x: g.target.x, y: g.target.y };
      this.render();

      // Sleep once the badge has come to rest
      let speed = 0;
      for (const p of this.body) speed = Math.max(speed, Math.abs(p.x - p.px) + Math.abs(p.y - p.py));
      if (!g && speed < 0.004 && Math.abs(this.twistV) < 1e-4) this.restSteps += steps; else this.restSteps = 0;
      if (this.restSteps > 240) { this.running = false; return; }

      requestAnimationFrame(this.loopBound);
    }

    observe() {
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => {
          this.visible = entry.isIntersecting;
          if (this.visible) this.wake();
        }).observe(this.stage);
      }
      this.wake();
    }

    // ---------- Input ----------
    toStage(e) {
      const r = this.stage.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    withinReach(p) {
      const a = this.anchor, max = this.grab.reach;
      let dx = p.x - a.x, dy = p.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d > max) { dx *= max / d; dy *= max / d; }
      return { x: a.x + dx, y: Math.min(a.y + dy, this.H + 60) };
    }

    bindEvents() {
      const b = this.badge;
      b.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const p = this.toStage(e);
        const gp = pt(p.x, p.y, 0);
        this.grab = {
          p: gp,
          rest: this.body.map(q => dist(gp, q)),
          reach: (this.ropeLen + this.clipLen + dist(gp, this.body[4])) * 0.98,
          from: { x: p.x, y: p.y },
          target: { x: p.x, y: p.y },
        };
        b.setPointerCapture(e.pointerId);
        b.classList.add('is-grabbed');
        this.dismissHint();
        this.wake();
        e.preventDefault();
      });
      b.addEventListener('pointermove', e => {
        if (this.grab) this.grab.target = this.withinReach(this.toStage(e));
      });
      const release = () => {
        if (!this.grab) return;
        this.grab = null;
        b.classList.remove('is-grabbed');
        this.wake();
      };
      b.addEventListener('pointerup', release);
      b.addEventListener('pointercancel', release);
      b.addEventListener('lostpointercapture', release);

      b.addEventListener('keydown', e => {
        const push = { ArrowLeft: [-4, 0], ArrowRight: [4, 0], ArrowUp: [0, -5], ArrowDown: [0, 2] }[e.key];
        if (!push) return;
        // Push the bottom of the card harder than the top so it swings and turns
        this.body.forEach((p, i) => {
          const f = i === 2 || i === 3 ? 1.3 : 0.6;
          p.px -= push[0] * f; p.py -= push[1] * f;
        });
        this.dismissHint();
        this.wake();
        e.preventDefault();
      });

      let timer;
      window.addEventListener('resize', () => {
        clearTimeout(timer);
        timer = setTimeout(() => this.onResize(), 150);
      });
    }

    onResize() {
      const old = { W: this.W, H: this.H, cw: this.cw, ax: this.anchor.x };
      this.measure();
      if (old.H !== this.H || old.cw !== this.cw) {
        this.reset(false);
      } else {
        const dx = this.anchor.x - old.ax;
        for (const p of this.rope.concat(this.body)) { p.x += dx; p.px += dx; }
        this.lastC = this.center();
      }
      this.render();
      this.wake();
    }

    dismissHint() {
      if (this.hint) this.hint.classList.add('is-gone');
    }
  }

  window.Lanyard = Lanyard;
})();
