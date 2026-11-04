const API = '/api';

let overviewChart = null;
let sourcesChart = null;
let breakdownChart = null;
let currentCityId = null;
let currentCityName = '';
let observationMap = null;
let observationMarkers = null;
let hotspotLayers = null;
let observationMapResizeObserver = null;
let observationRequestId = 0;
let pendingGapActionContext = null;

const cityMapCenters = {
  mumbai: [19.0760, 72.8777],
  pune: [18.5204, 73.8567],
  nagpur: [21.1458, 79.0882],
  kanpur: [26.4499, 80.3319],
  lucknow: [26.8467, 80.9462],
  agra: [27.1767, 78.0081],
  varanasi: [25.3176, 82.9739],
  amritsar: [31.6340, 74.8723],
  ludhiana: [30.9010, 75.8573],
  jaipur: [26.9124, 75.7873],
  ahmedabad: [23.0225, 72.5714],
  hyderabad: [17.3850, 78.4867],
  chennai: [13.0827, 80.2707],
  bengaluru: [12.9716, 77.5946],
  kolkata: [22.5726, 88.3639],
  chandigarh: [30.7333, 76.7794]
};

const observationSourceColors = {
  traffic: '#2563eb',
  dust: '#d97706',
  'open-burning': '#dc2626',
  'industrial-smoke': '#7c3aed'
};

const $ = (selector) => document.querySelector(selector);

/* =========================================
   API HELPER
========================================= */

async function api(url, options = {}) {
  const response = await fetch(API + url, options);

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;

    if (data?.error) {
      message = data.error;
    }

    if (Array.isArray(data?.details)) {
      message += ': ' + data.details.join(', ');
    }

    throw new Error(message);
  }

  return data;
}


/* =========================================
   NAVIGATION
========================================= */

$('#nav-overview')?.addEventListener('click', () => {
  showView('overview');
});

$('#nav-city')?.addEventListener('click', () => {
  if (currentCityId) {
    showView('city');
  } else {
    showView('overview');
  }
});

$('#btn-ai-advice')?.addEventListener('click', getAiAdvice);


function showView(view) {
  const overview = $('#view-overview');
  const city = $('#view-city');

  if (!overview || !city) {
    return;
  }

  overview.classList.toggle(
    'hidden',
    view !== 'overview'
  );

  city.classList.toggle(
    'hidden',
    view !== 'city'
  );

  const overviewButton = $('#nav-overview');
  const cityButton = $('#nav-city');

  if (overviewButton) {
    overviewButton.className =
      `btn btn-sm ${
        view === 'overview'
          ? 'btn-primary'
          : 'btn-ghost'
      }`;
  }

  if (cityButton) {
    cityButton.className =
      `btn btn-sm ${
        view === 'city'
          ? 'btn-primary'
          : 'btn-ghost'
      }`;
  }

  if (view === 'city') {
    requestAnimationFrame(refreshObservationMapSize);
  }
}


/* =========================================
   OVERVIEW
========================================= */

async function loadOverview() {
  const cities = await api('/overview');

  const count = cities.length;

  const average =
    count > 0
      ? cities.reduce(
          (sum, city) => sum + Number(city.total || 0),
          0
        ) / count
      : 0;

  $('#stat-count').textContent = count;
  $('#stat-avg').textContent = Math.round(average);

  $('#stat-regional').textContent =
    cities.filter(city => city.regionalRisk).length;

  $('#stat-duplicate').textContent =
    cities.filter(city => city.duplicatePlanFlag).length;

  renderOverviewTable(cities);
  renderOverviewChart(cities);
}


function renderOverviewTable(cities) {
  const tbody = $('#overview-table-body');

  if (!tbody) {
    return;
  }

  tbody.innerHTML = '';

  cities.forEach(city => {
    const row = document.createElement('tr');

    const outside =
      Math.round(
        Number(city.outsideContributionPct || 0) * 100
      );

    row.innerHTML = `
      <td class="font-semibold">
        ${escapeHtml(city.name)}
      </td>

      <td>
        ${escapeHtml(city.state)}
      </td>

      <td>
        ${scoreBadge(city.total)}
      </td>

      <td class="mono">
        ${outside}%
      </td>

      <td>
        ${
          city.regionalRisk
            ? '<span class="badge badge-warning badge-sm">⚠ Risk</span>'
            : '<span class="badge badge-success badge-sm">✓ OK</span>'
        }
      </td>

      <td>
        ${
          city.duplicatePlanFlag
            ? '<span class="badge badge-warning badge-sm">⚠ Flag</span>'
            : '<span class="text-base-content/40">—</span>'
        }
      </td>

      <td>
        <button
          class="btn btn-xs btn-outline"
          data-city-id="${escapeHtml(city.id)}"
        >
          Open →
        </button>
      </td>
    `;

    const button =
      row.querySelector('[data-city-id]');

    button.addEventListener('click', () => {
      openCity(city.id);
    });

    tbody.appendChild(row);
  });
}


/* =========================================
   OVERVIEW CHART
========================================= */

function renderOverviewChart(cities) {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js is not loaded.');
    return;
  }

  const canvas = $('#chart-overview');

  if (!canvas) {
    return;
  }

  if (overviewChart) {
    overviewChart.destroy();
  }

  overviewChart = new Chart(canvas, {
    type: 'bar',

    data: {
      labels: cities.map(city => city.name),

      datasets: [
        {
          label: 'Robustness score',

          data: cities.map(
            city => city.total
          ),

          backgroundColor: cities.map(
            city => scoreColor(city.total)
          ),

          borderRadius: 5
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          display: false
        }
      },

      scales: {
        y: {
          beginAtZero: true,
          max: 100,

          ticks: {
            stepSize: 20
          }
        }
      }
    }
  });
}


/* =========================================
   CITY LIST
========================================= */

async function loadCityList() {
  const cities = await api('/cities');

  const select = $('#city-select');

  if (!select) {
    return cities;
  }

  select.innerHTML = cities
    .map(city => `
      <option value="${escapeHtml(city.id)}">
        ${escapeHtml(city.name)}, ${escapeHtml(city.state)}
      </option>
    `)
    .join('');

  select.addEventListener('change', () => {
    if (select.value) {
      openCity(select.value);
    }
  });

  return cities;
}


/* =========================================
   OPEN CITY
========================================= */

async function openCity(id) {
  currentCityId = id;

  showView('city');

  try {
    const city = await api(
      `/cities/${encodeURIComponent(id)}`
    );

    const select = $('#city-select');

    if (select) {
      select.value = id;
    }

    renderCity(city);

    loadAqi(id);

  } catch (error) {
    showError(
      'Unable to load city: ' +
      error.message
    );
  }
}


/* =========================================
   RENDER CITY
========================================= */

function renderCity(city) {
  const score = city.score;
  currentCityName = city.name || '';

  const subtitle = $('#community-map-subtitle');

  if (subtitle) {
    subtitle.textContent =
      `Reported pollution sources in ${currentCityName || 'the selected city'}.`;
  }

  $('#score-badge').textContent =
    `Score: ${score.total} / 100`;

  $('#regional-badge')
    ?.classList.toggle(
      'hidden',
      !score.regionalRisk
    );

  $('#duplicate-badge')
    ?.classList.toggle(
      'hidden',
      !score.duplicatePlanFlag
    );

  renderScoreSummary(city);
  renderSourceChart(city);
  renderBreakdownChart(city);
  renderActionCompleteness(city);
  renderActions(city);
  renderPlanDoctor(city);
  loadObservations(city.id);
}


/* =========================================
   COMMUNITY SOURCE MAPPING
========================================= */

const pollutionModal = $('#report-pollution-modal');

$('#btn-report-pollution')?.addEventListener('click', () => {
  if (!currentCityId) {
    showError('Please select a city first.');
    return;
  }

  pollutionModal?.showModal();
});

$('#btn-cancel-pollution')?.addEventListener('click', () => {
  pollutionModal?.close();
});

$('#pollution-form')?.addEventListener('submit', submitObservation);

async function loadObservations(cityId) {
  const requestId = ++observationRequestId;
  const list = $('#observations-list');

  initializeObservationMap(cityId);
  centerObservationMap(cityId);

  try {
    const observations = await api(
      `/observations?cityId=${encodeURIComponent(cityId)}`
    );

    let hotspots = [];
    let hotspotActionMatches = [];

    try {
      const hotspotResponse = await api(
        `/cities/${encodeURIComponent(cityId)}/hotspots`
      );

      hotspots = Array.isArray(hotspotResponse.hotspots)
        ? hotspotResponse.hotspots
        : [];
    } catch (error) {
      console.warn('Unable to load hotspots:', error.message);
    }

    try {
      const matchResponse = await api(
        `/cities/${encodeURIComponent(cityId)}/hotspot-action-matches`
      );

      hotspotActionMatches = Array.isArray(matchResponse.matches)
        ? matchResponse.matches
        : [];
    } catch (error) {
      console.warn('Unable to load hotspot action matches:', error.message);
    }

    if (
      requestId !== observationRequestId ||
      cityId !== currentCityId
    ) {
      return;
    }

    observationMarkers?.clearLayers();
    hotspotLayers?.clearLayers();
    renderObservationSummary(observations);
    renderObservationMarkers(observations);
    renderHotspotSummary(hotspots);
    renderHotspotLayers(hotspots);
    renderHotspotActionMatches(hotspotActionMatches);
    renderObservationEmptyState(observations.length === 0);
    requestAnimationFrame(refreshObservationMapSize);

    if (!list) {
      return;
    }

    if (observations.length === 0) {
      list.innerHTML = '<p class="text-sm text-base-content/50">No community observations reported yet.</p>';
      return;
    }

    list.innerHTML = observations.map(observation => `
      <div class="border border-base-300 rounded-lg p-3 mb-2 text-sm">
        <div class="flex flex-wrap items-center gap-2">
          <strong>${escapeHtml(formatObservationSourceType(observation.sourceType))}</strong>
          <span class="badge badge-sm badge-outline">${escapeHtml(observation.intensity)}</span>
          <span class="badge badge-sm badge-success">${escapeHtml(observation.status)}</span>
        </div>
        <div class="text-base-content/60 mt-1">
          ${escapeHtml(formatObservationTime(observation.time))} · ${observation.durationMinutes} minutes · ${observation.location.lat}, ${observation.location.lng}
        </div>
      </div>
    `).join('');
  } catch (error) {
    if (
      requestId !== observationRequestId ||
      cityId !== currentCityId
    ) {
      return;
    }

    showError('Unable to load observations: ' + error.message);
  }
}

function renderHotspotActionMatches(matches) {
  const container = $('#hotspot-action-matches');

  if (!container) {
    return;
  }

  if (matches.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = matches.map(match => {
    if (match.matchStatus === 'MATCHED') {
      const actions = match.matchingActions.map(action => `
        <div class="hotspot-action-match-details">
          <strong>Action:</strong> ${escapeHtml(action.title)}<br>
          <strong>Agency:</strong> ${escapeHtml(action.responsibleAgency || 'Shared/Unclear')}<br>
          <strong>Role:</strong> ${escapeHtml(action.role || '— none —')}<br>
          <strong>Status:</strong> ${escapeHtml(action.status || 'Not Started')}
        </div>
      `).join('');

      return `
        <div class="hotspot-action-match hotspot-action-match-found">
          <strong>🟢 Existing Action Found</strong>
          <span>${escapeHtml(formatObservationSourceType(match.sourceType))} hotspot</span>
          ${actions}
        </div>
      `;
    }

    return `
      <div class="hotspot-action-match hotspot-action-match-gap">
        <strong>🟠 Potential Community Action Gap</strong>
        <span>No existing Action Tracker action matching this observed source category was found.</span>
        <button
          type="button"
          class="btn btn-xs btn-outline mt-1"
          data-create-action-from-gap="${escapeHtml(match.hotspotId)}"
        >
          + Create Action
        </button>
      </div>
    `;
  }).join('');

  container
    .querySelectorAll('[data-create-action-from-gap]')
    .forEach(button => {
      button.addEventListener('click', () => {
        const match = matches.find(candidate =>
          candidate.hotspotId === button.dataset.createActionFromGap
        );

        if (match) {
          openActionFromGap(match);
        }
      });
    });
}

function getGapActionPrefill(sourceType) {
  const sourceLabels = {
    traffic: 'traffic',
    dust: 'dust',
    'open-burning': 'open-burning',
    'industrial-smoke': 'industrial-smoke'
  };

  const sectors = {
    traffic: 'Transport',
    dust: 'Dust',
    'open-burning': 'Solid Waste',
    'industrial-smoke': 'Industry'
  };

  const sourceLabel = sourceLabels[sourceType] || 'pollution source';

  return {
    title: `Investigate repeated ${sourceLabel} observations`,
    sector: sectors[sourceType] || '',
    role: 'Monitoring',
    status: 'Not Started'
  };
}

function initializeObservationMap(cityId) {
  const container = $('#observation-map');

  if (!container || typeof L === 'undefined' || observationMap) {
    return Boolean(observationMap);
  }

  if (container.offsetWidth === 0 || container.offsetHeight === 0) {
    return false;
  }

  const center = cityMapCenters[cityId] || [20.5937, 78.9629];

  observationMap = L.map(container).setView(center, 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(observationMap);

  observationMarkers = L.layerGroup().addTo(observationMap);
  hotspotLayers = L.layerGroup().addTo(observationMap);

  observationMapResizeObserver = new ResizeObserver(() => {
    observationMap?.invalidateSize({
      pan: false
    });
  });

  observationMapResizeObserver.observe(container);

  return true;
}

function refreshObservationMapSize() {
  if (!observationMap) {
    initializeObservationMap(currentCityId);
  }

  observationMap?.invalidateSize({
    pan: false
  });
}

function renderObservationSummary(observations) {
  const summary = $('#observation-summary');

  if (!summary) {
    return;
  }

  const counts = {
    traffic: 0,
    dust: 0,
    'open-burning': 0,
    'industrial-smoke': 0
  };

  observations.forEach(observation => {
    if (Object.prototype.hasOwnProperty.call(counts, observation.sourceType)) {
      counts[observation.sourceType] += 1;
    }
  });

  summary.innerHTML = `
    <div class="observation-summary-total">
      <span>Community observations</span>
      <strong>${observations.length} total</strong>
    </div>
    <div class="observation-summary-breakdown">
      <span><i class="observation-summary-dot observation-source-traffic"></i>Traffic <strong>${counts.traffic}</strong></span>
      <span><i class="observation-summary-dot observation-source-dust"></i>Dust <strong>${counts.dust}</strong></span>
      <span><i class="observation-summary-dot observation-source-open-burning"></i>Open burning <strong>${counts['open-burning']}</strong></span>
      <span><i class="observation-summary-dot observation-source-industrial-smoke"></i>Industrial smoke <strong>${counts['industrial-smoke']}</strong></span>
    </div>
  `;
}

function renderObservationEmptyState(isEmpty) {
  $('#observation-map-empty')?.classList.toggle('hidden', !isEmpty);
}

function renderHotspotSummary(hotspots) {
  const summary = $('#hotspot-summary');

  if (!summary) {
    return;
  }

  summary.innerHTML = `
    <span>Potential Community Pollution Hotspots</span>
    <strong>${hotspots.length}</strong>
  `;
}

function renderHotspotLayers(hotspots) {
  if (!observationMap || !hotspotLayers) {
    return;
  }

  hotspots.forEach(hotspot => {
    const latitude = Number(hotspot.latitude);
    const longitude = Number(hotspot.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return;
    }

    L.circle([latitude, longitude], {
      color: '#f97316',
      fillColor: '#f97316',
      fillOpacity: 0.12,
      radius: Number(hotspot.radiusMeters) || 500,
      weight: 2
    })
      .bindPopup(`
        <strong>Potential Community Pollution Hotspot</strong><br>
        <strong>Source type:</strong> ${escapeHtml(formatObservationSourceType(hotspot.sourceType))}<br>
        <strong>Observations:</strong> ${escapeHtml(hotspot.observationCount)}<br>
        <strong>Status:</strong> ${escapeHtml(hotspot.status)}
      `)
      .addTo(hotspotLayers);
  });
}

function centerObservationMap(cityId) {
  if (!observationMap) {
    return;
  }

  const center = cityMapCenters[cityId];

  if (center) {
    observationMap.setView(center, 11);
  }
}

function renderObservationMarkers(observations) {
  if (!observationMap || !observationMarkers) {
    return;
  }

  observationMarkers.clearLayers();

  const validObservations = observations.filter(observation => {
    const lat = Number(observation?.location?.lat);
    const lng = Number(observation?.location?.lng);

    return Number.isFinite(lat) && Number.isFinite(lng) &&
      lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  });

  const bounds = [];

  validObservations.forEach(observation => {
    const lat = Number(observation.location.lat);
    const lng = Number(observation.location.lng);
    const marker = L.circleMarker([lat, lng], {
      color: observationSourceColors[observation.sourceType] || '#0f766e',
      fillColor: observationSourceColors[observation.sourceType] || '#0f766e',
      fillOpacity: 0.8,
      radius: 8,
      weight: 2
    });

    marker.bindPopup(`
      <strong>${escapeHtml(formatObservationSourceType(observation.sourceType))}</strong><br>
      <strong>Intensity:</strong> ${escapeHtml(observation.intensity)}<br>
      <strong>Duration:</strong> ${escapeHtml(observation.durationMinutes)} minutes<br>
      <strong>Observed:</strong> ${escapeHtml(formatObservationTime(observation.time))}<br>
      <strong>Status:</strong> ${escapeHtml(observation.status)}
    `);

    marker.addTo(observationMarkers);
    bounds.push([lat, lng]);
  });

  if (bounds.length > 0) {
    observationMap.fitBounds(bounds, {
      padding: [24, 24],
      maxZoom: 14
    });

    if (observationMap.getZoom() < 11) {
      observationMap.setZoom(11);
    }
  }
}

function formatObservationSourceType(sourceType) {
  const labels = {
    traffic: 'Traffic',
    dust: 'Dust',
    'open-burning': 'Open burning',
    'industrial-smoke': 'Industrial smoke'
  };

  return labels[sourceType] || sourceType || 'Unknown source';
}

function formatObservationTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || 'Unknown time';
  }

  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit'
  });
}

async function submitObservation(event) {
  event.preventDefault();

  if (!currentCityId) {
    showError('Please select a city first.');
    return;
  }

  const button = $('#btn-save-pollution');
  button.disabled = true;

  try {
    await api('/observations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cityId: currentCityId,
        sourceType: $('#observation-source-type').value,
        latitude: $('#observation-latitude').value,
        longitude: $('#observation-longitude').value,
        time: $('#observation-time').value,
        intensity: $('#observation-intensity').value,
        durationMinutes: $('#observation-duration').value
      })
    });

    pollutionModal?.close();
    clearObservationForm();
    showObservationSuccess('Pollution observation reported successfully.');
    await loadObservations(currentCityId);
  } catch (error) {
    showError(error.message);
  } finally {
    button.disabled = false;
  }
}

function clearObservationForm() {
  $('#pollution-form')?.reset();
}

function showObservationSuccess(message) {
  const success = $('#observation-success');

  if (!success) {
    return;
  }

  success.textContent = message;
  success.classList.remove('hidden');

  setTimeout(() => {
    success.classList.add('hidden');
  }, 5000);
}


/* =========================================
   AI POLICY ADVISOR
========================================= */

async function getAiAdvice() {
  const result = $('#ai-advice-result');
  const button = $('#btn-ai-advice');

  if (!currentCityId) {
    if (result) {
      result.innerHTML = `
        <div class="alert alert-warning">
          Please select a city first.
        </div>
      `;
    }

    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = 'Generating advice...';
  }

  if (result) {
    result.innerHTML = `
      <div class="alert alert-info">
        Analyzing the current city plan...
      </div>
    `;
  }

  try {
    const response = await api(
      `/cities/${encodeURIComponent(currentCityId)}/ai-advice`,
      {
        method: 'POST'
      }
    );

    renderAiAdvice(response.advice);
  } catch (error) {
    if (result) {
      result.innerHTML = `
        <div class="alert alert-error">
          AI advice unavailable: ${escapeHtml(error.message)}
        </div>
      `;
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Get AI Advice';
    }
  }
}


function renderAiAdvice(advice) {
  const result = $('#ai-advice-result');

  if (!result) {
    return;
  }

  const recommendations = Array.isArray(advice?.recommendations)
    ? advice.recommendations
    : [];

  result.innerHTML = `
    <div class="space-y-4 fade-in">

      <div class="flex flex-wrap items-center gap-3">
        <span class="badge badge-lg ${advice.priority === 'HIGH' ? 'badge-error' : 'badge-warning'}">
          Priority: ${escapeHtml(advice.priority || 'UNKNOWN')}
        </span>
      </div>

      <div class="bg-base-100 rounded-xl p-4">
        <div class="text-xs uppercase tracking-wide text-base-content/50">
          Diagnosis
        </div>
        <p class="mt-1 text-sm">
          ${escapeHtml(advice.diagnosis || 'No diagnosis provided.')}
        </p>
      </div>

      <div class="space-y-3">
        ${recommendations.length
          ? recommendations.map((recommendation, index) => `
            <div class="bg-base-100 rounded-xl p-4">
              <div class="flex items-start gap-3">
                <span class="badge badge-primary badge-sm mt-1">${index + 1}</span>
                <div class="min-w-0">
                  <h3 class="font-semibold">
                    ${escapeHtml(recommendation.action || 'Recommendation')}
                  </h3>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm">
                    <div><span class="text-base-content/50">Agency:</span> ${escapeHtml(recommendation.agency || 'Not specified')}</div>
                    <div><span class="text-base-content/50">Role:</span> ${escapeHtml(recommendation.role || 'Not specified')}</div>
                    <div><span class="text-base-content/50">KPI:</span> ${escapeHtml(recommendation.kpi || 'Not specified')}</div>
                    <div><span class="text-base-content/50">Reason:</span> ${escapeHtml(recommendation.reason || 'Not specified')}</div>
                  </div>
                </div>
              </div>
            </div>
          `).join('')
          : '<p class="text-sm text-base-content/50">No recommendations were returned.</p>'}
      </div>

    </div>
  `;
}


/* =========================================
   SCORE SUMMARY
========================================= */

function renderScoreSummary(city) {
  const breakdown = city.score.breakdown;

  const items = [
    {
      label: 'Legal mandate',
      value: breakdown.legal,
      max: 25
    },

    {
      label: 'Accountability',
      value: breakdown.accountability,
      max: 25
    },

    {
      label: 'Source data',
      value: breakdown.source,
      max: 25
    },

    {
      label: 'Budget',
      value: breakdown.budget,
      max: 25
    }
  ];

  $('#score-summary').innerHTML = `
    <div class="grid grid-cols-2 gap-3">

      ${items.map(item => {

        const percentage =
          Math.round(
            (item.value / item.max) * 100
          );

        return `
          <div class="bg-base-100 rounded-xl p-3">

            <div class="text-xs text-base-content/50">
              ${item.label}
            </div>

            <div class="text-xl font-bold mono">
              ${item.value}/${item.max}
            </div>

            <div class="progress-track mt-2">
              <div
                class="progress-fill"
                style="width:${percentage}%"
              ></div>
            </div>

          </div>
        `;

      }).join('')}

    </div>

    <div class="mt-4 flex flex-wrap gap-2">

      <span class="badge badge-outline">
        Plan health: ${escapeHtml(city.score.health)}
      </span>

      <span class="badge badge-outline">
        ${city.score.accountableActions}/${city.score.totalActions}
        actions accountable
      </span>

      <span class="badge badge-outline">
        ${city.score.budgetedActions}/${city.score.totalActions}
        budgeted
      </span>

    </div>
  `;
}


/* =========================================
   SOURCE CONTRIBUTION CHART
========================================= */

function renderSourceChart(city) {
  if (typeof Chart === 'undefined') {
    return;
  }

  const canvas = $('#chart-sources');

  if (!canvas) {
    return;
  }

  if (sourcesChart) {
    sourcesChart.destroy();
  }

  const source =
    city.sourceContribution || {};

  const labels =
    Object.keys(source);

  const values =
    Object.values(source)
      .map(value => Number(value) * 100);

  labels.push('Outside city');

  values.push(
    Number(
      city.outsideContributionPct || 0
    ) * 100
  );

  sourcesChart = new Chart(canvas, {

    type: 'doughnut',

    data: {
      labels,

      datasets: [
        {
          data: values
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {

        legend: {
          position: 'right'
        },

        tooltip: {

          callbacks: {

            label: function(context) {

              return (
                context.label +
                ': ' +
                Number(context.raw).toFixed(1) +
                '%'
              );

            }

          }

        }

      }

    }

  });
}


/* =========================================
   FOUR PILLAR CHART
========================================= */

function renderBreakdownChart(city) {
  if (typeof Chart === 'undefined') {
    return;
  }

  const canvas = $('#chart-breakdown');

  if (!canvas) {
    return;
  }

  if (breakdownChart) {
    breakdownChart.destroy();
  }

  const breakdown =
    city.score.breakdown;

  breakdownChart = new Chart(canvas, {

    type: 'bar',

    data: {

      labels: [
        'Legal mandate',
        'Accountability',
        'Source data',
        'Budget'
      ],

      datasets: [

        {
          label: 'Points',

          data: [
            breakdown.legal,
            breakdown.accountability,
            breakdown.source,
            breakdown.budget
          ]
        }

      ]

    },

    options: {

      indexAxis: 'y',

      responsive: true,

      maintainAspectRatio: false,

      plugins: {

        legend: {
          display: false
        }

      },

      scales: {

        x: {

          beginAtZero: true,

          max: 25,

          ticks: {
            stepSize: 5
          }

        }

      }

    }

  });
}


/* =========================================
   ACTION COMPLETENESS
========================================= */

function renderActionCompleteness(city) {
  const score =
    Number(city.score.actionCompleteness || 0);

  $('#action-completeness').innerHTML = `

    <div class="flex items-center justify-between mb-2">

      <span class="font-semibold">
        ${score}%
      </span>

      <span class="text-sm text-base-content/60">
        completeness
      </span>

    </div>

    <div class="progress-track">

      <div
        class="progress-fill"
        style="width:${score}%"
      ></div>

    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">

      <div class="stat-mini">
        <span>Total actions</span>
        <strong>
          ${city.score.totalActions}
        </strong>
      </div>

      <div class="stat-mini">
        <span>Accountable</span>
        <strong>
          ${city.score.accountableActions}
        </strong>
      </div>

      <div class="stat-mini">
        <span>Budgeted</span>
        <strong>
          ${city.score.budgetedActions}
        </strong>
      </div>

      <div class="stat-mini">
        <span>Regional action</span>

        <strong>
          ${
            city.score.regionalActionAccountable
              ? '✓'
              : '✕'
          }
        </strong>

      </div>

    </div>
  `;
}


/* =========================================
   PLAN DOCTOR
========================================= */

async function renderPlanDoctor(city) {
  const container = $('#plan-doctor');

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="text-sm text-base-content/50">
      Analyzing plan...
    </div>
  `;

  try {

    const doctor = await api(
      `/cities/${encodeURIComponent(city.id)}/plan-doctor`
    );

    if (!doctor.gaps.length) {

      container.innerHTML = `
        <div class="alert alert-success">

          <span>
            ✓ No major governance gaps detected.
          </span>

        </div>
      `;

      return;
    }

    container.innerHTML = `

      <div class="space-y-3">

        ${doctor.gaps.map(gap => {

          let severityClass = 'gap-low';

          if (gap.severity === 'high') {
            severityClass = 'gap-high';
          } else if (gap.severity === 'medium') {
            severityClass = 'gap-medium';
          }

          return `

            <div
              class="
                gap-item
                ${severityClass}
                bg-base-100
                rounded-lg
                p-4
              "
            >

              <div
                class="
                  flex
                  items-center
                  justify-between
                  gap-3
                "
              >

                <strong>
                  ${escapeHtml(gap.title)}
                </strong>

                <span class="badge badge-sm">
                  ${escapeHtml(gap.severity)}
                </span>

              </div>

              <p class="text-sm text-base-content/70 mt-2">
                ${escapeHtml(gap.recommendation)}
              </p>

            </div>

          `;

        }).join('')}

      </div>
    `;

  } catch (error) {

    container.innerHTML = `
      <div class="alert alert-error">

        <span>
          Plan Doctor unavailable.
        </span>

      </div>
    `;
  }
}


/* =========================================
   ACTION TABLE
========================================= */

function renderActions(city) {
  const tbody =
    $('#actions-table-body');

  if (!tbody) {
    return;
  }

  tbody.innerHTML = '';

  if (!Array.isArray(city.actions) || city.actions.length === 0) {

    tbody.innerHTML = `

      <tr>

        <td
          colspan="7"
          class="
            text-center
            text-base-content/50
            py-8
          "
        >
          No actions found.
        </td>

      </tr>

    `;

    return;
  }

  city.actions.forEach(action => {

    const row =
      document.createElement('tr');

    row.innerHTML = `

      <td>

        <div class="font-medium">
          ${escapeHtml(action.title)}
        </div>

      </td>

      <td>
        ${escapeHtml(action.sector)}
      </td>

      <td>
        ${agencySelect(action)}
      </td>

      <td>
        ${roleSelect(action)}
      </td>

      <td>
        ${statusSelect(action)}
      </td>

      <td class="mono">

        ${
          Number(action.budgetINR) > 0

            ? '₹' +
              Number(
                action.budgetINR
              ).toLocaleString('en-IN')

            : '<span class="text-error">None</span>'
        }

      </td>

      <td>

        <button
          class="
            btn
            btn-xs
            btn-ghost
            text-error
          "
          data-delete-action
        >
          ✕
        </button>

      </td>

    `;

    /* DELETE */

    row
      .querySelector('[data-delete-action]')
      ?.addEventListener('click', () => {
        deleteAction(action.id);
      });


    /* EDIT SELECTS */

    row
      .querySelectorAll('select')
      .forEach(select => {

        select.addEventListener(
          'change',
          () => {

            const field =
              select.dataset.field;

            updateAction(
              action.id,
              {
                [field]:
                  select.value || null
              }
            );

          }
        );

      });

    tbody.appendChild(row);
  });
}


/* =========================================
   AGENCY SELECT
========================================= */

function agencySelect(action) {

  const agencies = [
    'PCB',
    'ULB',
    'Transport Dept',
    'PWD',
    'Other',
    'Shared/Unclear'
  ];

  return `

    <select
      class="select select-bordered select-xs"
      data-field="responsibleAgency"
    >

      ${agencies.map(agency => `

        <option
          value="${escapeHtml(agency)}"

          ${
            agency === action.responsibleAgency
              ? 'selected'
              : ''
          }
        >
          ${escapeHtml(agency)}
        </option>

      `).join('')}

    </select>
  `;
}


/* =========================================
   ROLE SELECT
========================================= */

function roleSelect(action) {

  const roles = [
    '',
    'Planning',
    'Implementing',
    'Enforcing',
    'Monitoring'
  ];

  return `

    <select
      class="select select-bordered select-xs"
      data-field="role"
    >

      ${roles.map(role => `

        <option
          value="${escapeHtml(role)}"

          ${
            role === (action.role || '')
              ? 'selected'
              : ''
          }
        >
          ${
            role
              ? escapeHtml(role)
              : '— none —'
          }
        </option>

      `).join('')}

    </select>
  `;
}


/* =========================================
   STATUS SELECT
========================================= */

function statusSelect(action) {

  const statuses = [
    'Not Started',
    'In Progress',
    'Done'
  ];

  return `

    <select
      class="select select-bordered select-xs"
      data-field="status"
    >

      ${statuses.map(status => `

        <option
          value="${escapeHtml(status)}"

          ${
            status === action.status
              ? 'selected'
              : ''
          }
        >
          ${escapeHtml(status)}
        </option>

      `).join('')}

    </select>
  `;
}


/* =========================================
   UPDATE ACTION
========================================= */

async function updateAction(actionId, patch) {

  try {

    await api(
      `/cities/${encodeURIComponent(currentCityId)}/actions/${encodeURIComponent(actionId)}`,
      {
        method: 'PUT',

        headers: {
          'Content-Type':
            'application/json'
        },

        body:
          JSON.stringify(patch)
      }
    );

    await refreshCurrentCity();

  } catch (error) {

    showError(error.message);

  }
}


/* =========================================
   DELETE ACTION
========================================= */

async function deleteAction(actionId) {

  const confirmed =
    confirm('Delete this action?');

  if (!confirmed) {
    return;
  }

  try {

    await api(
      `/cities/${encodeURIComponent(currentCityId)}/actions/${encodeURIComponent(actionId)}`,
      {
        method: 'DELETE'
      }
    );

    await refreshCurrentCity();

  } catch (error) {

    showError(error.message);

  }
}


/* =========================================
   ADD ACTION MODAL
========================================= */

const modal =
  $('#add-action-modal');

function setGapActionContext(context) {
  const contextElement = $('#action-gap-context');

  if (!contextElement) {
    return;
  }

  if (!context) {
    contextElement.textContent = '';
    contextElement.classList.add('hidden');
    return;
  }

  contextElement.textContent =
    `Potential Community Action Gap · ${formatObservationSourceType(context.sourceType)} · ${context.hotspotId}`;
  contextElement.classList.remove('hidden');
}

function openActionFromGap(match) {
  if (!currentCityId || match.cityId !== currentCityId) {
    showError('Please select the city for this potential community action gap.');
    return;
  }

  const prefill = getGapActionPrefill(match.sourceType);

  pendingGapActionContext = {
    cityId: match.cityId,
    hotspotId: match.hotspotId,
    sourceType: match.sourceType
  };

  $('#f-title').value = prefill.title;
  $('#f-sector').value = prefill.sector;
  $('#f-agency').value = '';
  $('#f-role').value = prefill.role;
  $('#f-status').value = prefill.status;
  $('#f-budget').value = '';
  setGapActionContext(pendingGapActionContext);
  modal?.showModal();
}

$('#btn-add-action')?.addEventListener(
  'click',
  () => {

    if (!currentCityId) {

      showError(
        'Please select a city first.'
      );

      return;
    }

    clearActionForm();
    modal?.showModal();

  }
);


$('#btn-cancel-action')?.addEventListener(
  'click',
  () => {
    modal?.close();
    clearActionForm();
  }
);


$('#btn-save-action')?.addEventListener(
  'click',
  addAction
);


/* =========================================
   ADD ACTION
========================================= */

async function addAction() {

  if (!currentCityId) {

    showError(
      'Please select a city first.'
    );

    return;
  }

  if (pendingGapActionContext && !$('#f-agency').value) {
    showError('Please choose a responsible agency before creating this action.');
    return;
  }

  const body = {

    title:
      $('#f-title').value.trim(),

    sector:
      $('#f-sector').value.trim(),

    responsibleAgency:
      $('#f-agency').value,

    role:
      $('#f-role').value || null,

    status:
      $('#f-status').value,

    budgetINR:
      Number(
        $('#f-budget').value
      ) || null
  };


  try {

    await api(
      `/cities/${encodeURIComponent(currentCityId)}/actions`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json'
        },

        body:
          JSON.stringify(body)
      }
    );

    modal?.close();

    clearActionForm();

    await refreshCurrentCity();

  } catch (error) {

    showError(error.message);

  }
}


/* =========================================
   CLEAR ACTION FORM
========================================= */

function clearActionForm() {

  $('#f-title').value = '';

  $('#f-sector').value = '';

  $('#f-budget').value = '';

  $('#f-agency').value =
    'Shared/Unclear';

  $('#f-role').value = '';

  $('#f-status').value =
    'Not Started';

  pendingGapActionContext = null;
  setGapActionContext(null);
}


/* =========================================
   REFRESH CURRENT CITY
========================================= */

async function refreshCurrentCity() {

  if (!currentCityId) {
    return;
  }

  const city =
    await api(
      `/cities/${encodeURIComponent(currentCityId)}`
    );

  renderCity(city);

  await loadOverview();
}


/* =========================================
   LIVE AQI
========================================= */

async function loadAqi(id) {

  const badge =
    $('#aqi-badge');

  if (!badge) {
    return;
  }

  badge.textContent =
    'Live AQI: loading…';

  try {

    const data =
      await api(
        `/cities/${encodeURIComponent(id)}/aqi`
      );

    if (
      data &&
      data.status === 'ok' &&
      data.data
    ) {

      badge.textContent =
        `Live AQI: ${data.data.aqi} (${data.data.dominentpol || 'n/a'})`;

    } else {

      badge.textContent =
        'Live AQI: unavailable';

    }

  } catch {

    badge.textContent =
      'Live AQI: unavailable';

  }
}


/* =========================================
   PLAN IMPROVEMENT SIMULATOR
========================================= */

/* =========================================
   PLAN IMPROVEMENT SIMULATOR
========================================= */

document.addEventListener('click', (event) => {

  const button =
    event.target.closest('#btn-simulate');

  if (!button) {
    return;
  }

  event.preventDefault();

  runSimulation();

});


async function runSimulation() {

  // Get the currently selected city.
  // Fallback to the dropdown in case currentCityId
  // has not been set for some reason.

  const cityId =
    currentCityId ||
    $('#city-select')?.value ||
    null;


  if (!cityId) {

    showError(
      'Please select a city first.'
    );

    return;

  }


  const resultBox =
    $('#simulation-result');


  if (!resultBox) {

    console.error(
      'Simulator error: #simulation-result not found.'
    );

    showError(
      'Simulator result container not found.'
    );

    return;

  }


  // Read simulator checkboxes

  const legal =
    $('#sim-legal')?.checked === true;

  const accountability =
    $('#sim-accountability')?.checked === true;

  const source =
    $('#sim-source')?.checked === true;

  const budget =
    $('#sim-budget')?.checked === true;


  // Make sure at least one option is selected

  if (
    !legal &&
    !accountability &&
    !source &&
    !budget
  ) {

    resultBox.innerHTML = `
      <div class="alert alert-warning">
        <span>
          Select at least one improvement before simulating.
        </span>
      </div>
    `;

    return;

  }


  // Loading state

  resultBox.innerHTML = `
    <div class="alert alert-info">
      <span>
        Calculating projected improvement...
      </span>
    </div>
  `;


  // Disable button while request is running

  const button =
    $('#btn-simulate');

  if (button) {

    button.disabled = true;

    button.textContent =
      'Simulating...';

  }


  // Request body

  const changes = {

    addLegalMandate:
      legal,

    improveAccountability:
      accountability,

    addSourceData:
      source,

    addBudget:
      budget

  };


  console.log(
    'Simulation request:',
    cityId,
    changes
  );


  try {

    const result =
      await api(
        `/cities/${encodeURIComponent(cityId)}/simulate`,
        {

          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify(changes)

        }
      );


    console.log(
      'Simulation response:',
      result
    );


    const currentScore =
      Number(
        result.currentScore ?? 0
      );


    const projectedScore =
      Number(
        result.projectedScore ??
        currentScore
      );


    const improvement =
      Number(
        result.improvement ?? 0
      );


    // Display result

    resultBox.innerHTML = `

      <div
        class="
          bg-base-100
          rounded-xl
          p-5
          border
          border-base-300
        "
      >

        <div
          class="
            text-sm
            text-base-content/60
          "
        >
          Projected robustness score
        </div>


        <div
          class="
            flex
            items-center
            gap-4
            mt-2
          "
        >

          <div
            class="
              text-3xl
              font-bold
              mono
            "
          >
            ${currentScore}
          </div>


          <div
            class="
              text-2xl
              text-base-content/40
            "
          >
            →
          </div>


          <div
            class="
              text-3xl
              font-bold
              text-primary
              mono
            "
          >
            ${projectedScore}
          </div>

        </div>


        <div class="mt-3">

          <span
            class="
              badge
              ${
                improvement > 0
                  ? 'badge-success'
                  : 'badge-ghost'
              }
            "
          >

            ${
              improvement > 0
                ? '+' + improvement
                : '0'
            }

            points

          </span>

        </div>


        <div
          class="
            mt-4
            text-sm
            text-base-content/60
          "
        >

          ${
            improvement > 0

              ? 'These governance improvements could materially strengthen the plan.'

              : 'No score improvement from the selected changes.'
          }

        </div>


        <div
          class="
            mt-4
            text-xs
            text-base-content/50
          "
        >

          Selected improvements:

          ${
            [
              legal
                ? 'Legal mandate'
                : null,

              accountability
                ? 'Accountability'
                : null,

              source
                ? 'Source data'
                : null,

              budget
                ? 'Budget'
                : null

            ]
              .filter(Boolean)
              .join(', ')
          }

        </div>

      </div>

    `;


  } catch (error) {

    console.error(
      'Simulation failed:',
      error
    );


    resultBox.innerHTML = `

      <div
        class="alert alert-error"
      >

        <span>

          Simulation failed:

          ${escapeHtml(
            error.message
          )}

        </span>

      </div>

    `;


  } finally {

    // Re-enable button

    if (button) {

      button.disabled = false;

      button.textContent =
        'Simulate improvement';

    }

  }

}


/* =========================================
   SCORE HELPERS
========================================= */

function scoreColor(score) {

  if (score >= 70) {
    return '#0f766e';
  }

  if (score >= 40) {
    return '#d97706';
  }

  return '#dc2626';
}


function scoreBadge(score) {

  let badgeClass =
    'badge-error';

  if (score >= 70) {

    badgeClass =
      'badge-success';

  } else if (score >= 40) {

    badgeClass =
      'badge-warning';

  }

  return `

    <span
      class="
        badge
        ${badgeClass}
        badge-sm
      "
    >
      ${Number(score)}
    </span>

  `;
}


/* =========================================
   ERROR MESSAGE
========================================= */

function showError(message) {

  console.error(message);

  const existing =
    $('#app-error');

  if (existing) {
    existing.remove();
  }

  const error =
    document.createElement('div');

  error.id =
    'app-error';

  error.className =
    `
      alert
      alert-error
      fixed
      bottom-4
      right-4
      max-w-md
      z-50
      shadow-lg
    `;

  error.innerHTML = `

    <span>
      ${escapeHtml(message)}
    </span>

  `;

  document.body.appendChild(error);

  setTimeout(() => {

    if (error) {
      error.remove();
    }

  }, 5000);
}


/* =========================================
   HTML ESCAPING
========================================= */

function escapeHtml(value) {

  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

}


/* =========================================
   INITIALIZATION
========================================= */

async function init() {

  try {

    await api('/health');

    await loadCityList();

    await loadOverview();

    /*
      IMPORTANT:
      Start on Overview.
      City Detail opens only when selected.
    */

    showView('overview');

  } catch (error) {

    showError(
      'Application failed to start: ' +
      error.message
    );

  }

}


/* =========================================
   START APP
========================================= */

init();
