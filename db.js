const LifeLinkDB = (() => {
  const KEYS = {
    donors: "lifelink_donors",
    requests: "lifelink_requests",
    alerts: "lifelink_alerts"
  };

  function read(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  }

  function write(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function addDonor(donor) {
    const donors = getAllDonors();
    const newDonor = {
      id: Date.now(),
      ...donor,
      created_at: new Date().toISOString()
    };
    donors.push(newDonor);
    write(KEYS.donors, donors);
    return newDonor;
  }

  function getAllDonors() {
    return read(KEYS.donors);
  }

  function getDonorById(id) {
    return getAllDonors().find(d => String(d.id) === String(id));
  }

  function updateDonor(id, updates) {
    const donors = getAllDonors();
    const index = donors.findIndex(
      d => String(d.id) === String(id)
    );

    if (index === -1) return null;

    donors[index] = { ...donors[index], ...updates };
    write(KEYS.donors, donors);
    return donors[index];
  }

  function addRequest(request) {
    const requests = getAllRequests();
    const newRequest = {
      id: Date.now(),
      ...request,
      created_at: new Date().toISOString()
    };
    requests.push(newRequest);
    write(KEYS.requests, requests);
    return newRequest;
  }

  function getAllRequests() {
    return read(KEYS.requests);
  }

  function getAllAlerts() {
    return read(KEYS.alerts);
  }

  function addAlert(alert) {
    const alerts = getAllAlerts();
    const newAlert = {
      id: Date.now(),
      ...alert,
      created_at: new Date().toISOString()
    };
    alerts.push(newAlert);
    write(KEYS.alerts, alerts);
    return newAlert;
  }

  function getStats() {
    const donors = getAllDonors();
    const requests = getAllRequests();

    return {
      totalDonors: donors.length,
      availableDonors: donors.filter(d =>
        d.available === true ||
        d.available === "Available" ||
        d.available === "Yes"
      ).length,
      organDonors: donors.filter(d =>
        d.organ_donor === true || d.organ_donor === "Yes"
      ).length,
      criticalRequests: requests.filter(r =>
        r.priority === "Critical" ||
        r.emergency_level === "Critical"
      ).length
    };
  }

  function resetDatabase() {
    Object.values(KEYS).forEach(key =>
      localStorage.removeItem(key)
    );
  }

  return {
    addDonor,
    getAllDonors,
    getDonorById,
    updateDonor,
    addRequest,
    getAllRequests,
    getAllAlerts,
    addAlert,
    getStats,
    resetDatabase
  };
})();
