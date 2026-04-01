/* ============================================
   app.js — Main Application Controller
   ============================================ */

(async function () {
  'use strict';

  // Load decoupled JSON dataset into global window.appData
  try {
    const response = await fetch('data.json');
    if (!response.ok) throw new Error('Network response was not ok');
    window.appData = await response.json();
  } catch (error) {
    console.error("Failed to load data.json:", error);
    alert("Application Error: Could not load the required geological dataset (data.json).");
    return;
  }

  // Inject UI Metadata
  const meta = window.appData.metadata;
  if (meta) {
    document.title = `${meta.title} — ${meta.region}`;
    const h1 = document.querySelector('.header-brand h1');
    if (h1) h1.textContent = meta.title;
    const sub = document.querySelector('.header-brand .subtitle');
    if (sub) sub.textContent = meta.subtitle;

    const tTitle = document.querySelector('#panel-terrain .panel-title');
    if (tTitle) tTitle.textContent = `3D Terrain — ${meta.region}`;

    const dhSub = document.querySelector('#panel-drillhole .panel-subtitle');
    if (dhSub) dhSub.innerHTML = `${meta.region} Stratigraphy<br>${meta.source}`;

    const mapSub = document.querySelector('#panel-map .panel-subtitle');
    if (mapSub) mapSub.innerHTML = `${meta.region} Map<br>${meta.source}`;

    const figSub = document.querySelector('#panel-figures .panel-subtitle');
    if (figSub) figSub.textContent = meta.source;
  }

  // Update Figure cards UI titles
  const figs = window.appData.figures;
  if (figs) {
    const crossCard = document.getElementById('chartCrossSection').closest('.figure-card');
    if (crossCard) {
      crossCard.querySelector('h3').textContent = figs.crossSection.title.split('—')[0] || 'Cross Section';
      crossCard.querySelector('.fig-subtitle').textContent = figs.crossSection.title.split('—')[1] || '';
    }
    const minCard = document.getElementById('chartMineral').closest('.figure-card');
    if (minCard) {
      minCard.querySelector('h3').textContent = figs.mineralComposition.title.split('—')[0] || 'Composition';
      minCard.querySelector('.fig-subtitle').textContent = figs.mineralComposition.title.split('—')[1] || '';
    }
    const gradeCard = document.getElementById('chartGrade').closest('.figure-card');
    if (gradeCard) {
      gradeCard.querySelector('h3').textContent = figs.formationThicknesses.title.split('—')[0] || 'Thicknesses';
      gradeCard.querySelector('.fig-subtitle').textContent = figs.formationThicknesses.title.split('—')[1] || '';
    }
    const ageCard = document.getElementById('chartRockType').closest('.figure-card');
    if (ageCard) {
      ageCard.querySelector('h3').textContent = figs.formationAges.title.split('—')[0] || 'Ages';
      ageCard.querySelector('.fig-subtitle').textContent = figs.formationAges.title.split('—')[1] || '';
    }
  }

  const initialized = { terrain: false, drillhole: false, map: false, figures: false };

  // Tab switching
  const tabBtns = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;

      // Update buttons
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update panels
      panels.forEach(p => p.classList.remove('active'));
      const panel = document.getElementById('panel-' + tab);
      if (panel) panel.classList.add('active');

      // Lazy-init
      initTab(tab);
    });
  });

  function initTab(tab) {
    if (initialized[tab]) {
      // If map, invalidate size after re-show
      if (tab === 'map' && geoMap) {
        setTimeout(() => geoMap.invalidateSize(), 100);
      }
      return;
    }

    switch (tab) {
      case 'terrain':
        initTerrain();
        initialized.terrain = true;
        break;
      case 'drillhole':
        initDrillHoles();
        initialized.drillhole = true;
        break;
      case 'map':
        initMap();
        initialized.map = true;
        break;
      case 'figures':
        initFigures();
        initialized.figures = true;
        break;
    }
  }

  // Init default tab
  initTab('terrain');
})();
