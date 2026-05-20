// ===== MAIN APP =====

const APP = {
  currentPage: null,

  boot() {
    const user = getUser();
    const app = document.getElementById('app');
    if (!user) {
      app.innerHTML = renderAuthPage();
      bindAuthPage();
      return;
    }
    this.currentPage = user.role === 'admin' ? 'dashboard' : 'production';
    app.innerHTML = renderLayout(this.currentPage);
    bindLayout();
    this.loadPage(this.currentPage);
  },

  navigate(page) {
    this.currentPage = page;
    // update active nav item
    document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === page);
    });
    document.getElementById('page-body').innerHTML =
      `<div class="empty-state"><span class="loader"></span></div>`;
    this.loadPage(page);
  },

  loadPage(page) {
    switch (page) {
      case 'dashboard':  loadDashboard();  break;
      case 'production': loadProduction(); break;
      case 'acts':       loadActs();       break;
      case 'warehouse':  loadWarehouse();  break;
      case 'workers':    loadWorkers();    break;
      case 'sales':      loadSales();      break;
      case 'alerts':     loadAlerts();     break;
      case 'ready':      loadReadyProducts(); break;
      default:
        document.getElementById('page-body').innerHTML =
          `<div class="empty-state"><i class="ti ti-mood-sad"></i>Sahifa topilmadi</div>`;
    }
  }
};

window.APP = APP;
document.addEventListener('DOMContentLoaded', () => APP.boot());
