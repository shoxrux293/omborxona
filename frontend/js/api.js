// ===== API HELPER =====

const API_BASE = '';  // same origin

function getToken() {
  return localStorage.getItem('omborxona_token') || '';
}
function getUser() {
  try { return JSON.parse(localStorage.getItem('omborxona_user')); } catch { return null; }
}
function saveSession(token, user) {
  localStorage.setItem('omborxona_token', token);
  localStorage.setItem('omborxona_user', JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem('omborxona_token');
  localStorage.removeItem('omborxona_user');
}

async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API_BASE + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');
  return data;
}

const API = {
  register: (username, password)    => apiFetch('/api/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
  login:    (username, password)    => apiFetch('/api/login',    { method: 'POST', body: JSON.stringify({ username, password }) }),

  getWorkers:            ()               => apiFetch('/api/workers'),
  addWorker:             (username, password) => apiFetch('/api/workers', { method: 'POST', body: JSON.stringify({ username, password }) }),
  changeWorkerPassword:  (id, new_password)   => apiFetch(`/api/workers/${id}/password`, { method: 'PUT', body: JSON.stringify({ new_password }) }),

  getProducts:  ()              => apiFetch('/api/products'),
  addProduct:   (model)         => apiFetch('/api/products', { method: 'POST', body: JSON.stringify({ model }) }),

  getProduction: ()                    => apiFetch('/api/production'),
  addProduction: (model, quantity)     => apiFetch('/api/production', { method: 'POST', body: JSON.stringify({ model, quantity }) }),

  getActs:    ()                   => apiFetch('/api/acts'),
  createAct:  (model, quantity)    => apiFetch('/api/acts', { method: 'POST', body: JSON.stringify({ model, quantity }) }),

  getSales:   ()                   => apiFetch('/api/sales'),
  addSale:    (model, quantity)    => apiFetch('/api/sales', { method: 'POST', body: JSON.stringify({ model, quantity }) }),

  getStats:   ()  => apiFetch('/api/stats'),
  getAlerts:  ()  => apiFetch('/api/alerts'),
};

// Tayyor mahsulotlar
API.getReadyProducts = () => apiFetch('/api/ready-products');

// O'chirish
API.deleteProduction   = (id) => apiFetch(`/api/production/${id}`,      { method: 'DELETE' });
API.clearProduction    = ()   => apiFetch('/api/production/clear/all',   { method: 'DELETE' });
API.deleteAct          = (id) => apiFetch(`/api/acts/${id}`,             { method: 'DELETE' });
API.clearActs          = ()   => apiFetch('/api/acts/clear/all',         { method: 'DELETE' });
API.deleteSale         = (id) => apiFetch(`/api/sales/${id}`,            { method: 'DELETE' });
API.clearSales         = ()   => apiFetch('/api/sales/clear/all',        { method: 'DELETE' });
