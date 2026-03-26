/* ============================================
   figures.js — Grand Canyon Accurate Figures
   Data from:
   - Beus & Morales (2003) Grand Canyon Geology
   - USGS Professional Paper 1173 (Huntoon et al.)
   - Billingsley et al. (2000) USGS Map I-2688
   ============================================ */

function initFigures() {
  const fontColor = '#64748b'; // Tailwind slate-500
  const gridColor = 'rgba(0,0,0,0.06)';

  Chart.defaults.color = fontColor;
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 12;

  const figs = window.appData.figures;

  // ================================================================
  // 1. Rim-to-River Cross-Section Profile
  // ================================================================
  const profileData = figs.crossSection.data;
  const distLabels = profileData.map(d => d[0]);
  const surfElev = profileData.map(d => d[1]);

  // Formation contact elevations (horizontal reference lines)
  const formationContacts = {
    'Kaibab/Toroweap': 2030,
    'Coconino/Hermit': 1820,
    'Supai/Redwall': 1300,
    'Redwall/Temple Butte': 1130,
    'Bright Angel/Tapeats': 940,
    'Tapeats/Vishnu': 850
  };

  new Chart(document.getElementById('chartCrossSection'), {
    type: 'line',
    data: {
      labels: distLabels,
      datasets: [
        {
          label: 'Rim-to-River Profile',
          data: surfElev,
          borderColor: '#c07050',
          backgroundColor: (ctx) => {
            const chart = ctx.chart;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return 'rgba(192,112,80,0.2)';
            const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(100,130,80,0.3)');   // Rim forest
            gradient.addColorStop(0.3, 'rgba(210,180,140,0.3)');// Coconino buff
            gradient.addColorStop(0.6, 'rgba(160,160,176,0.3)');// Redwall grey
            gradient.addColorStop(0.8, 'rgba(96,128,80,0.3)');  // B.A. Shale green
            gradient.addColorStop(1, 'rgba(58,58,58,0.3)');     // Vishnu dark
            return gradient;
          },
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: '#c07050',
          borderWidth: 2.5,
        },
        {
          label: 'Colorado River Level (725m)',
          data: distLabels.map(() => 725),
          borderColor: '#1a6a8e',
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false,
        },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: figs.crossSection.title,
          color: '#1e293b',
          font: { size: 13, weight: '600' },
          padding: { bottom: 12 },
        },
        legend: { position: 'top', labels: { usePointStyle: true, padding: 16 } },
        tooltip: {
          callbacks: {
            afterLabel: (ctx) => {
              const idx = ctx.dataIndex;
              return idx < profileData.length ? `Formation: ${profileData[idx][2]}` : '';
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Distance from Rim (m)', color: fontColor },
          grid: { color: gridColor },
          ticks: { callback: function(val, index) { return (this.getLabelForValue(val) / 1000).toFixed(1) + ' km'; } },
        },
        y: {
          title: { display: true, text: 'Elevation (m ASL)', color: fontColor },
          grid: { color: gridColor },
          min: 650,
        },
      },
    },
  });

  // ================================================================
  // 2. Mineral Composition Doughnut Chart
  // ================================================================
  new Chart(document.getElementById('chartMineral'), {
    type: 'doughnut',
    data: {
      labels: figs.mineralComposition.labels,
      datasets: [{
        data: figs.mineralComposition.data,
        backgroundColor: figs.mineralComposition.colors,
        borderColor: '#0a0e17',
        borderWidth: 3,
        hoverOffset: 10,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '52%',
      plugins: {
        title: {
          display: true,
          text: figs.mineralComposition.title,
          color: '#1e293b',
          font: { size: 13, weight: '600' },
          padding: { bottom: 12 },
        },
        legend: {
          position: 'right',
          labels: { usePointStyle: true, padding: 10, font: { size: 11 } },
        },
      },
    },
  });

  // ================================================================
  // 3. Thickness Bar Chart
  // ================================================================
  new Chart(document.getElementById('chartGrade'), {
    type: 'bar',
    data: {
      labels: figs.formationThicknesses.formations,
      datasets: [{
        label: 'Thickness (m)',
        data: figs.formationThicknesses.thicknesses,
        backgroundColor: figs.formationThicknesses.colors,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: figs.formationThicknesses.title,
          color: '#1e293b',
          font: { size: 13, weight: '600' },
          padding: { bottom: 12 },
        },
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.parsed.x} m`
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Thickness (m)', color: fontColor },
          grid: { color: gridColor },
        },
        y: {
          title: { display: true, text: 'Formation (Youngest → Oldest)', color: fontColor },
          grid: { display: false },
        },
      },
    },
  });

  // ================================================================
  // 4. Age Log-Scale Chart
  // ================================================================
  new Chart(document.getElementById('chartRockType'), {
    type: 'bar',
    data: {
      labels: figs.formationAges.formations,
      datasets: [{
        label: 'Age (Ma)',
        data: figs.formationAges.agesMa,
        backgroundColor: figs.formationAges.colors,
        borderColor: '#0a0e17',
        borderWidth: 2,
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: figs.formationAges.title,
          color: '#1e293b',
          font: { size: 13, weight: '600' },
          padding: { bottom: 12 },
        },
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.parsed.y.toLocaleString()} million years ago`
          }
        },
      },
      scales: {
        x: {
          title: { display: true, text: 'Formation', color: fontColor },
          grid: { display: false },
        },
        y: {
          type: 'logarithmic',
          title: { display: true, text: 'Age (Ma) — Log Scale', color: fontColor },
          grid: { color: gridColor },
          ticks: {
            callback: v => v.toLocaleString() + ' Ma'
          },
        },
      },
    },
  });
}
