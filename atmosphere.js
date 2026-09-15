/* One continuous atmosphere for every page and the opaque hero compositor.
 * Only this small background surface changes colour; metal and type are never
 * hue-filtered. The clock freezes on pause / hidden tabs instead of jumping.
 */
(() => {
  'use strict';
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const TAU = Math.PI * 2;
  // Full hue wheel, but ONLY low-luminance pigment colours on a black base.
  // Neighbouring colours interpolate in RGB; the loop never crosses white.
  // 12 x 18-second transitions = 216 seconds. No whole-site hue filters.
  const pigments = [
    [7,54,59], [12,34,66], [29,20,64], [47,18,59],
    [62,15,46], [65,14,29], [66,18,17], [65,33,11],
    [53,47,10], [35,47,11], [12,48,28], [8,53,39]
  ];
  const palettes = pigments.map((a, i) => ({
    top: [2,3,5], bottom: [3,3,5], a,
    b: pigments[(i + 1) % pigments.length],
    c: pigments[(i + pigments.length - 1) % pigments.length]
  }));
  class Atmosphere {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.time = 0;
      this.cycle = 216;
      this.moving = !matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.visible = !document.hidden;
      this.last = 0;
      this.lastPaint = -Infinity;
      this.frameId = 0;
      this.revision = 0;
      this.frame = this.frame.bind(this);
      this.resize = this.resize.bind(this);
      this.visibility = () => {
        this.visible = !document.hidden;
        this.last = 0;
        if (this.visible) this.kick(); else this.stop();
      };
      this.restore = () => { this.visible = !document.hidden; this.resize(); this.kick(); };
      this.makeDither();
      window.addEventListener('resize', this.resize, { passive: true });
      window.addEventListener('pageshow', this.restore);
      document.addEventListener('visibilitychange', this.visibility);
      this.resize();
      this.kick();
    }
    makeDither() {
      const tile = document.createElement('canvas');
      tile.width = tile.height = 128;
      const c = tile.getContext('2d');
      const image = c.createImageData(128, 128);
      let seed = 827;
      for (let i = 0; i < image.data.length; i += 4) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const v = seed >>> 24;
        image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
        image.data[i + 3] = 255;
      }
      c.putImageData(image, 0, 0);
      this.dither = tile;
    }
    resize() {
      if (!this.ctx) return;
      const w = Math.max(1, document.documentElement.clientWidth);
      const h = Math.max(1, window.innerHeight);
      const ratio = Math.min(1, 800 / w, 800 / h);
      this.width = w; this.height = h;
      this.canvas.width = Math.round(w * ratio);
      this.canvas.height = Math.round(h * ratio);
      this.paint();
    }
    colors(t = this.time) {
      const phase = ((t / this.cycle) % 1 + 1) % 1 * palettes.length;
      const index = Math.floor(phase);
      const a = palettes[index], b = palettes[(index + 1) % palettes.length];
      const amount = smooth(phase - index);
      return Object.fromEntries(Object.keys(a).map(key => [key, a[key].map((v, i) => mix(v, b[key][i], amount))]));
    }
    paint() {
      const c = this.ctx;
      if (!c) return;
      const w = this.canvas.width, h = this.canvas.height;
      const p = this.colors(), phase = this.time / this.cycle * TAU;
      const rgb = (v, a = 1) => `rgba(${v.map(x => x.toFixed(2)).join(',')},${a})`;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
      const base = c.createLinearGradient(0, 0, w * .32, h);
      base.addColorStop(0, rgb(p.top)); base.addColorStop(1, rgb(p.bottom));
      c.fillStyle = base; c.fillRect(0, 0, w, h);
      const wash = (x, y, rx, ry, color, alpha) => {
        c.save(); c.translate(w * x, h * y); c.scale(w * rx, h * ry);
        const g = c.createRadialGradient(0, 0, 0, 0, 0, 1);
        g.addColorStop(0, rgb(color, alpha));
        g.addColorStop(.38, rgb(color, alpha * .69));
        g.addColorStop(.72, rgb(color, alpha * .23));
        g.addColorStop(1, rgb(color, 0));
        c.fillStyle = g; c.fillRect(-2, -2, 4, 4); c.restore();
      };
      // Large, softly overlapping fields. No sharp blobs, visible stripes,
      // pointer-following spotlights, or constantly repainting CSS filters.
      wash(.14 + Math.sin(phase) * .12, .34 + Math.sin(phase + .3) * .09,
        .88, 1.04, p.a, .66);
      wash(.84 + Math.sin(phase + 2.5) * .10, .55 + Math.cos(phase + .8) * .12,
        .76, .94, p.b, .43);
      wash(.64 + Math.cos(phase + 1) * .14, .95 + Math.sin(phase + 4) * .07,
        .66, .77, p.c, .24);
      // A black, off-centre veil keeps negative space and genuine black depth
      // throughout every hue, rather than washing the whole viewport in colour.
      const shade = c.createLinearGradient(0, h * .1, w, h * .85);
      shade.addColorStop(0, 'rgba(0,0,0,.15)');
      shade.addColorStop(.42, 'rgba(0,0,0,.05)');
      shade.addColorStop(.74, 'rgba(0,0,0,.43)');
      shade.addColorStop(1, 'rgba(0,0,0,.64)');
      c.fillStyle = shade; c.fillRect(0, 0, w, h);
      // Very fine, stationary dither softens 8-bit banding without visible grain.
      c.globalCompositeOperation = 'soft-light';
      c.globalAlpha = .013;
      c.fillStyle = c.createPattern(this.dither, 'repeat');
      c.fillRect(0, 0, w, h);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      this.revision++;
    }
    drawRegion(ctx, target) {
      if (!this.ctx || !this.width || !this.height) return false;
      const r = target.getBoundingClientRect();
      const sx = this.canvas.width / this.width, sy = this.canvas.height / this.height;
      // The hero samples the SAME viewport-space field as the header and footer.
      // This removes the old dark rectangular seam around the scene.
      ctx.drawImage(this.canvas, r.left * sx, r.top * sy, r.width * sx, r.height * sy,
        0, 0, r.width, r.height);
      return true;
    }
    frame(now) {
      this.frameId = 0;
      if (!this.moving || !this.visible) return;
      if (this.last) this.time += Math.min(.1, Math.max(0, (now - this.last) / 1000));
      this.last = now;
      // The slow background needs only 30 updates/s. Sphere presentation still
      // uses every available display frame and its unchanged 120 Hz solver.
      if (now - this.lastPaint >= 1000 / 30 - .5) { this.paint(); this.lastPaint = now; }
      this.kick();
    }
    setMoving(value) {
      this.moving = !!value; this.last = 0;
      if (this.moving) this.kick(); else this.stop();
    }
    kick() {
      if (this.ctx && this.moving && this.visible && !this.frameId) this.frameId = requestAnimationFrame(this.frame);
    }
    stop() { cancelAnimationFrame(this.frameId); this.frameId = 0; }
    destroy() {
      this.stop();
      window.removeEventListener('resize', this.resize);
      window.removeEventListener('pageshow', this.restore);
      document.removeEventListener('visibilitychange', this.visibility);
    }
  }
  const target = document.getElementById('site-atmosphere');
  if (target) window.RebuubAtmosphere = new Atmosphere(target);
})();
