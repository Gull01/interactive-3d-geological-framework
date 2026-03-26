/* ============================================
   drillhole.js — Grand Canyon Boreholes (Three.js)
   Based on USGS measured stratigraphic sections
   Reference: Beus & Morales (2003) "Grand Canyon Geology"
   Billingsley et al. (1997) USGS Geologic Map GQ-1747
   ============================================ */

let drillScene, drillCamera, drillRenderer, drillControls;
let drillLabels = [];
let drillLabelGroup;

// Decoupled stratigraphy and boreholes from data.json

function initDrillHoles() {
  const container = document.getElementById('drillCanvas');
  const w = container.clientWidth, h = container.clientHeight;

  drillScene = new THREE.Scene();
  drillScene.background = new THREE.Color(0xeef2f7);

  drillCamera = new THREE.PerspectiveCamera(50, w / h, 1, 3000);
  drillCamera.position.set(180, 220, 300);

  drillRenderer = new THREE.WebGLRenderer({ antialias: true });
  drillRenderer.setSize(w, h);
  drillRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(drillRenderer.domElement);

  drillControls = new THREE.OrbitControls(drillCamera, drillRenderer.domElement);
  drillControls.enableDamping = true;
  drillControls.dampingFactor = 0.08;
  drillControls.target.set(0, -60, 0);

  // Lights
  drillScene.add(new THREE.AmbientLight(0x554433, 0.7));
  const sun = new THREE.DirectionalLight(0xffe8cc, 1.0);
  sun.position.set(120, 220, 160);
  drillScene.add(sun);
  const fill = new THREE.DirectionalLight(0x88aacc, 0.25);
  fill.position.set(-100, 80, -80);
  drillScene.add(fill);

  // Surface
  const groundGeo = new THREE.PlaneGeometry(300, 300);
  groundGeo.rotateX(-Math.PI / 2);
  drillScene.add(new THREE.Mesh(groundGeo, new THREE.MeshLambertMaterial({
    color: 0xc8d0c0, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
  })));

  const grid = new THREE.GridHelper(300, 20, 0xbbc4b8, 0xd0d8d0);
  grid.position.y = 0.5;
  drillScene.add(grid);

  // Depth markers every 200m
  for (let d = 200; d <= 1700; d += 200) {
    const dPlane = new THREE.PlaneGeometry(300, 0.5);
    dPlane.rotateX(-Math.PI / 2);
    const dMesh = new THREE.Mesh(dPlane, new THREE.MeshBasicMaterial({
      color: 0xd0d8e0, transparent: true, opacity: 0.3, side: THREE.DoubleSide,
    }));
    dMesh.position.y = -d * 0.18;
    drillScene.add(dMesh);

    const dLabel = makeTextSprite(`${d}m`, 0.5);
    dLabel.position.set(-158, -d * 0.18, 0);
    drillScene.add(dLabel);
  }

  drillLabelGroup = new THREE.Group();
  drillScene.add(drillLabelGroup);

  const depthScale = 0.18;
  const radius = 3.5;

  const BOREHOLES = window.appData.boreholes;
  const LITHO = window.appData.stratigraphy;

  BOREHOLES.forEach(bh => {
    const group = new THREE.Group();
    group.position.set(bh.x, 0, bh.z);

    let currentDepth = 0;
    bh.intervals.forEach(iv => {
      const from = currentDepth;
      const to = iv.depthTo;
      const thickness = (to - from) * depthScale;
      const litho = LITHO[iv.lithoId];
      if (!litho) return;

      const geo = new THREE.CylinderGeometry(radius, radius, thickness, 16);
      const mat = new THREE.MeshPhongMaterial({ color: parseInt(litho.color), shininess: 35 });
      const cyl = new THREE.Mesh(geo, mat);
      cyl.position.y = -((from + to) / 2) * depthScale;
      group.add(cyl);

      // Ring between intervals
      if (from > 0) {
        const ringGeo = new THREE.TorusGeometry(radius + 0.3, 0.25, 4, 16);
        const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x0a0a0a }));
        ring.position.y = -from * depthScale;
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
      }
      currentDepth = to;
    });

    const totalDepth = currentDepth;

    // Collar marker
    const collar = new THREE.Mesh(
      new THREE.SphereGeometry(5.5, 16, 16),
      new THREE.MeshPhongMaterial({ color: 0xf59e0b, emissive: 0x553300 })
    );
    collar.position.y = 3;
    group.add(collar);

    // Bottom
    const bottom = new THREE.Mesh(
      new THREE.ConeGeometry(4, 8, 8),
      new THREE.MeshPhongMaterial({ color: 0xef4444 })
    );
    bottom.position.y = -totalDepth * depthScale - 4;
    bottom.rotation.x = Math.PI;
    group.add(bottom);

    // Deviation trace (vertical for now)
    const pts = [];
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const d = t * totalDepth * depthScale;
      pts.push(new THREE.Vector3(0, -d, 0));
    }
    group.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.5 })
    ));

    drillScene.add(group);

    // Label
    const label = makeTextSprite(`${bh.id}\n${bh.name}\n${totalDepth}m TD`);
    label.position.set(bh.x, 24, bh.z);
    drillLabelGroup.add(label);
    drillLabels.push(label);
  });

  const legendEl = document.getElementById('drillLegend');
  if (legendEl) {
    const seen = new Map();
    BOREHOLES.forEach(bh => bh.intervals.forEach(iv => {
      const litho = LITHO[iv.lithoId];
      if (litho && !seen.has(litho.name)) seen.set(litho.name, litho);
    }));
    let html = '<h4>Stratigraphy</h4>';
    seen.forEach((litho, name) => {
      const hex = '#' + parseInt(litho.color).toString(16).padStart(6, '0');
      html += `<div class="legend-item"><div class="legend-color" style="background:${hex}"></div><span class="legend-label" title="${litho.age}">${name}</span></div>`;
    });
    legendEl.innerHTML = html;
  }

  document.getElementById('drillSpinner').classList.add('hidden');

  function animate() {
    requestAnimationFrame(animate);
    drillControls.update();
    drillLabels.forEach(s => s.lookAt(drillCamera.position));
    drillRenderer.render(drillScene, drillCamera);
  }
  animate();

  const ro = new ResizeObserver(() => {
    const w2 = container.clientWidth, h2 = container.clientHeight;
    drillCamera.aspect = w2 / h2;
    drillCamera.updateProjectionMatrix();
    drillRenderer.setSize(w2, h2);
  });
  ro.observe(container);
}

function makeTextSprite(text, scaleFactor = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 320; canvas.height = 160;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  roundRect(ctx, 4, 4, 312, 152, 16); ctx.fill();
  ctx.strokeStyle = 'rgba(37,99,235,0.3)'; ctx.lineWidth = 2;
  roundRect(ctx, 4, 4, 312, 152, 16); ctx.stroke();

  const lines = text.split('\n');
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1e293b'; ctx.font = 'bold 26px Inter,Arial,sans-serif';
  ctx.fillText(lines[0], 160, 44);
  if (lines[1]) { ctx.fillStyle = '#475569'; ctx.font = '20px Inter,Arial,sans-serif'; ctx.fillText(lines[1], 160, 80); }
  if (lines[2]) { ctx.fillStyle = '#94a3b8'; ctx.font = '18px Inter,Arial,sans-serif'; ctx.fillText(lines[2], 160, 112); }

  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(32 * scaleFactor, 16 * scaleFactor, 1);
  return sprite;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function toggleLabels(on) {
  drillLabelGroup.visible = on;
  document.getElementById('btnLabelsOn').classList.toggle('active', on);
  document.getElementById('btnLabelsOff').classList.toggle('active', !on);
}
