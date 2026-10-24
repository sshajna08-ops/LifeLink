/**
 * LifeLink - Core Web Application Controller
 * Handles Navigation, Geolocation, Forms, Matching UI, Leaflet Map, and Alert Simulation
 */

document.addEventListener('DOMContentLoaded', function () {
  // Global State
  let currentActiveRequest = null;
  let leafletMap = null;
  let mapMarkersLayer = null;
  let mapLinesLayer = null;

  // City Presets for rapid testing & faculty demo
  const CITY_PRESETS = [
    { name: 'Coimbatore (Collectorate)', lat: 11.0018, lon: 76.9629 },
    { name: 'Coimbatore (CMCH Hospital)', lat: 11.0005, lon: 76.9660 },
    { name: 'Coimbatore (Peelamedu)', lat: 11.0315, lon: 77.0031 },
    { name: 'Coimbatore (Gandhipuram)', lat: 11.0183, lon: 76.9634 },
    { name: 'Tiruppur', lat: 11.1085, lon: 77.3411 },
    { name: 'Salem', lat: 11.6643, lon: 78.1460 },
    { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
    { name: 'Bangalore', lat: 12.9716, lon: 77.5946 }
  ];

  // ==========================================================================
  // Toast Notification System
  // ==========================================================================
  function showToast(message, type = 'info', title = '') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';
    if (type === 'danger') icon = '🚨';

    toast.innerHTML = `
      <div style="font-size: 1.25rem;">${icon}</div>
      <div style="flex: 1;">
        ${title ? `<strong style="display: block; margin-bottom: 2px;">${title}</strong>` : ''}
        <div>${message}</div>
      </div>
      <button style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:1.1rem; line-height:1;" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 4500);
  }

  // ==========================================================================
  // View Router
  // ==========================================================================
  function navigateTo(targetViewId) {
    const views = document.querySelectorAll('.view-section');
    views.forEach(v => v.classList.remove('active'));

    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      if (link.getAttribute('data-view') === targetViewId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    const activeView = document.getElementById(targetViewId);
    if (activeView) {
      activeView.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // View specific hooks
    if (targetViewId === 'view-home') {
      updateHomeStats();
    } else if (targetViewId === 'view-donors') {
      renderDonorsDirectory();
    } else if (targetViewId === 'view-matching') {
      populateRequestsSelector();
      renderMatchingView();
    } else if (targetViewId === 'view-alerts') {
      renderAlertsLog();
    } else if (targetViewId === 'view-database') {
      renderDatabaseInspector();
    }
  }

  // Bind navigation links
  document.querySelectorAll('[data-view]').forEach(elem => {
    elem.addEventListener('click', function (e) {
      e.preventDefault();
      const target = this.getAttribute('data-view');
      navigateTo(target);
    });
  });

  // ==========================================================================
  // Geolocation & Preset Handlers
  // ==========================================================================
  function setupGeolocationButton(btnId, latInputId, lonInputId, locInputId, statusId) {
    const btn = document.getElementById(btnId);
    const latInput = document.getElementById(latInputId);
    const lonInput = document.getElementById(lonInputId);
    const locInput = document.getElementById(locInputId);
    const statusElem = document.getElementById(statusId);

    if (!btn) return;

    btn.addEventListener('click', function () {
      if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser. Please enter coordinates manually or use quick presets.', 'warning', 'Location Error');
        return;
      }

      statusElem.textContent = 'Acquiring GPS coordinates from browser...';
      statusElem.style.color = '#0284c7';

      navigator.geolocation.getCurrentPosition(
        function (position) {
          const lat = position.coords.latitude.toFixed(6);
          const lon = position.coords.longitude.toFixed(6);
          const acc = Math.round(position.coords.accuracy);

          latInput.value = lat;
          lonInput.value = lon;
          if (!locInput.value.trim()) {
            locInput.value = `Current Device Location (Acc: ±${acc}m)`;
          }

          statusElem.textContent = `Location acquired! Lat: ${lat}, Lon: ${lon} (Accuracy: ±${acc}m)`;
          statusElem.style.color = '#10b981';
          showToast(`Latitude: ${lat}, Longitude: ${lon}`, 'success', 'GPS Location Acquired');
        },
        function (error) {
          let msg = 'Could not retrieve browser location.';
          if (error.code === error.PERMISSION_DENIED) {
            msg = 'Location access denied by user. You can use preset buttons below or enter coordinates manually.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            msg = 'Location information unavailable. Using manual entry.';
          } else if (error.code === error.TIMEOUT) {
            msg = 'Location request timed out. Please enter manually.';
          }
          statusElem.textContent = msg;
          statusElem.style.color = '#ef4444';
          showToast(msg, 'warning', 'Location Fallback');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  // Populate Preset Chips
  function renderPresetChips(containerId, latInputId, lonInputId, locInputId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    CITY_PRESETS.forEach(city => {
      const chip = document.createElement('span');
      chip.className = 'preset-chip';
      chip.textContent = city.name;
      chip.addEventListener('click', () => {
        document.getElementById(latInputId).value = city.lat;
        document.getElementById(lonInputId).value = city.lon;
        const loc = document.getElementById(locInputId);
        if (loc) loc.value = city.name;
        showToast(`Loaded coordinates for ${city.name} (${city.lat}, ${city.lon})`, 'info', 'Preset Applied');
      });
      container.appendChild(chip);
    });
  }

  // Set up both forms with Geolocation & Presets
  setupGeolocationButton('btn-detect-donor-loc', 'donor-lat', 'donor-lon', 'donor-location', 'donor-loc-status');
  renderPresetChips('donor-presets', 'donor-lat', 'donor-lon', 'donor-location');

  setupGeolocationButton('btn-detect-patient-loc', 'patient-lat', 'patient-lon', 'patient-location', 'patient-loc-status');
  renderPresetChips('patient-presets', 'patient-lat', 'patient-lon', 'patient-location');

  // Toggle Organ Input on Donor Form
  const donorOrganToggle = document.getElementById('donor-organ-donor');
  const donorOrganGroup = document.getElementById('donor-organ-available-group');
  if (donorOrganToggle && donorOrganGroup) {
    donorOrganToggle.addEventListener('change', function () {
      if (this.value === 'Yes') {
        donorOrganGroup.style.display = 'flex';
      } else {
        donorOrganGroup.style.display = 'none';
        document.getElementById('donor-organ-available').value = 'None';
      }
    });
  }

  // ==========================================================================
  // Form Validations & Submissions
  // ==========================================================================

  // 1. DONOR REGISTRATION FORM
  const donorForm = document.getElementById('form-donor-register');
  if (donorForm) {
    donorForm.addEventListener('submit', function (e) {
      e.preventDefault();

      const name = document.getElementById('donor-name').value.trim();
      const bloodGroup = document.getElementById('donor-blood-group').value;
      const phone = document.getElementById('donor-phone').value.trim();
      const location = document.getElementById('donor-location').value.trim();
      const lat = parseFloat(document.getElementById('donor-lat').value);
      const lon = parseFloat(document.getElementById('donor-lon').value);
      const isOrgan = document.getElementById('donor-organ-donor').value;
      const organAvailable = document.getElementById('donor-organ-available').value.trim();
      const available = document.getElementById('donor-available').value;

      // Validation
      if (!name || name.length < 2) {
        showToast('Please enter a valid donor name.', 'danger', 'Validation Error');
        return;
      }
      if (!bloodGroup) {
        showToast('Please select a blood group.', 'danger', 'Validation Error');
        return;
      }
      if (!phone || !/^\d{10}$/.test(phone)) {
        showToast('Please enter a valid 10-digit phone number.', 'danger', 'Validation Error');
        return;
      }
      if (!location) {
        showToast('Please provide a donor location/address.', 'danger', 'Validation Error');
        return;
      }
      if (isNaN(lat) || lat < -90 || lat > 90) {
        showToast('Latitude must be between -90 and 90.', 'danger', 'Validation Error');
        return;
      }
      if (isNaN(lon) || lon < -180 || lon > 180) {
        showToast('Longitude must be between -180 and 180.', 'danger', 'Validation Error');
        return;
      }

      // Add to Database
      const newDonor = LifeLinkDB.addDonor({
        name,
        blood_group: bloodGroup,
        phone,
        location,
        latitude: lat,
        longitude: lon,
        organ_donor: isOrgan,
        organ_available: isOrgan === 'Yes' ? organAvailable : 'None',
        available
      });

      showToast(`Donor ${newDonor.name} (${newDonor.blood_group}) successfully registered and saved to database!`, 'success', 'Registration Complete');
      donorForm.reset();
      document.getElementById('donor-loc-status').textContent = '';

      // Direct user to view the donor list or emergency matching
      setTimeout(() => {
        navigateTo('view-donors');
      }, 1000);
    });
  }

  // 2. EMERGENCY REQUEST FORM
  const emergencyForm = document.getElementById('form-emergency-request');
  if (emergencyForm) {
    emergencyForm.addEventListener('submit', function (e) {
      e.preventDefault();

      const patientName = document.getElementById('patient-name').value.trim();
      const bloodGroup = document.getElementById('patient-blood-group').value;
      const phone = document.getElementById('patient-phone').value.trim();
      const location = document.getElementById('patient-location').value.trim();
      const lat = parseFloat(document.getElementById('patient-lat').value);
      const lon = parseFloat(document.getElementById('patient-lon').value);
      const organRequired = document.getElementById('patient-organ-required').value;
      const emergency = document.getElementById('patient-emergency-level').value;

      // Validation
      if (!patientName || patientName.length < 2) {
        showToast('Please enter patient name.', 'danger', 'Validation Error');
        return;
      }
      if (!bloodGroup) {
        showToast('Please select required blood group.', 'danger', 'Validation Error');
        return;
      }
      if (!phone || !/^\d{10}$/.test(phone)) {
        showToast('Please enter a valid 10-digit emergency contact phone.', 'danger', 'Validation Error');
        return;
      }
      if (!location) {
        showToast('Please enter patient or hospital location.', 'danger', 'Validation Error');
        return;
      }
      if (isNaN(lat) || lat < -90 || lat > 90) {
        showToast('Patient latitude must be between -90 and 90.', 'danger', 'Validation Error');
        return;
      }
      if (isNaN(lon) || lon < -180 || lon > 180) {
        showToast('Patient longitude must be between -180 and 180.', 'danger', 'Validation Error');
        return;
      }

      // Add to Database
      const newRequest = LifeLinkDB.addRequest({
        patient_name: patientName,
        blood_group: bloodGroup,
        phone,
        location,
        organ_required: organRequired,
        emergency,
        status: 'Open',
        latitude: lat,
        longitude: lon
      });

      currentActiveRequest = newRequest;
      showToast(`Emergency request ${newRequest.id} created! Triggering location matching...`, 'warning', 'Emergency Initiated');
      emergencyForm.reset();
      document.getElementById('patient-loc-status').textContent = '';

      // Immediately navigate to Matching & Alert page
      setTimeout(() => {
        navigateTo('view-matching');
      }, 700);
    });
  }

  // ==========================================================================
  // Home Stats Counter
  // ==========================================================================
  function updateHomeStats() {
    const stats = LifeLinkDB.getStats();
    const statDonors = document.getElementById('stat-total-donors');
    const statAvailable = document.getElementById('stat-available-donors');
    const statOrgans = document.getElementById('stat-organ-donors');
    const statCritical = document.getElementById('stat-critical-requests');

    if (statDonors) statDonors.textContent = stats.totalDonors;
    if (statAvailable) statAvailable.textContent = stats.availableDonors;
    if (statOrgans) statOrgans.textContent = stats.organDonors;
    if (statCritical) statCritical.textContent = stats.criticalRequests;
  }

  // ==========================================================================
  // Donor Directory
  // ==========================================================================
  function renderDonorsDirectory() {
    const donors = LifeLinkDB.getAllDonors();
    const tbody = document.getElementById('donors-table-body');
    const bloodFilter = document.getElementById('filter-blood-group').value;
    const organFilter = document.getElementById('filter-organ').value;
    const availFilter = document.getElementById('filter-availability').value;
    const searchInput = (document.getElementById('search-donors').value || '').toLowerCase();

    if (!tbody) return;

    // Filter Donors
    const filtered = donors.filter(d => {
      if (bloodFilter && d.blood_group !== bloodFilter) return false;
      if (organFilter) {
        if (organFilter === 'Yes' && d.organ_donor !== 'Yes') return false;
        if (organFilter === 'No' && d.organ_donor === 'Yes') return false;
        if (organFilter !== 'Yes' && organFilter !== 'No') {
          // Specific organ search
          const orgStr = String(d.organ_available || '').toLowerCase();
          if (!orgStr.includes(organFilter.toLowerCase()) && !orgStr.includes('all')) return false;
        }
      }
      if (availFilter && d.available !== availFilter) return false;
      if (searchInput) {
        const full = `${d.name} ${d.location} ${d.blood_group} ${d.phone}`.toLowerCase();
        if (!full.includes(searchInput)) return false;
      }
      return true;
    });

    document.getElementById('donor-count-badge').textContent = `${filtered.length} of ${donors.length} Donors`;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: #64748b;">
            No donors found matching current filters. Try resetting filters or register a new donor.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(d => {
      const availBadge = d.available === 'Available'
        ? `<span class="badge badge-available">● Available</span>`
        : `<span class="badge badge-unavailable">○ Unavailable</span>`;

      const organBadge = d.organ_donor === 'Yes'
        ? `<span class="badge badge-organ-yes">✓ ${d.organ_available || 'Yes'}</span>`
        : `<span class="badge badge-organ-no">No</span>`;

      return `
        <tr>
          <td>
            <strong>${d.name}</strong>
            <div style="font-size:0.75rem; color:#64748b;">ID: ${d.id}</div>
          </td>
          <td><span class="badge badge-blood">${d.blood_group}</span></td>
          <td>
            <div>${d.location}</div>
            <div style="font-size:0.72rem; color:#64748b;">📍 ${d.latitude.toFixed(4)}, ${d.longitude.toFixed(4)}</div>
          </td>
          <td>${organBadge}</td>
          <td>${availBadge}</td>
          <td><a href="tel:${d.phone}" style="color:#0284c7; text-decoration:none; font-weight:600;">📞 ${d.phone}</a></td>
          <td>
            <button class="btn btn-sm btn-light-outline btn-toggle-avail" data-id="${d.id}">
              ${d.available === 'Available' ? 'Mark Busy' : 'Mark Ready'}
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Bind Toggle Availability Buttons
    document.querySelectorAll('.btn-toggle-avail').forEach(btn => {
      btn.addEventListener('click', function () {
        const id = this.getAttribute('data-id');
        const donor = LifeLinkDB.getDonorById(id);
        if (donor) {
          const nextState = donor.available === 'Available' ? 'Unavailable' : 'Available';
          LifeLinkDB.updateDonor(id, { available: nextState });
          showToast(`${donor.name} is now ${nextState}.`, 'info', 'Status Updated');
          renderDonorsDirectory();
          updateHomeStats();
        }
      });
    });
  }

  // Filter bindings
  ['filter-blood-group', 'filter-organ', 'filter-availability'].forEach(id => {
    const elem = document.getElementById(id);
    if (elem) elem.addEventListener('change', renderDonorsDirectory);
  });
  const searchBox = document.getElementById('search-donors');
  if (searchBox) searchBox.addEventListener('input', renderDonorsDirectory);

  const resetFiltersBtn = document.getElementById('btn-reset-filters');
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      document.getElementById('filter-blood-group').value = '';
      document.getElementById('filter-organ').value = '';
      document.getElementById('filter-availability').value = '';
      document.getElementById('search-donors').value = '';
      renderDonorsDirectory();
    });
  }

  // ==========================================================================
  // Matching & Emergency Alert View
  // ==========================================================================
  function populateRequestsSelector() {
    const select = document.getElementById('select-active-request');
    if (!select) return;

    const requests = LifeLinkDB.getAllRequests();
    select.innerHTML = '';

    if (requests.length === 0) {
      select.innerHTML = '<option value="">No emergency requests registered yet</option>';
      return;
    }

    requests.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = `[${r.emergency}] ${r.patient_name} - Needs ${r.blood_group} ${r.organ_required !== 'None' ? `+ ${r.organ_required}` : ''} (${r.location})`;
      select.appendChild(opt);
    });

    if (currentActiveRequest) {
      select.value = currentActiveRequest.id;
    } else if (requests.length > 0) {
      currentActiveRequest = requests[0];
      select.value = currentActiveRequest.id;
    }

    select.onchange = function () {
      currentActiveRequest = LifeLinkDB.getRequestById(this.value);
      renderMatchingView();
    };
  }

  function renderMatchingView() {
    const container = document.getElementById('matching-results-container');
    const summaryCard = document.getElementById('active-request-summary');
    if (!container || !summaryCard) return;

    const requests = LifeLinkDB.getAllRequests();
    if (!currentActiveRequest && requests.length > 0) {
      currentActiveRequest = requests[0];
    }

    if (!currentActiveRequest) {
      summaryCard.innerHTML = `
        <div style="padding: 1.5rem; text-align: center;">
          <p>No active emergency requests found.</p>
          <button class="btn btn-primary" data-view="view-emergency" style="margin-top: 1rem;">Create Emergency Request</button>
        </div>
      `;
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h3>Awaiting Emergency Request</h3>
          <p>Submit an emergency request to begin automated geographic and medical compatibility matching.</p>
        </div>
      `;
      return;
    }

    const req = currentActiveRequest;

    // Render Request Summary
    const emergencyBadgeClass = req.emergency === 'Critical'
      ? 'badge-emergency-critical'
      : (req.emergency === 'Urgent' ? 'badge-emergency-urgent' : 'badge-emergency-normal');

    summaryCard.innerHTML = `
      <div class="request-summary-info">
        <div style="font-size: 0.8rem; color: #fca5a5; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">
          ACTIVE EMERGENCY CASE #${req.id}
        </div>
        <h3>
          ${req.patient_name}
          <span class="badge ${emergencyBadgeClass}">● ${req.emergency}</span>
        </h3>
        <div class="request-summary-meta">
          <div>Required Blood: <strong>${req.blood_group}</strong></div>
          <div>Organ Required: <strong>${req.organ_required}</strong></div>
          <div>Hospital/Location: <strong>${req.location}</strong></div>
          <div>GPS: <strong>${req.latitude.toFixed(4)}, ${req.longitude.toFixed(4)}</strong></div>
          <div>Emergency Contact: <strong>${req.phone}</strong></div>
        </div>
      </div>
      <div>
        <button class="btn btn-danger btn-broadcast-all" style="box-shadow: 0 0 15px rgba(220, 38, 38, 0.5);">
          📢 Broadcast Alert to All Compatible Donors
        </button>
      </div>
    `;

    // Execute Donor Matching Engine
    const allDonors = LifeLinkDB.getAllDonors();
    const matchResult = LifeLinkMatcher.matchDonors(req, allDonors);

    const compatibleDonors = matchResult.compatibleDonors;

    // Bind broadcast button
    const broadcastBtn = summaryCard.querySelector('.btn-broadcast-all');
    if (broadcastBtn) {
      broadcastBtn.onclick = function () {
        if (compatibleDonors.length === 0) {
          showToast('No compatible donors currently available to broadcast.', 'warning', 'Dispatch Warning');
          return;
        }
        openBroadcastModal(req, compatibleDonors);
      };
    }

    if (compatibleDonors.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="border-color: #fca5a5; background: #fffaf0;">
          <div class="empty-state-icon" style="color: #dc2626;">⚠️</div>
          <h3 style="color: #dc2626;">No nearby matching donor found at the moment.</h3>
          <p>
            The system evaluated ${matchResult.allEvaluated} registered donors against the blood group <strong>${req.blood_group}</strong> 
            ${req.organ_required !== 'None' ? `and required organ <strong>${req.organ_required}</strong>` : ''}.
            No donors currently satisfy both medical compatibility and active availability criteria.
          </p>
          <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-primary" onclick="LifeLinkDB.resetDatabase(); location.reload();">Reset Sample Donors</button>
            <button class="btn btn-secondary" data-view="view-donor-register">Register New Compatible Donor</button>
          </div>
        </div>
      `;
      // Clean up map markers
      initOrUpdateMap(req, []);
      return;
    }

    // Render Matched Cards
    let cardsHtml = `<div class="match-grid">`;
    compatibleDonors.forEach((d, idx) => {
      const isTop = idx === 0;
      const rankTag = isTop ? 'rank-1' : '';
      const exactBadge = d.isExactBloodMatch
        ? `<span class="badge badge-blood">Exact ${d.blood_group}</span>`
        : `<span class="badge" style="background:#e0f2fe; color:#0369a1; border:1px solid #7dd3fc;">Compatible (${d.blood_group} → ${req.blood_group})</span>`;

      cardsHtml += `
        <div class="match-card ${rankTag}">
          <div>
            <div class="match-card-header">
              <div>
                <div class="match-donor-name">${d.name}</div>
                <div style="margin-top: 4px; display:flex; gap:0.4rem; flex-wrap:wrap;">
                  ${exactBadge}
                  <span class="badge badge-available">● ${d.available}</span>
                </div>
              </div>
              <div class="match-distance-badge">
                📍 ${d.distanceKm} km away
              </div>
            </div>

            <ul class="match-donor-details">
              <li>
                <span>Location:</span>
                <strong>${d.location}</strong>
              </li>
              <li>
                <span>Coordinates:</span>
                <code>${d.latitude.toFixed(4)}, ${d.longitude.toFixed(4)}</code>
              </li>
              <li>
                <span>Organ Donor Status:</span>
                <strong>${d.organ_donor === 'Yes' ? `Yes (${d.organ_available})` : 'Blood Only'}</strong>
              </li>
              <li>
                <span>Emergency Contact:</span>
                <strong style="color: #0284c7;">${d.phone}</strong>
              </li>
              <li>
                <span>Matching Score:</span>
                <span style="font-size: 0.78rem; color: #10b981; font-weight: 700;">Rank #${idx + 1} (${d.matchTier})</span>
              </li>
            </ul>
          </div>

          <div class="match-card-actions">
            <button class="btn btn-danger btn-sm btn-dispatch-single" data-donor-id="${d.id}" style="flex: 1;">
              🚨 Dispatch Alert
            </button>
            <a href="tel:${d.phone}" class="btn btn-light-outline btn-sm" style="flex: 1; text-align: center;">
              📞 Call Donor
            </a>
          </div>
        </div>
      `;
    });
    cardsHtml += `</div>`;

    container.innerHTML = cardsHtml;

    // Bind individual alert dispatch buttons
    container.querySelectorAll('.btn-dispatch-single').forEach(btn => {
      btn.addEventListener('click', function () {
        const donorId = this.getAttribute('data-donor-id');
        const donor = LifeLinkDB.getDonorById(donorId);
        if (donor) {
          triggerSingleAlert(req, donor);
        }
      });
    });

    // Update Interactive Map
    initOrUpdateMap(req, compatibleDonors);
  }

  // ==========================================================================
  // Leaflet Geographic Map Integration
  // ==========================================================================
  function initOrUpdateMap(patientReq, donors) {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    if (!window.L) {
      console.warn('Leaflet library not loaded yet.');
      return;
    }

    const patientLat = parseFloat(patientReq.latitude);
    const patientLon = parseFloat(patientReq.longitude);

    if (!leafletMap) {
      leafletMap = L.map('map').setView([patientLat, patientLon], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | LifeLink Emergency GIS',
        maxZoom: 18
      }).addTo(leafletMap);

      mapMarkersLayer = L.layerGroup().addTo(leafletMap);
      mapLinesLayer = L.layerGroup().addTo(leafletMap);
    } else {
      mapMarkersLayer.clearLayers();
      mapLinesLayer.clearLayers();
    }

    // Patient Red Beacon Icon
    const patientIcon = L.divIcon({
      className: 'patient-map-beacon',
      html: `
        <div style="
          width: 24px;
          height: 24px;
          background: #dc2626;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 14px rgba(220, 38, 38, 0.9);
          animation: pulse-border 1.5s infinite;
        "></div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    // Add Patient Marker
    const patientMarker = L.marker([patientLat, patientLon], { icon: patientIcon })
      .bindPopup(`
        <strong>🚨 PATIENT: ${patientReq.patient_name}</strong><br>
        Needs: ${patientReq.blood_group} ${patientReq.organ_required !== 'None' ? `+ ${patientReq.organ_required}` : ''}<br>
        Location: ${patientReq.location}<br>
        Emergency Level: ${patientReq.emergency}
      `)
      .addTo(mapMarkersLayer);

    const bounds = L.latLngBounds([[patientLat, patientLon]]);

    // Donor Green/Blue Icons
    donors.forEach((donor, idx) => {
      const donorLat = parseFloat(donor.latitude);
      const donorLon = parseFloat(donor.longitude);
      bounds.extend([donorLat, donorLon]);

      const isTop = idx === 0;
      const donorColor = isTop ? '#10b981' : '#0284c7';

      const donorIcon = L.divIcon({
        className: 'donor-map-marker',
        html: `
          <div style="
            width: 20px;
            height: 20px;
            background: ${donorColor};
            border: 2px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 10px;
            font-weight: bold;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          ">${idx + 1}</div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      L.marker([donorLat, donorLon], { icon: donorIcon })
        .bindPopup(`
          <strong>Donor #${idx + 1}: ${donor.name}</strong><br>
          Blood: ${donor.blood_group} (${donor.matchTier})<br>
          Distance: ${donor.distanceKm} km<br>
          Phone: ${donor.phone}<br>
          Location: ${donor.location}
        `)
        .addTo(mapMarkersLayer);

      // Draw route/distance line connecting patient to donors (emphasize nearest)
      const lineOptions = {
        color: isTop ? '#10b981' : '#94a3b8',
        weight: isTop ? 3 : 1.5,
        dashArray: isTop ? null : '4, 6',
        opacity: isTop ? 0.9 : 0.6
      };

      L.polyline([[patientLat, patientLon], [donorLat, donorLon]], lineOptions)
        .bindTooltip(`${donor.name}: ${donor.distanceKm} km`, { sticky: true })
        .addTo(mapLinesLayer);
    });

    // Invalidate size to ensure clean render
    setTimeout(() => {
      leafletMap.invalidateSize();
      if (donors.length > 0) {
        leafletMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      } else {
        leafletMap.setView([patientLat, patientLon], 12);
      }
    }, 200);
  }

  // ==========================================================================
  // In-System Emergency Alert Dispatch Simulation
  // ==========================================================================
  function triggerSingleAlert(patient, donor) {
    const alertRecord = LifeLinkDB.logAlert({
      request_id: patient.id,
      patient_name: patient.patient_name,
      donor_id: donor.id,
      donor_name: donor.name,
      blood_group: donor.blood_group,
      phone: donor.phone,
      distanceKm: donor.distanceKm || LifeLinkMatcher.calculateHaversineDistance(patient.latitude, patient.longitude, donor.latitude, donor.longitude),
      channel: 'In-System Emergency Gateway',
      status: 'Dispatched'
    });

    showToast(
      `Emergency Alert sent to ${donor.name} (${donor.phone}) at ${donor.location} [${alertRecord.distanceKm} km away]`,
      'success',
      '🚨 Alert Dispatched'
    );

    updateHomeStats();
  }

  function openBroadcastModal(patient, donors) {
    const modal = document.getElementById('alert-modal');
    const modalBody = document.getElementById('alert-modal-body');
    const modalConfirmBtn = document.getElementById('btn-confirm-broadcast');

if (!modal || !modalBody || !modalConfirmBtn) {
  console.error('Broadcast modal elements missing.');
  return;
}
    modalBody.innerHTML = `
      <div style="background:#fee2e2; border-left:4px solid #dc2626; padding:0.75rem 1rem; border-radius:6px; margin-bottom:1rem;">
        <strong style="color:#b91c1c;">Emergency Protocol Confirmation</strong>
        <p style="font-size:0.85rem; color:#7f1d1d; margin-top:2px;">
          You are about to broadcast emergency priority notifications to <strong>${donors.length} compatible donor(s)</strong> for patient <strong>${patient.patient_name}</strong>.
        </p>
      </div>

      <div style="max-height: 220px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.5rem;">
        <table style="width:100%; font-size:0.85rem; border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid #e2e8f0; text-align:left; color:#64748b;">
              <th style="padding:4px;">Donor</th>
              <th style="padding:4px;">Blood</th>
              <th style="padding:4px;">Distance</th>
              <th style="padding:4px;">Contact</th>
            </tr>
          </thead>
          <tbody>
            ${donors.map(d => `
              <tr style="border-bottom: 1px dashed #f1f5f9;">
                <td style="padding:6px 4px;"><strong>${d.name}</strong></td>
                <td style="padding:6px 4px;"><span class="badge badge-blood">${d.blood_group}</span></td>
                <td style="padding:6px 4px;">${d.distanceKm} km</td>
                <td style="padding:6px 4px; font-family:monospace;">${d.phone}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 1rem; font-size: 0.8rem; color: #64748b;">
        Gateway Protocol: Haversine-Sorted In-System Priority Dispatch Queue.
      </div>
    `;

    modal.classList.add('active');

    modalConfirmBtn.onclick = function () {
      donors.forEach(d => {
        LifeLinkDB.logAlert({
          request_id: patient.id,
          patient_name: patient.patient_name,
          donor_id: d.id,
          donor_name: d.name,
          blood_group: d.blood_group,
          phone: d.phone,
          distanceKm: d.distanceKm,
          channel: 'In-System Emergency Gateway',
          status: 'Dispatched'
        });
      });

      modal.classList.remove('active');
      showToast(`Broadcast sent to all ${donors.length} compatible donors!`, 'success', 'Broadcast Dispatched');
      updateHomeStats();
      navigateTo('view-alerts');
    };
  }

  // Modal Close Bindings
  document.querySelectorAll('.modal-close, .modal-cancel').forEach(elem => {
    elem.addEventListener('click', () => {
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    });
  });

  // ==========================================================================
  // Alerts Log Page
  // ==========================================================================
  function renderAlertsLog() {
    const listContainer = document.getElementById('alerts-log-container');
    if (!listContainer) return;

    const alerts = LifeLinkDB.getAllAlerts();
    if (alerts.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔕</div>
          <h3>No Emergency Alerts Dispatched Yet</h3>
          <p>Dispatched alerts will be recorded and displayed here with timestamp and tracking status.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = `
      <ul class="alert-timeline">
        ${alerts.map(a => `
          <li class="timeline-item">
            <div class="timeline-dot ${a.status === 'Dispatched' ? 'success' : ''}"></div>
            <div class="timeline-content">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
                <strong>🚨 Alert Dispatched: ${a.donor_name} (${a.blood_group})</strong>
                <span class="badge badge-emergency-critical">${a.status}</span>
              </div>
              <div style="margin-top: 0.35rem; color:#334155;">
                For Patient: <strong>${a.patient_name}</strong> (Req: ${a.request_id})<br>
                Recipient Contact: <code>${a.phone}</code> | Distance: <strong>${a.distanceKm} km</strong> | Channel: <em>${a.channel}</em>
              </div>
              <div class="timeline-time">
                ⏱ ${new Date(a.timestamp).toLocaleString()}
              </div>
            </div>
          </li>
        `).join('')}
      </ul>
    `;
  }

  // ==========================================================================
  // Database Inspector (For Faculty / HOD Evaluation)
  // ==========================================================================
  function renderDatabaseInspector() {
    const donors = LifeLinkDB.getAllDonors();
    const requests = LifeLinkDB.getAllRequests();
    const alerts = LifeLinkDB.getAllAlerts();

    const donorsJsonElem = document.getElementById('db-donors-json');
    const requestsJsonElem = document.getElementById('db-requests-json');
    const alertsJsonElem = document.getElementById('db-alerts-json');

    if (donorsJsonElem) donorsJsonElem.textContent = JSON.stringify(donors, null, 2);
    if (requestsJsonElem) requestsJsonElem.textContent = JSON.stringify(requests, null, 2);
    if (alertsJsonElem) alertsJsonElem.textContent = JSON.stringify(alerts, null, 2);
  }

  const resetDbBtn = document.getElementById('btn-reset-db');
  if (resetDbBtn) {
    resetDbBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset the database to original demo seed data? This will restore Test Donor (Coimbatore) and sample emergency cases.')) {
        LifeLinkDB.resetDatabase();
        showToast('Database reset to canonical demo dataset.', 'info', 'Database Reset');
        renderDatabaseInspector();
        updateHomeStats();
        renderDonorsDirectory();
      }
    });
  }

  const exportDbBtn = document.getElementById('btn-export-db');
  if (exportDbBtn) {
    exportDbBtn.addEventListener('click', () => {
      const data = {
        donors: LifeLinkDB.getAllDonors(),
        requests: LifeLinkDB.getAllRequests(),
        alerts: LifeLinkDB.getAllAlerts(),
        exported_at: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lifelink_db_export_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Database exported as JSON.', 'success', 'Export Complete');
    });
  }

  // Initial Boot View
  navigateTo('view-home');
  updateHomeStats();
});
