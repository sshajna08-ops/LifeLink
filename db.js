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
    const donors = read(KEYS.donors);
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

  function addRequest(request) {
    const requests = read(KEYS.requests);
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
    const alerts = read(KEYS.alerts);
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
    Object.values(KEYS).forEach(key => localStorage.removeItem(key));
  }

  return {
    addDonor,
    getAllDonors,
    addRequest,
    getAllRequests,
    getAllAlerts,
    addAlert,
    getStats,
    resetDatabase
  };
})();
