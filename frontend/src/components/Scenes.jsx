import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const css = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
const dark = () => document.documentElement.dataset.theme === 'dark';

/* Shared bootstrap: renderer, resize, pause when off-screen, full disposal. build() returns update(t, pointer). */
function useScene(build, deps = []) {
  const host = useRef(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { return undefined; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    const update = build(scene, camera);
    const pointer = { x: 0, y: 0 };
    const onMove = (e) => { const b = el.getBoundingClientRect(); pointer.x = ((e.clientX - b.left) / b.width - 0.5) * 2; pointer.y = ((e.clientY - b.top) / b.height - 0.5) * 2; };
    window.addEventListener('pointermove', onMove);
    const resize = () => { const w = el.clientWidth || 300; const h = el.clientHeight || 300; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();
    let visible = true;
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; }); io.observe(el);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clock = new THREE.Clock();
    let raf;
    const loop = () => { raf = requestAnimationFrame(loop); if (!visible || document.hidden) return; update(reduce ? 0 : clock.getElapsedTime(), pointer); renderer.render(scene, camera); };
    loop();
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); window.removeEventListener('pointermove', onMove);
      scene.traverse((o) => { o.geometry?.dispose(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach((mm) => { mm.map?.dispose(); mm.dispose(); }); });
      renderer.dispose(); renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return host;
}

function chip(lines, { w = 512, h = 256, bg = '#ffffff', fg = '#0e1730', border = '#c6d0e3' } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.shadowColor = 'rgba(14,23,48,.25)'; g.shadowBlur = 24; g.shadowOffsetY = 8;
  g.fillStyle = bg; g.beginPath(); g.roundRect(24, 20, w - 48, h - 52, 30); g.fill();
  g.shadowColor = 'transparent'; g.lineWidth = 3; g.strokeStyle = border; g.stroke();
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l) => { g.font = l.font; g.fillStyle = l.color || fg; g.fillText(l.text, w / 2, l.y); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/* ---------- Hero: a quiet field of result bars, one highlighted, breathing slowly like a live class chart ---------- */
export function HeroScene() {
  const host = useScene((scene, camera) => {
    const isDark = dark();
    const low = new THREE.Color(isDark ? 0x24365e : 0x9fb3d6);
    const high = new THREE.Color(isDark ? 0x5b9df5 : 0x2f5fb3);
    const accent = new THREE.Color(isDark ? 0xe0a94a : 0x1f3d78);
    camera.position.set(8.4, 7.2, 10.6); camera.lookAt(0, 0.8, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, isDark ? 0x1a2744 : 0xcdd8ee, isDark ? 1.0 : 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, isDark ? 1.9 : 2.2); sun.position.set(6, 10, 5); scene.add(sun);
    const root = new THREE.Group(); scene.add(root);
    const N = 7;
    const bars = [];
    for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1, 0.68), new THREE.MeshStandardMaterial({ color: low.clone(), roughness: 0.55, metalness: 0.04 }));
      m.position.set((x - (N - 1) / 2) * 0.9, 0, (z - (N - 1) / 2) * 0.9);
      root.add(m);
      bars.push({ m, ph: x * 0.5 + z * 0.8, hi: x === 4 && z === 2 });
    }
    const base = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.14, 6.4), new THREE.MeshStandardMaterial({ color: isDark ? 0x131c33 : 0xe3e8f3, roughness: 0.8 }));
    base.position.y = -0.08; root.add(base);
    const tmp = new THREE.Color();
    return (t, p) => {
      bars.forEach(({ m, ph, hi }) => {
        const k = Math.sin(t * 0.7 + ph) * 0.5 + 0.5;
        const h = 0.6 + k * 2.3 + (hi ? 1.5 : 0);
        m.scale.y = h; m.position.y = h / 2;
        m.material.color.copy(hi ? accent : tmp.copy(low).lerp(high, k));
      });
      root.rotation.y += ((p.x * 0.4 + t * 0.07) - root.rotation.y) * 0.05;
      root.rotation.x += (p.y * 0.05 - root.rotation.x) * 0.05;
    };
  }, [document.documentElement.dataset.theme]);
  return <div ref={host} className="canvas-box" aria-hidden="true" />;
}

/* ---------- Ranking podium ---------- */
export function PodiumScene({ top }) {
  const key = JSON.stringify(top.map((t) => [t.student_name, t.gpa])) + document.documentElement.dataset.theme;
  const host = useScene((scene, camera) => {
    const isDark = dark();
    camera.position.set(0, 3.4, 11); camera.lookAt(0, 1.7, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, isDark ? 0x1a2766 : 0xcdd8f5, 1.3));
    const l = new THREE.DirectionalLight(0xffffff, 2.2); l.position.set(3, 8, 6); scene.add(l);
    const root = new THREE.Group(); scene.add(root);
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(4.7, 4.9, 0.2, 64), new THREE.MeshStandardMaterial({ color: isDark ? 0x1a2350 : 0xdfe4f6, roughness: 0.7 })); floor.position.y = -0.1; root.add(floor);
    const slots = [{ i: 1, x: -2.35, h: 1.7, c: 0x8d9bb8 }, { i: 0, x: 0, h: 2.6, c: 0xd7a043 }, { i: 2, x: 2.35, h: 1.2, c: 0xa8734a }];
    const medals = [];
    slots.forEach((s) => {
      const p = top[s.i]; if (!p) return;
      const block = new THREE.Mesh(new THREE.BoxGeometry(1.9, s.h, 1.9), new THREE.MeshStandardMaterial({ color: s.c, roughness: 0.4 })); block.position.set(s.x, s.h / 2, 0); root.add(block);
      const num = new THREE.Sprite(new THREE.SpriteMaterial({ map: chip([{ text: String(s.i + 1), font: '700 150px "Sora", sans-serif', y: 118, color: 'rgba(255,255,255,0.92)' }], { w: 256, h: 256, bg: 'rgba(255,255,255,0)', border: 'rgba(255,255,255,0)' }), transparent: true })); num.scale.set(1.5, 1.5, 1); num.position.set(s.x, s.h / 2, 1.05); root.add(num);
      const medal = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.12, 16, 40), new THREE.MeshStandardMaterial({ color: 0xe0a53a, roughness: 0.25, metalness: 0.7 })); medal.position.set(s.x, s.h + 0.85, 0); root.add(medal); medals.push(medal);
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: chip([{ text: p.student_name.split(' ')[0], font: '700 64px "Sora", sans-serif', y: 82 }, { text: `GPA ${Number(p.gpa).toFixed(2)}`, font: '500 46px "Red Hat Mono", monospace', y: 158, color: '#1f3d78' }], { w: 512, h: 240 }), transparent: true })); tag.scale.set(2.5, 1.17, 1); tag.position.set(s.x, s.h + 1.95, 0.3); root.add(tag);
    });
    return (t, p) => {
      medals.forEach((m, i) => { m.rotation.y = t * 1.5 + i; });
      root.rotation.y += ((p.x * 0.45 + Math.sin(t * 0.4) * 0.1) - root.rotation.y) * 0.05;
    };
  }, [key]);
  return <div ref={host} className="canvas-box" style={{ aspectRatio: '16 / 8', maxHeight: 380 }} aria-hidden="true" />;
}
