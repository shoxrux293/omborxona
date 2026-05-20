// ===== TOAST =====
function toast(msg, type = 'success') {
  let cont = document.getElementById('toast-container');
  if (!cont) {
    cont = document.createElement('div');
    cont.id = 'toast-container';
    document.body.appendChild(cont);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="ti ${type === 'success' ? 'ti-circle-check success-icon' : 'ti-alert-circle error-icon'}"></i> ${msg}`;
  cont.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ===== LAYOUT =====
function renderLayout(page) {
  const user = getUser();
  const isAdmin = user.role === 'admin';

  const pages = [
    isAdmin ? { id: 'dashboard', icon: 'ti-chart-bar', label: 'Statistika' } : null,
    { id: 'production', icon: 'ti-hammer', label: 'Ishlab chiqarish' },
    isAdmin ? { id: 'acts', icon: 'ti-file-invoice', label: 'Aktlar' } : null,
    { id: 'ready', icon: 'ti-package', label: 'Tayyor mahsulotlar' },
    isAdmin ? { id: 'warehouse', icon: 'ti-box', label: 'Sklad' } : null,
    isAdmin ? { id: 'workers', icon: 'ti-users', label: 'Ishchilar' } : null,
    isAdmin ? { id: 'sales', icon: 'ti-shopping-cart', label: 'Sotuv' } : null,
    { id: 'alerts', icon: 'ti-bell', label: 'Ogohlantirish', badge: true },
  ].filter(Boolean);

  return `
    <div class="layout">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-brand">
            <div class="sidebar-brand-icon"><i class="ti ti-building-warehouse"></i></div>
            <span class="sidebar-brand-name">MoySklad</span>
          </div>
          <div class="sidebar-user-card">
            <div class="sidebar-user-name">
              <i class="ti ti-user" style="font-size:13px;color:var(--text2)"></i>
              ${user.username}
              <span class="role-badge ${isAdmin ? 'role-admin' : 'role-worker'}">${isAdmin ? 'Admin' : 'Ishchi'}</span>
            </div>
            <div class="sidebar-user-meta">Ombor: ${user.warehouse_id}</div>
          </div>
        </div>
        <nav class="sidebar-nav" id="sidebar-nav">
          ${pages.map(p => `
            <button class="nav-item ${page === p.id ? 'active' : ''}" data-page="${p.id}">
              <i class="ti ${p.icon}"></i>
              ${p.label}
              ${p.badge ? `<span class="nav-badge" id="alert-badge" style="display:none">0</span>` : ''}
            </button>`).join('')}
        </nav>
        <div class="sidebar-footer">
          <button class="btn btn-danger" id="logout-btn" style="width:100%">
            <i class="ti ti-logout"></i> Chiqish
          </button>
        </div>
      </aside>
      <div class="main-content">
        <div class="topbar">
          <div class="page-heading" id="page-heading"></div>
          <div class="topbar-right" id="topbar-right"></div>
        </div>
        <div class="page-body" id="page-body">
          <div class="empty-state"><span class="loader"></span></div>
        </div>
      </div>
    </div>`;
}

function bindLayout() {
  document.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => window.APP.navigate(btn.dataset.page));
  });
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    clearSession();
    window.APP.boot();
  });
  updateAlertBadge();
}

async function updateAlertBadge() {
  try {
    const alerts = await API.getAlerts();
    const badge = document.getElementById('alert-badge');
    if (badge) {
      badge.textContent = alerts.length;
      badge.style.display = alerts.length > 0 ? 'inline-block' : 'none';
    }
  } catch {}
}

// ===== DASHBOARD =====
async function loadDashboard() {
  setHeading('<i class="ti ti-chart-bar"></i> Statistika');
  try {
    const s = await API.getStats();
    document.getElementById('page-body').innerHTML = `
      <div class="metrics-grid">
        <div class="metric-card green">
          <div class="metric-label">Sklad jami</div>
          <div class="metric-value">${s.total_qty}</div>
          <i class="ti ti-box metric-icon"></i>
        </div>
        <div class="metric-card blue">
          <div class="metric-label">Ishlab chiqarilgan</div>
          <div class="metric-value">${s.total_prod}</div>
          <i class="ti ti-hammer metric-icon"></i>
        </div>
        <div class="metric-card amber">
          <div class="metric-label">Aktlar (kirim)</div>
          <div class="metric-value">${s.total_acts}</div>
          <i class="ti ti-file-invoice metric-icon"></i>
        </div>
        <div class="metric-card blue">
          <div class="metric-label">Sotilgan</div>
          <div class="metric-value">${s.total_sales}</div>
          <i class="ti ti-shopping-cart metric-icon"></i>
        </div>
        <div class="metric-card red">
          <div class="metric-label">Ogohlantirish</div>
          <div class="metric-value red">${s.alerts}</div>
          <i class="ti ti-bell metric-icon"></i>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;flex-wrap:wrap">
        <div class="card">
          <div class="card-title"><i class="ti ti-trending-up"></i> Ko'p sotilgan modellar</div>
          ${s.top_sales.length === 0
            ? `<div class="empty-state"><i class="ti ti-mood-empty"></i>Sotuv yo'q</div>`
            : s.top_sales.map(item => {
                const max = s.top_sales[0].total;
                const pct = Math.round((item.total / max) * 100);
                return `<div class="progress-row">
                  <span class="progress-label">${item.model}</span>
                  <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
                  <span class="progress-val">${item.total}</span>
                </div>`;
              }).join('')}
        </div>
        <div class="card">
          <div class="card-title"><i class="ti ti-trending-down"></i> Kam sotilgan modellar</div>
          ${s.low_sales.length === 0
            ? `<div class="empty-state"><i class="ti ti-mood-empty"></i>Sotuv yo'q</div>`
            : s.low_sales.map(item => {
                const max = s.low_sales[s.low_sales.length - 1]?.total || 1;
                const pct = Math.max(8, Math.round((item.total / max) * 100));
                return `<div class="progress-row">
                  <span class="progress-label">${item.model}</span>
                  <div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:var(--amber)"></div></div>
                  <span class="progress-val">${item.total}</span>
                </div>`;
              }).join('')}
        </div>
      </div>`;
  } catch (err) {
    showError(err.message);
  }
}

// ===== PRODUCTION =====
async function loadProduction() {
  setHeading('<i class="ti ti-hammer"></i> Ishlab chiqarish');
  try {
    const [prodList, products] = await Promise.all([API.getProduction(), API.getProducts()]);
    const models = products.map(p => p.model);
    const rankings = {};
    prodList.forEach(p => { rankings[p.worker_name] = (rankings[p.worker_name] || 0) + p.quantity; });
    const rankList = Object.entries(rankings).sort((a, b) => b[1] - a[1]);

    document.getElementById('page-body').innerHTML = `
      <div class="card">
        <div class="card-title"><i class="ti ti-plus"></i> Yangi tovar tayyorlash</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Model</label>
            <input class="form-input" id="prod-model" placeholder="Model nomi" list="prod-model-list" />
            <datalist id="prod-model-list">${models.map(m => `<option value="${m}">`).join('')}</datalist>
          </div>
          <div class="form-group" style="max-width:140px">
            <label class="form-label">Miqdor</label>
            <input class="form-input" id="prod-qty" type="number" min="1" placeholder="0" />
          </div>
          <button class="btn btn-primary btn-sm" id="prod-btn">
            <i class="ti ti-check"></i> Tayyorlandi
          </button>
        </div>
        <div id="prod-msg" style="margin-top:8px"></div>
      </div>

      ${rankList.length > 0 ? `
      <div class="card">
        <div class="card-title"><i class="ti ti-trophy"></i> Ishchilar reytingi</div>
        <div class="tbl-wrap"><table>
          <thead><tr><th style="width:40px">#</th><th>Ishchi</th><th>Jami tovar</th></tr></thead>
          <tbody>
            ${rankList.map(([name, qty], i) => `
              <tr>
                <td><span class="badge ${i === 0 ? 'badge-amber' : 'badge-blue'}">${i + 1}</span></td>
                <td>${name}</td>
                <td><strong>${qty}</strong></td>
              </tr>`).join('')}
          </tbody>
        </table></div>
      </div>` : ''}

      <div class="card">
        <div class="card-title" style="display:flex;align-items:center;justify-content:space-between">
          <span><i class="ti ti-history"></i> Ishlab chiqarish tarixi</span>
          <button class="btn btn-danger btn-xs" id="clear-prod-btn"><i class="ti ti-trash"></i> Barchasini o'chirish</button>
        </div>
        <div class="tbl-wrap"><table>
          <thead><tr><th>Sana</th><th>Ishchi</th><th>Model</th><th>Miqdor</th><th style="width:50px"></th></tr></thead>
          <tbody>
            ${prodList.length === 0
              ? `<tr><td colspan="5"><div class="empty-state"><i class="ti ti-inbox"></i>Tarix yo'q</div></td></tr>`
              : prodList.map(h => `
                <tr>
                  <td>${h.date}</td>
                  <td>${h.worker_name}</td>
                  <td>${h.model}</td>
                  <td><strong>${h.quantity}</strong></td>
                  <td><button class="btn btn-xs btn-danger del-prod-btn" data-id="${h.id}"><i class="ti ti-trash"></i></button></td>
                </tr>`).join('')}
          </tbody>
        </table></div>
      </div>`;

    document.getElementById('prod-btn').addEventListener('click', async () => {
      const model = document.getElementById('prod-model').value.trim();
      const quantity = parseInt(document.getElementById('prod-qty').value);
      if (!model || !quantity || quantity < 1) {
        document.getElementById('prod-msg').innerHTML = `<div class="msg-error"><i class="ti ti-alert-circle"></i> Model va miqdorni to'g'ri kiriting!</div>`;
        return;
      }
      try {
        await API.addProduction(model, quantity);
        toast('Muvaffaqiyatli qo\'shildi!');
        loadProduction();
      } catch (err) {
        document.getElementById('prod-msg').innerHTML = `<div class="msg-error"><i class="ti ti-alert-circle"></i> ${err.message}</div>`;
      }
    });

    document.getElementById('clear-prod-btn')?.addEventListener('click', async () => {
      if (!confirm('Barcha ishlab chiqarish tarixi o\'chirilsinmi? (Tayyor mahsulotlar ham nolga tushadi)')) return;
      try {
        await API.clearProduction();
        toast('Barcha ishlab chiqarish ma\'lumotlari o\'chirildi!');
        loadProduction();
      } catch (err) { toast(err.message, 'error'); }
    });

    document.querySelectorAll('.del-prod-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Bu yozuvni o\'chirishni tasdiqlaysizmi?')) return;
        try {
          await API.deleteProduction(btn.dataset.id);
          toast('O\'chirildi!');
          loadProduction();
        } catch (err) { toast(err.message, 'error'); }
      });
    });
  } catch (err) { showError(err.message); }
}

// ===== ACTS =====
async function loadActs() {
  setHeading('<i class="ti ti-file-invoice"></i> Aktlar (Omborga kirim)');
  try {
    const [actList, products] = await Promise.all([API.getActs(), API.getProducts()]);
    const models = products.map(p => p.model);

    document.getElementById('page-body').innerHTML = `
      <div class="card">
        <div class="card-title"><i class="ti ti-plus"></i> Yangi akt yaratish</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Model</label>
            <input class="form-input" id="act-model" placeholder="Model nomi" list="act-model-list" />
            <datalist id="act-model-list">${models.map(m => `<option value="${m}">`).join('')}</datalist>
          </div>
          <div class="form-group" style="max-width:140px">
            <label class="form-label">Miqdor</label>
            <input class="form-input" id="act-qty" type="number" min="1" placeholder="0" />
          </div>
          <button class="btn btn-primary btn-sm" id="act-btn">
            <i class="ti ti-file-plus"></i> Akt yaratish
          </button>
        </div>
        <div id="act-msg" style="margin-top:8px"></div>
      </div>
      <div id="ready-info"></div>
      <div class="card">
        <div class="card-title" style="display:flex;align-items:center;justify-content:space-between">
          <span><i class="ti ti-history"></i> Aktlar tarixi</span>
          <button class="btn btn-danger btn-xs" id="clear-acts-btn"><i class="ti ti-trash"></i> Barchasini o'chirish</button>
        </div>
        <div class="tbl-wrap"><table>
          <thead><tr><th style="width:80px">Akt №</th><th>Sana</th><th>Model</th><th>Miqdor</th><th style="width:50px"></th></tr></thead>
          <tbody>
            ${actList.length === 0
              ? `<tr><td colspan="5"><div class="empty-state"><i class="ti ti-inbox"></i>Akt yo'q</div></td></tr>`
              : actList.map(a => `
                <tr>
                  <td><span class="badge badge-blue">#${a.act_number}</span></td>
                  <td>${a.date}</td>
                  <td>${a.model}</td>
                  <td><span style="color:var(--green)">+${a.quantity}</span></td>
                  <td><button class="btn btn-xs btn-danger del-act-btn" data-id="${a.id}"><i class="ti ti-trash"></i></button></td>
                </tr>`).join('')}
          </tbody>
        </table></div>
      </div>`;

    // Show ready products in acts page
    const readyItems = await API.getReadyProducts();
    const readyInfoHtml = readyItems.length === 0 ? '' : `
      <div class="card" style="margin-bottom:1.25rem;border-color:rgba(245,158,11,0.3)">
        <div class="card-title" style="color:var(--amber)"><i class="ti ti-package"></i> Aktga tayyor mahsulotlar (oshib bo'lmaydi)</div>
        <div class="tbl-wrap"><table>
          <thead><tr><th>Model</th><th>Tayyor miqdor</th></tr></thead>
          <tbody>
            ${readyItems.map(r => `<tr>
              <td><strong>${r.model}</strong></td>
              <td><span style="font-weight:700;color:var(--amber)">${r.ready_quantity}</span> dona</td>
            </tr>`).join('')}
          </tbody>
        </table></div>
      </div>`;
    document.getElementById('ready-info').innerHTML = readyInfoHtml;

    document.getElementById('act-btn').addEventListener('click', async () => {
      const model = document.getElementById('act-model').value.trim();
      const quantity = parseInt(document.getElementById('act-qty').value);
      if (!model || !quantity || quantity < 1) {
        document.getElementById('act-msg').innerHTML = `<div class="msg-error"><i class="ti ti-alert-circle"></i> Model va miqdorni kiriting!</div>`;
        return;
      }
      try {
        const res = await API.createAct(model, quantity);
        toast('Akt yaratildi, sklad yangilandi!');
        loadActs();
      } catch (err) {
        document.getElementById('act-msg').innerHTML = `<div class="msg-error"><i class="ti ti-alert-circle"></i> ${err.message}</div>`;
      }
    });

    document.getElementById('clear-acts-btn')?.addEventListener('click', async () => {
      if (!confirm('Barcha aktlar o\'chirilsinmi? (Sklad ham 0 ga tushadi)')) return;
      try {
        await API.clearActs();
        toast('Barcha aktlar o\'chirildi!');
        loadActs();
      } catch (err) { toast(err.message, 'error'); }
    });

    document.querySelectorAll('.del-act-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Bu aktni o\'chirishni tasdiqlaysizmi?')) return;
        try {
          await API.deleteAct(btn.dataset.id);
          toast('Akt o\'chirildi!');
          loadActs();
        } catch (err) { toast(err.message, 'error'); }
      });
    });
  } catch (err) { showError(err.message); }
}

// ===== WAREHOUSE =====
async function loadWarehouse() {
  setHeading('<i class="ti ti-box"></i> Sklad qoldig\'i');
  try {
    const products = await API.getProducts();

    document.getElementById('page-body').innerHTML = `
      <div class="card">
        <div class="card-title"><i class="ti ti-plus"></i> Yangi model qo'shish</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Model nomi</label>
            <input class="form-input" id="wh-model" placeholder="Masalan: Model-D" />
          </div>
          <button class="btn btn-primary btn-sm" id="wh-btn">
            <i class="ti ti-plus"></i> Qo'shish
          </button>
        </div>
        <div id="wh-msg" style="margin-top:8px"></div>
      </div>
      <div class="card">
        <div class="card-title"><i class="ti ti-list"></i> Mahsulotlar qoldig'i</div>
        <div class="tbl-wrap"><table>
          <thead><tr><th>Model</th><th>Qoldiq (dona)</th><th>Holat</th></tr></thead>
          <tbody>
            ${products.length === 0
              ? `<tr><td colspan="3"><div class="empty-state"><i class="ti ti-inbox"></i>Mahsulot yo'q</div></td></tr>`
              : products.map(p => `
                <tr>
                  <td><strong>${p.model}</strong></td>
                  <td style="font-size:16px;font-weight:600">${p.current_quantity}</td>
                  <td>${p.current_quantity <= 10
                    ? `<span class="badge badge-red"><i class="ti ti-alert-triangle"></i> Kam!</span>`
                    : p.current_quantity <= 20
                    ? `<span class="badge badge-amber">O'rtacha</span>`
                    : `<span class="badge badge-green"><i class="ti ti-check"></i> Yaxshi</span>`}
                  </td>
                </tr>`).join('')}
          </tbody>
        </table></div>
      </div>`;

    document.getElementById('wh-btn').addEventListener('click', async () => {
      const model = document.getElementById('wh-model').value.trim();
      if (!model) {
        document.getElementById('wh-msg').innerHTML = `<div class="msg-error"><i class="ti ti-alert-circle"></i> Model nomini kiriting!</div>`;
        return;
      }
      try {
        await API.addProduct(model);
        toast('Model qo\'shildi!');
        loadWarehouse();
      } catch (err) {
        document.getElementById('wh-msg').innerHTML = `<div class="msg-error"><i class="ti ti-alert-circle"></i> ${err.message}</div>`;
      }
    });
  } catch (err) { showError(err.message); }
}

// ===== WORKERS =====
async function loadWorkers() {
  setHeading('<i class="ti ti-users"></i> Ishchilar boshqaruvi');
  try {
    const workers = await API.getWorkers();

    document.getElementById('page-body').innerHTML = `
      <div class="card">
        <div class="card-title"><i class="ti ti-user-plus"></i> Yangi ishchi qo'shish</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Login</label>
            <input class="form-input" id="w-user" placeholder="ishchi_login" />
          </div>
          <div class="form-group">
            <label class="form-label">Parol</label>
            <input class="form-input" id="w-pass" type="password" placeholder="parol" />
          </div>
          <button class="btn btn-primary btn-sm" id="w-add-btn">
            <i class="ti ti-plus"></i> Qo'shish
          </button>
        </div>
        <div id="w-msg" style="margin-top:8px"></div>
      </div>
      <div class="card">
        <div class="card-title"><i class="ti ti-list"></i> Ishchilar ro'yxati</div>
        <div class="tbl-wrap"><table>
          <thead><tr><th>Login</th><th>Rol</th><th>Yangi parol</th><th style="width:90px">Amal</th></tr></thead>
          <tbody>
            ${workers.length === 0
              ? `<tr><td colspan="4"><div class="empty-state"><i class="ti ti-users"></i>Ishchi yo'q</div></td></tr>`
              : workers.map(w => `
                <tr>
                  <td><strong>${w.username}</strong></td>
                  <td><span class="badge badge-blue"><i class="ti ti-user"></i> Ishchi</span></td>
                  <td><input class="form-input" id="np-${w.id}" type="password" placeholder="yangi parol" style="font-size:12px;padding:5px 10px" /></td>
                  <td><button class="btn btn-xs" data-wid="${w.id}"><i class="ti ti-device-floppy"></i> Saqlash</button></td>
                </tr>`).join('')}
          </tbody>
        </table></div>
      </div>`;

    document.getElementById('w-add-btn')?.addEventListener('click', async () => {
      const username = document.getElementById('w-user').value.trim();
      const password = document.getElementById('w-pass').value;
      if (!username || !password) {
        document.getElementById('w-msg').innerHTML = `<div class="msg-error"><i class="ti ti-alert-circle"></i> Login va parolni kiriting!</div>`;
        return;
      }
      try {
        await API.addWorker(username, password);
        toast('Ishchi qo\'shildi!');
        loadWorkers();
      } catch (err) {
        document.getElementById('w-msg').innerHTML = `<div class="msg-error"><i class="ti ti-alert-circle"></i> ${err.message}</div>`;
      }
    });

    document.querySelectorAll('[data-wid]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const wid = btn.dataset.wid;
        const newPass = document.getElementById('np-' + wid)?.value;
        if (!newPass) { toast('Yangi parolni kiriting!', 'error'); return; }
        try {
          await API.changeWorkerPassword(wid, newPass);
          toast('Parol yangilandi!');
          document.getElementById('np-' + wid).value = '';
        } catch (err) { toast(err.message, 'error'); }
      });
    });
  } catch (err) { showError(err.message); }
}

// ===== SALES =====
async function loadSales() {
  setHeading('<i class="ti ti-shopping-cart"></i> Sotuv (Chiqim)');
  try {
    const [salesList, products] = await Promise.all([API.getSales(), API.getProducts()]);
    const models = products.map(p => p.model);

    document.getElementById('page-body').innerHTML = `
      <div class="card">
        <div class="card-title"><i class="ti ti-minus"></i> Tovar chiqimi</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Model</label>
            <input class="form-input" id="sale-model" placeholder="Model nomi" list="sale-model-list" />
            <datalist id="sale-model-list">${models.map(m => `<option value="${m}">`).join('')}</datalist>
          </div>
          <div class="form-group" style="max-width:140px">
            <label class="form-label">Miqdor</label>
            <input class="form-input" id="sale-qty" type="number" min="1" placeholder="0" />
          </div>
          <button class="btn btn-primary btn-sm" id="sale-btn">
            <i class="ti ti-arrow-up"></i> Chiqim
          </button>
        </div>
        <div id="sale-msg" style="margin-top:8px"></div>
      </div>
      <div class="card">
        <div class="card-title" style="display:flex;align-items:center;justify-content:space-between">
          <span><i class="ti ti-history"></i> Sotuv tarixi</span>
          <button class="btn btn-danger btn-xs" id="clear-sales-btn"><i class="ti ti-trash"></i> Barchasini o'chirish</button>
        </div>
        <div class="tbl-wrap"><table>
          <thead><tr><th>Sana</th><th>Model</th><th>Miqdor</th><th style="width:50px"></th></tr></thead>
          <tbody>
            ${salesList.length === 0
              ? `<tr><td colspan="4"><div class="empty-state"><i class="ti ti-inbox"></i>Sotuv yo'q</div></td></tr>`
              : salesList.map(s => `
                <tr>
                  <td>${s.date}</td>
                  <td>${s.model}</td>
                  <td><span style="color:var(--red)">−${s.quantity}</span></td>
                  <td><button class="btn btn-xs btn-danger del-sale-btn" data-id="${s.id}"><i class="ti ti-trash"></i></button></td>
                </tr>`).join('')}
          </tbody>
        </table></div>
      </div>`;

    document.getElementById('sale-btn').addEventListener('click', async () => {
      const model = document.getElementById('sale-model').value.trim();
      const quantity = parseInt(document.getElementById('sale-qty').value);
      if (!model || !quantity || quantity < 1) {
        document.getElementById('sale-msg').innerHTML = `<div class="msg-error"><i class="ti ti-alert-circle"></i> Model va miqdorni kiriting!</div>`;
        return;
      }
      try {
        await API.addSale(model, quantity);
        toast('Chiqim amalga oshirildi!');
        updateAlertBadge();
        loadSales();
      } catch (err) {
        document.getElementById('sale-msg').innerHTML = `<div class="msg-error"><i class="ti ti-alert-circle"></i> ${err.message}</div>`;
      }
    });

    document.getElementById('clear-sales-btn')?.addEventListener('click', async () => {
      if (!confirm('Barcha sotuv ma\'lumotlari o\'chirilsinmi? (Sotilgan mahsulotlar skladdaga qaytariladi)')) return;
      try {
        await API.clearSales();
        toast('Barcha sotuv ma\'lumotlari o\'chirildi!');
        loadSales();
      } catch (err) { toast(err.message, 'error'); }
    });

    document.querySelectorAll('.del-sale-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Bu sotuvni o\'chirishni tasdiqlaysizmi?')) return;
        try {
          await API.deleteSale(btn.dataset.id);
          toast('Sotuv o\'chirildi!');
          loadSales();
        } catch (err) { toast(err.message, 'error'); }
      });
    });
  } catch (err) { showError(err.message); }
}

// ===== ALERTS =====
async function loadAlerts() {
  setHeading('<i class="ti ti-bell"></i> Ogohlantirishlar');
  try {
    const alerts = await API.getAlerts();

    document.getElementById('page-body').innerHTML = alerts.length === 0
      ? `<div class="card">
          <div style="text-align:center;padding:3rem 1rem">
            <i class="ti ti-circle-check" style="font-size:48px;color:var(--green);display:block;margin-bottom:12px"></i>
            <div style="font-size:16px;font-weight:600;color:var(--text);margin-bottom:6px">Hammasi yaxshi!</div>
            <div style="color:var(--text2);font-size:13px">Barcha mahsulotlar yetarli darajada mavjud.</div>
          </div>
        </div>`
      : `<div style="color:var(--text2);font-size:13px;margin-bottom:1rem">
          <i class="ti ti-info-circle"></i>
          Quyidagi mahsulotlar <strong style="color:var(--red)">10 donadan kam</strong> qoldi — zudlik bilan ishlab chiqarish kerak:
        </div>
        ${alerts.map(a => `
          <div class="alert-item">
            <i class="ti ti-alert-triangle" style="font-size:20px;flex-shrink:0"></i>
            <div>
              <strong>${a.model}</strong> — faqat
              <strong style="font-size:15px">${a.current_quantity}</strong> dona qoldi!
            </div>
          </div>`).join('')}`;
  } catch (err) { showError(err.message); }
}

// ===== HELPERS =====
function setHeading(html) {
  const el = document.getElementById('page-heading');
  if (el) el.innerHTML = html;
}
function showError(msg) {
  document.getElementById('page-body').innerHTML =
    `<div class="card"><div class="msg-error"><i class="ti ti-alert-circle"></i> ${msg}</div></div>`;
}

// ===== TAYYOR MAHSULOTLAR =====
async function loadReadyProducts() {
  setHeading('<i class="ti ti-package"></i> Tayyor mahsulotlar');
  try {
    const items = await API.getReadyProducts();

    document.getElementById('page-body').innerHTML = `
      <div class="card">
        <div class="card-title" style="color:var(--amber)">
          <i class="ti ti-package"></i> Aktga tayyor mahsulotlar (oshib bo'lmaydi)
        </div>
        <div class="tbl-wrap"><table>
          <thead>
            <tr>
              <th>Model</th>
              <th>Tayyor miqdor</th>
            </tr>
          </thead>
          <tbody>
            ${items.length === 0
              ? `<tr><td colspan="2">
                  <div class="empty-state">
                    <i class="ti ti-mood-happy" style="color:var(--green)"></i>
                    Hech qanday tayyor mahsulot yo'q!
                  </div>
                </td></tr>`
              : items.map(item => `
                <tr>
                  <td><strong>${item.model}</strong></td>
                  <td>
                    <span style="font-weight:700;color:${item.ready_quantity > 0 ? 'var(--amber)' : 'var(--text2)'}">${item.ready_quantity}</span>
                    <span style="color:var(--text2);font-size:13px"> dona</span>
                  </td>
                </tr>`).join('')}
          </tbody>
        </table></div>
      </div>`;
  } catch (err) { showError(err.message); }
}
