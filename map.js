/* ============================================
   map.js — Grand Canyon Geological Map (Leaflet)
   Data: USGS Geologic Map of the Grand Canyon
   Billingsley et al. (2000) USGS Map I-2688
   ============================================ */

let geoMap;

// Geological formations — simplified from USGS Map I-2688
// Polygons approximate the outcrop areas visible at South Rim
// Decoupled features loaded from data.json

function initMap() {
  const mapData = window.appData.map;

  geoMap = L.map('map-container', {
    center: mapData.center,
    zoom: mapData.zoom,
    zoomControl: true,
  });

  // Basemaps
  const dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OSM &copy; CARTO', maxZoom: 19,
  });
  const light = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap', maxZoom: 19,
  });
  const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri', maxZoom: 19,
  });
  const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenTopoMap', maxZoom: 17,
  });

  dark.addTo(geoMap);

  // Geological units
  const geoLayer = L.layerGroup();
  mapData.units.forEach(unit => {
    L.polygon(unit.bounds, {
      color: unit.color, fillColor: unit.color, fillOpacity: 0.30, weight: 2,
    }).bindPopup(`
      <div style="font-family:Inter,sans-serif;max-width:300px">
        <strong style="color:${unit.color};font-size:15px">${unit.name}</strong><br>
        <p style="color:#cbd5e1;font-size:12px;margin-top:6px;line-height:1.5">${unit.description}</p>
      </div>
    `).addTo(geoLayer);
  });
  geoLayer.addTo(geoMap);

  // Faults
  const faultLayer = L.layerGroup();
  mapData.structures.forEach(fault => {
    L.polyline(fault.coords, {
      color: '#ef4444', weight: 3, dashArray: '10 6', opacity: 0.85,
    }).bindPopup(`
      <div style="font-family:Inter,sans-serif">
        <strong style="color:#ef4444;font-size:14px">${fault.name}</strong><br>
        <span style="color:#94a3b8;font-size:12px">${fault.type}</span>
      </div>
    `).addTo(faultLayer);
  });
  faultLayer.addTo(geoMap);

  // Sample points
  const typeColors = { fossil: '#f59e0b', rock: '#ef4444', drill: '#3b82f6', water: '#06b6d4' };
  const pointsLayer = L.layerGroup();
  mapData.pois.forEach(sp => {
    const color = typeColors[sp.type] || '#888';
    L.circleMarker([sp.lat, sp.lon], {
      radius: sp.type === 'drill' ? 10 : 7,
      fillColor: color, color: '#fff', weight: 2, fillOpacity: 0.9,
    }).bindPopup(`
      <div style="font-family:Inter,sans-serif;max-width:280px">
        <strong style="font-size:14px;color:#1e293b">${sp.name}</strong>
        <span style="background:${color};color:#fff;padding:2px 8px;border-radius:10px;font-size:10px;margin-left:6px">${sp.type}</span>
      </div>
    `).addTo(pointsLayer);
  });
  pointsLayer.addTo(geoMap);

  // Key locations
  const locLayer = L.layerGroup();
  mapData.landmarks.forEach(loc => {
    L.marker([loc.lat, loc.lon], {
      icon: L.divIcon({ html: `<div style="width:12px;height:12px;background:#ef4444;border:2px solid #fff;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,0.5);"></div>`, iconSize: [12, 12], className: '' })
    }).bindTooltip(loc.name, { permanent: false, direction: 'top', offset: [0, -10] })
      .addTo(locLayer);
  });
  locLayer.addTo(geoMap);

  // Layer control
  L.control.layers(
    { 'Dark': dark, 'Light': light, 'Satellite': satellite, 'Topo': topo },
    { 'Geological Units': geoLayer, 'Faults': faultLayer, 'Samples & Fossils': pointsLayer, 'Landmarks': locLayer },
    { position: 'topright', collapsed: false }
  ).addTo(geoMap);

  L.control.scale({ imperial: true }).addTo(geoMap);

  // Legend
  const legend = L.control({ position: 'bottomright' });
  legend.onAdd = function () {
    const div = L.DomUtil.create('div');
    div.style.cssText = 'background:rgba(10,14,23,0.92);padding:14px 18px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);color:#f1f5f9;font-family:Inter,sans-serif;font-size:12px;max-height:260px;overflow-y:auto;';
    div.innerHTML = `
      <div style="font-weight:600;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px;font-size:10px;color:#64748b">Sample Types</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px"><span style="width:12px;height:12px;background:#f59e0b;border-radius:50%;display:inline-block"></span> Fossil</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px"><span style="width:12px;height:12px;background:#ef4444;border-radius:50%;display:inline-block"></span> Rock Sample</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px"><span style="width:12px;height:12px;background:#3b82f6;border-radius:50%;display:inline-block"></span> Drill Core</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="width:12px;height:12px;background:#06b6d4;border-radius:50%;display:inline-block"></span> Water Sample</div>
      <div style="font-weight:600;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;font-size:10px;color:#64748b;border-top:1px solid rgba(255,255,255,0.08);padding-top:8px">Structures</div>
      <div style="display:flex;align-items:center;gap:8px"><span style="width:18px;border-top:2.5px dashed #ef4444;display:inline-block"></span> Normal Fault</div>
    `;
    return div;
  };
  legend.addTo(geoMap);
}
