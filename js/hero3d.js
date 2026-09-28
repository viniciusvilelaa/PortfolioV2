// <hero-3d> — rotating wireframe icosahedron with orbit rings, tinted from the Nocturne tokens.
(() => {
  if (customElements.get('hero-3d')) return;
  const cssColor = (name, fallback) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
    const c = document.createElement('canvas').getContext('2d');
    c.fillStyle = fallback; c.fillStyle = v; return c.fillStyle;
  };
  class Hero3D extends HTMLElement {
    connectedCallback() {
      this.style.display = 'block'; this.style.position = 'relative';
      if (!this.style.width) this.style.width = '100%';
      if (!this.style.height) this.style.height = '100%';
      this._alive = true;
      import('https://unpkg.com/three@0.160.0/build/three.module.js').then(T => this._alive && this._init(T));
    }
    disconnectedCallback() {
      this._alive = false; cancelAnimationFrame(this._raf);
      this._ro && this._ro.disconnect();
      removeEventListener('pointermove', this._onMove);
      if (this._r) { this._r.dispose(); this._r.domElement.remove(); }
    }
    _init(T) {
      const accent = new T.Color(cssColor('--color-accent', '#9184d9'));
      const soft = new T.Color(cssColor('--color-accent-700', '#4a4280'));
      const text = new T.Color(cssColor('--color-text', '#e9e9ed'));
      const r = this._r = new T.WebGLRenderer({ antialias: true, alpha: true });
      r.setPixelRatio(Math.min(devicePixelRatio, 2));
      r.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
      this.appendChild(r.domElement);
      const scene = new T.Scene();
      const cam = new T.PerspectiveCamera(40, 1, 0.1, 100); cam.position.set(0, 0, 8.6);
      const root = new T.Group(); scene.add(root);

      // core: icosahedron edges + vertex points
      const ico = new T.IcosahedronGeometry(1.45, 2);
      const edges = new T.LineSegments(new T.EdgesGeometry(ico, 1), new T.LineBasicMaterial({ color: soft, transparent: true, opacity: 0.9 }));
      root.add(edges);
      const pts = new T.Points(ico, new T.PointsMaterial({ color: accent, size: 0.045, sizeAttenuation: true }));
      root.add(pts);
      // inner solid, faint
      const inner = new T.Mesh(new T.IcosahedronGeometry(0.62, 0), new T.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0.55 }));
      root.add(inner);
      // orbit rings with a travelling dot
      const rings = [];
      [[2.15, 1.1, 0.3], [2.5, -0.5, 1.2]].forEach(([rad, rx, rz], i) => {
        const g = new T.Group(); g.rotation.set(rx, 0, rz);
        const curve = new T.EllipseCurve(0, 0, rad, rad);
        const line = new T.Line(new T.BufferGeometry().setFromPoints(curve.getPoints(160)), new T.LineBasicMaterial({ color: i ? soft : accent, transparent: true, opacity: i ? 0.6 : 0.45 }));
        const dot = new T.Mesh(new T.SphereGeometry(0.05, 16, 16), new T.MeshBasicMaterial({ color: text }));
        g.add(line, dot); root.add(g); rings.push({ dot, rad, speed: i ? -0.35 : 0.5 });
      });
      // dust
      const N = 260, pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { const v = new T.Vector3().randomDirection().multiplyScalar(2.6 + Math.random() * 0.5); pos.set([v.x, v.y, v.z], i * 3); }
      const dustG = new T.BufferGeometry(); dustG.setAttribute('position', new T.BufferAttribute(pos, 3));
      const dust = new T.Points(dustG, new T.PointsMaterial({ color: soft, size: 0.022, transparent: true, opacity: 0.8 }));
      scene.add(dust);

      const size = () => { const w = this.clientWidth || 1, h = this.clientHeight || 1; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
      this._ro = new ResizeObserver(size); this._ro.observe(this); size();

      const target = { x: 0, y: 0 };
      this._onMove = e => { const b = this.getBoundingClientRect(); target.x = ((e.clientX - b.left) / b.width - 0.5) * 2; target.y = ((e.clientY - b.top) / b.height - 0.5) * 2; };
      addEventListener('pointermove', this._onMove, { passive: true });
      const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const clock = new T.Clock();
      const tick = () => {
        const t = still ? 0 : clock.getElapsedTime();
        root.rotation.y += ((t * 0.18 + target.x * 0.5) - root.rotation.y) * 0.06;
        root.rotation.x += ((target.y * 0.35 + 0.2) - root.rotation.x) * 0.06;
        inner.rotation.set(-t * 0.6, t * 0.8, 0);
        const s = 1 + Math.sin(t * 1.4) * 0.015; edges.scale.setScalar(s); pts.scale.setScalar(s);
        rings.forEach(({ dot, rad, speed }) => dot.position.set(Math.cos(t * speed) * rad, Math.sin(t * speed) * rad, 0));
        dust.rotation.y = t * 0.02;
        r.render(scene, cam);
        this._raf = requestAnimationFrame(tick);
      };
      tick();
    }
  }
  customElements.define('hero-3d', Hero3D);
})();
