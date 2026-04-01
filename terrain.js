/* ============================================
   terrain.js — Grand Canyon 3D Terrain (Three.js)
   Real SRTM elevation data via AWS Terrain Tiles
   ============================================ */

let terrainScene, terrainCamera, terrainRenderer, terrainControls;
let terrainMesh, terrainWireMesh;
let terrainMode = 'solid';

// Decoupled configuration loaded from data.json

// Decode Terrarium RGB → elevation (m)
function terrariumToElevation(r, g, b) {
  return (r * 256 + g + b / 256) - 32768;
}

function hypsometricColor(elevation, minElev = 700, maxElev = 2300) {
  const range = maxElev - minElev || 1;
  const h = Math.max(0, Math.min(1, (elevation - minElev) / range));
  const stops = [
    { t: 0.00, r: 80,  g: 50,  b: 30  },   // Lowest — deep brown
    { t: 0.10, r: 140, g: 70,  b: 40  },   // dark brown
    { t: 0.20, r: 180, g: 100, b: 60  },   // red-brown
    { t: 0.35, r: 200, g: 130, b: 80  },   // tan
    { t: 0.50, r: 190, g: 150, b: 110 },   // salmon
    { t: 0.65, r: 210, g: 180, b: 140 },   // buff
    { t: 0.80, r: 180, g: 170, b: 140 },   // grey-tan
    { t: 0.90, r: 100, g: 130, b: 80  },   // Rim forest — green
    { t: 1.00, r: 60,  g: 100, b: 55  },   // North Rim forest — dark green
  ];
  let i = 0;
  while (i < stops.length - 1 && stops[i + 1].t < h) i++;
  if (i >= stops.length - 1) {
    const s = stops[stops.length - 1];
    return new THREE.Color(s.r / 255, s.g / 255, s.b / 255);
  }
  const a = stops[i], b = stops[i + 1];
  const t = (h - a.t) / (b.t - a.t);
  return new THREE.Color(
    (a.r + t * (b.r - a.r)) / 255,
    (a.g + t * (b.g - a.g)) / 255,
    (a.b + t * (b.b - a.b)) / 255
  );
}

// === Fallback terrain: Grand Canyon profile ===
const Noise = (() => {
  const perm = new Uint8Array(512);
  const grad3 = [
    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
  ];
  const p = [];
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  function dot(g, x, y) { return g[0] * x + g[1] * y; }
  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + t * (b - a); }
  return {
    perlin2(x, y) {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
      x -= Math.floor(x); y -= Math.floor(y);
      const u = fade(x), v = fade(y);
      const a = perm[X] + Y, b2 = perm[X + 1] + Y;
      return lerp(
        lerp(dot(grad3[perm[a] % 12], x, y), dot(grad3[perm[b2] % 12], x - 1, y), u),
        lerp(dot(grad3[perm[a + 1] % 12], x, y - 1), dot(grad3[perm[b2 + 1] % 12], x - 1, y - 1), u), v
      );
    },
    fbm(x, y, octaves = 6) {
      let val = 0, amp = 1, freq = 1, max = 0;
      for (let i = 0; i < octaves; i++) {
        val += amp * this.perlin2(x * freq, y * freq);
        max += amp; amp *= 0.5; freq *= 2.1;
      }
      return val / max;
    }
  };
})();

function generateFallbackTerrain(grid) {
  const elevations = new Float32Array(grid * grid);
  for (let j = 0; j < grid; j++) {
    for (let i = 0; i < grid; i++) {
      const nx = i / grid, ny = j / grid;
      // Plateau at ~2100m with a canyon carved through the middle
      let base = 2100;
      // Canyon: wide V-shape centered around ny=0.5
      const canyonCenter = 0.5 + 0.08 * Math.sin(nx * Math.PI * 3);
      const distToCanyon = Math.abs(ny - canyonCenter);
      const canyonWidth = 0.18;
      if (distToCanyon < canyonWidth) {
        const t = distToCanyon / canyonWidth;
        // Stepped canyon profile (terraces)
        let depth = 1400 * (1 - t * t);
        // Add step-like terraces
        const steps = [0.2, 0.4, 0.6, 0.8];
        steps.forEach(s => {
          if (t < s) depth += 30;
        });
        base -= depth;
      }
      // Noise for texture
      base += Noise.fbm(nx * 8 + 3.7, ny * 8 + 1.2, 5) * 80;
      base += Noise.fbm(nx * 20 + 5.1, ny * 20 + 8.3, 3) * 20;
      elevations[j * grid + i] = Math.max(720, base);
    }
  }
  return elevations;
}

function buildTerrainMesh(elevations, grid, container) {
  const scale = 450;
  const geometry = new THREE.PlaneGeometry(scale, scale, grid - 1, grid - 1);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);

  let minE = Infinity, maxE = -Infinity;
  for (let i = 0; i < elevations.length; i++) {
    if (elevations[i] < minE) minE = elevations[i];
    if (elevations[i] > maxE) maxE = elevations[i];
  }

  // Update info overlay
  const infoP = container.querySelector('.info-overlay p');
  if (infoP) {
    const terrainSource = window.appData.terrain && window.appData.terrain.mode === 'embedded'
      ? (window.appData.terrain.sourceName || 'User raster')
      : 'Real SRTM terrain data';
    infoP.textContent = `${terrainSource} · ${window.appData.metadata.region} · ${grid}×${grid} grid · Elevation range ${Math.round(minE)}–${Math.round(maxE)} m`;
  }

  // Update legend
  const legendEl = document.getElementById('terrainLegend');
  if (legendEl) {
    const range = maxE - minE;
    legendEl.innerHTML = `
      <h4>Elevation (m)</h4>
      <div class="legend-item"><div class="legend-color" style="background:rgb(80,50,30)"></div><span class="legend-label">${Math.round(minE)} – ${Math.round(minE + range * 0.15)}</span></div>
      <div class="legend-item"><div class="legend-color" style="background:rgb(180,100,60)"></div><span class="legend-label">${Math.round(minE + range * 0.15)} – ${Math.round(minE + range * 0.35)}</span></div>
      <div class="legend-item"><div class="legend-color" style="background:rgb(200,130,80)"></div><span class="legend-label">${Math.round(minE + range * 0.35)} – ${Math.round(minE + range * 0.55)}</span></div>
      <div class="legend-item"><div class="legend-color" style="background:rgb(210,180,140)"></div><span class="legend-label">${Math.round(minE + range * 0.55)} – ${Math.round(minE + range * 0.75)}</span></div>
      <div class="legend-item"><div class="legend-color" style="background:rgb(180,170,140)"></div><span class="legend-label">${Math.round(minE + range * 0.75)} – ${Math.round(minE + range * 0.9)}</span></div>
      <div class="legend-item"><div class="legend-color" style="background:rgb(60,100,55)"></div><span class="legend-label">${Math.round(minE + range * 0.9)} – ${Math.round(maxE)}</span></div>
    `;
  }

  const heightScale = 0.10;
  for (let i = 0; i < positions.count; i++) {
    const elev = elevations[i] || 1500;
    positions.setY(i, (elev - minE) * heightScale);
    const c = hypsometricColor(elev, minE, maxE);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  // Solid mesh
  terrainMesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({
    vertexColors: true, side: THREE.DoubleSide,
  }));
  terrainScene.add(terrainMesh);

  // Wireframe
  terrainWireMesh = new THREE.Mesh(geometry.clone(), new THREE.MeshBasicMaterial({
    color: 0x3b82f6, wireframe: true, transparent: true, opacity: 0.12,
  }));
  terrainScene.add(terrainWireMesh);
  terrainWireMesh.visible = false;

  // Colorado River water level (~720m)
  const waterGeo = new THREE.PlaneGeometry(scale * 1.5, scale * 1.5);
  waterGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeo, new THREE.MeshPhongMaterial({
    color: 0x1a6a8e, transparent: true, opacity: 0.3, shininess: 90,
  }));
  water.position.y = (760 - minE) * heightScale;
  terrainScene.add(water);
}

function initTerrain() {
  const container = document.getElementById('terrainCanvas');
  const w = container.clientWidth, h = container.clientHeight;
  const config = window.appData.terrain;
  const grid = config.gridSize;

  if (config && config.mode === 'embedded' && config.grid && Array.isArray(config.grid.values)) {
    const embedded = config.grid;
    const rows = embedded.values.length;
    const cols = embedded.values[0].length;
    const elevations = new Float32Array(rows * cols);
    let i = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const value = embedded.values[row][col];
        elevations[i++] = value === null || value === undefined ? 0 : Number(value);
      }
    }

    terrainScene = new THREE.Scene();
    terrainScene.background = new THREE.Color(0xeef2f7);
    terrainScene.fog = new THREE.FogExp2(0xeef2f7, 0.001);

    terrainCamera = new THREE.PerspectiveCamera(50, w / h, 1, 5000);
    terrainCamera.position.set(250, 220, 380);

    terrainRenderer = new THREE.WebGLRenderer({ antialias: true });
    terrainRenderer.setSize(w, h);
    terrainRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(terrainRenderer.domElement);

    terrainControls = new THREE.OrbitControls(terrainCamera, terrainRenderer.domElement);
    terrainControls.enableDamping = true;
    terrainControls.dampingFactor = 0.08;
    terrainControls.maxPolarAngle = Math.PI / 2.1;
    terrainControls.target.set(0, 20, 0);

    terrainScene.add(new THREE.AmbientLight(0x665544, 0.5));
    const sun = new THREE.DirectionalLight(0xffe8cc, 1.3);
    sun.position.set(250, 400, 200);
    terrainScene.add(sun);
    const fill = new THREE.DirectionalLight(0x8899aa, 0.3);
    fill.position.set(-200, 100, -100);
    terrainScene.add(fill);

    const gridH = new THREE.GridHelper(700, 30, 0x1a2a40, 0x1a2a40);
    gridH.position.y = -1;
    terrainScene.add(gridH);

    buildTerrainMesh(elevations, cols, container);
    const infoP = container.querySelector('.info-overlay p');
    if (infoP) {
      infoP.textContent = `User raster · ${window.appData.metadata.region} · ${cols}×${rows} grid · Elevation range ${Math.round(embedded.min ?? 0)}–${Math.round(embedded.max ?? 0)} m`;
    }
    document.getElementById('terrainSpinner').classList.add('hidden');

    function animateEmbedded() {
      requestAnimationFrame(animateEmbedded);
      terrainControls.update();
      terrainRenderer.render(terrainScene, terrainCamera);
    }
    animateEmbedded();

    const roEmbedded = new ResizeObserver(() => {
      const w2 = container.clientWidth, h2 = container.clientHeight;
      terrainCamera.aspect = w2 / h2;
      terrainCamera.updateProjectionMatrix();
      terrainRenderer.setSize(w2, h2);
    });
    roEmbedded.observe(container);
    return;
  }

  // Calculate Mapzen Terrarium tile coordinates from lat/lon
  function lon2tile(lon, zoom) { return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom))); }
  function lat2tile(lat, zoom) { return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))); }

  const tileX = lon2tile(config.lon, config.zoom);
  const tileY = lat2tile(config.lat, config.zoom);

  terrainScene = new THREE.Scene();
  terrainScene.background = new THREE.Color(0xeef2f7);
  terrainScene.fog = new THREE.FogExp2(0xeef2f7, 0.001);

  terrainCamera = new THREE.PerspectiveCamera(50, w / h, 1, 5000);
  terrainCamera.position.set(250, 220, 380);

  terrainRenderer = new THREE.WebGLRenderer({ antialias: true });
  terrainRenderer.setSize(w, h);
  terrainRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(terrainRenderer.domElement);

  terrainControls = new THREE.OrbitControls(terrainCamera, terrainRenderer.domElement);
  terrainControls.enableDamping = true;
  terrainControls.dampingFactor = 0.08;
  terrainControls.maxPolarAngle = Math.PI / 2.1;
  terrainControls.target.set(0, 20, 0);

  // Lights — warm desert sun
  terrainScene.add(new THREE.AmbientLight(0x665544, 0.5));
  const sun = new THREE.DirectionalLight(0xffe8cc, 1.3);
  sun.position.set(250, 400, 200);
  terrainScene.add(sun);
  const fill = new THREE.DirectionalLight(0x8899aa, 0.3);
  fill.position.set(-200, 100, -100);
  terrainScene.add(fill);

  // Grid
  const gridH = new THREE.GridHelper(700, 30, 0x1a2a40, 0x1a2a40);
  gridH.position.y = -1;
  terrainScene.add(gridH);

  // Fetch real terrain tile based on JSON coordinates
  const tileUrl = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${config.zoom}/${tileX}/${tileY}.png`;

  const img = new Image();
  img.crossOrigin = 'anonymous';

  img.onload = function () {
    const canvas = document.createElement('canvas');
    canvas.width = grid; canvas.height = grid;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, grid, grid);
    const data = ctx.getImageData(0, 0, grid, grid).data;

    const elevations = new Float32Array(grid * grid);
    for (let i = 0; i < grid * grid; i++) {
      elevations[i] = terrariumToElevation(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    }

    console.log('✅ Loaded real SRTM terrain tile for Grand Canyon');
    buildTerrainMesh(elevations, grid, container);
    document.getElementById('terrainSpinner').classList.add('hidden');
  };

  img.onerror = function () {
    console.warn('⚠️ Terrain tile failed, using fallback Grand Canyon profile');
    const elevations = generateFallbackTerrain(grid);
    buildTerrainMesh(elevations, grid, container);
    document.getElementById('terrainSpinner').classList.add('hidden');
  };

  img.src = tileUrl;

  function animate() {
    requestAnimationFrame(animate);
    terrainControls.update();
    terrainRenderer.render(terrainScene, terrainCamera);
  }
  animate();

  const ro = new ResizeObserver(() => {
    const w2 = container.clientWidth, h2 = container.clientHeight;
    terrainCamera.aspect = w2 / h2;
    terrainCamera.updateProjectionMatrix();
    terrainRenderer.setSize(w2, h2);
  });
  ro.observe(container);
}

function terrainToggle(mode) {
  terrainMode = mode;
  document.querySelectorAll('#panel-terrain .ctrl-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(mode === 'solid' ? 'btnSolid' : mode === 'wire' ? 'btnWire' : 'btnBoth').classList.add('active');
  if (terrainMesh && terrainWireMesh) {
    terrainMesh.visible = mode === 'solid' || mode === 'both';
    terrainWireMesh.visible = mode === 'wire' || mode === 'both';
  }
}
