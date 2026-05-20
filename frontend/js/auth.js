// ===== AUTH PAGES =====

function renderAuthPage() {
  return `
    <div class="auth-wrap">
      <div class="auth-card" id="auth-card">
        ${renderLoginForm()}
      </div>
    </div>`;
}

function renderLoginForm() {
  return `
    <div class="auth-logo">
      <div class="auth-logo-icon"><i class="ti ti-building-warehouse"></i></div>
      <span class="auth-logo-text">MoySklad</span>
    </div>
    <div class="auth-subtitle">Tizimga kirish</div>
    <div class="form-group">
      <label class="form-label">Login</label>
      <input class="form-input" id="l-user" placeholder="username" autocomplete="username" />
    </div>
    <div class="form-group">
      <label class="form-label">Parol</label>
      <input class="form-input" id="l-pass" type="password" placeholder="••••••" autocomplete="current-password" />
    </div>
    <div id="l-msg"></div>
    <button class="btn btn-primary" id="login-btn" style="margin-top:1.25rem">
      <i class="ti ti-login"></i> Kirish
    </button>
    <div class="auth-toggle">Yangi ombor? <a id="go-reg">Ro'yxatdan o'tish</a></div>`;
}

function renderRegisterForm() {
  return `
    <div class="auth-logo">
      <div class="auth-logo-icon"><i class="ti ti-building-warehouse"></i></div>
      <span class="auth-logo-text">MoySklad</span>
    </div>
    <div class="auth-subtitle">Yangi ombor yaratish</div>
    <div class="form-group">
      <label class="form-label">Login</label>
      <input class="form-input" id="r-user" placeholder="username" />
    </div>
    <div class="form-group">
      <label class="form-label">Parol</label>
      <input class="form-input" id="r-pass" type="password" placeholder="••••••" />
    </div>
    <div class="form-group">
      <label class="form-label">Parolni takrorlang</label>
      <input class="form-input" id="r-pass2" type="password" placeholder="••••••" />
    </div>
    <div id="r-msg"></div>
    <button class="btn btn-primary" id="reg-btn" style="margin-top:1.25rem">
      <i class="ti ti-user-plus"></i> Ro'yxatdan o'tish
    </button>
    <div class="auth-toggle">Hisobingiz bormi? <a id="go-login">Kirish</a></div>`;
}

function bindAuthPage() {
  document.getElementById('go-reg')?.addEventListener('click', () => {
    document.getElementById('auth-card').innerHTML = renderRegisterForm();
    bindRegister();
  });
  document.getElementById('login-btn')?.addEventListener('click', doLogin);
  document.getElementById('l-pass')?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
}

function bindRegister() {
  document.getElementById('go-login')?.addEventListener('click', () => {
    document.getElementById('auth-card').innerHTML = renderLoginForm();
    bindAuthPage();
  });
  document.getElementById('reg-btn')?.addEventListener('click', doRegister);
}

async function doLogin() {
  const username = document.getElementById('l-user').value.trim();
  const password = document.getElementById('l-pass').value;
  const msgEl = document.getElementById('l-msg');
  if (!username || !password) {
    msgEl.innerHTML = `<div class="msg-error"><i class="ti ti-alert-circle"></i> Login va parolni kiriting!</div>`;
    return;
  }
  const btn = document.getElementById('login-btn');
  btn.innerHTML = '<span class="loader"></span>';
  btn.disabled = true;
  try {
    const res = await API.login(username, password);
    saveSession(res.token, res.user);
    window.APP.boot();
  } catch (err) {
    document.getElementById('l-user').value = '';
    document.getElementById('l-pass').value = '';
    msgEl.innerHTML = `<div class="msg-error"><i class="ti ti-alert-circle"></i> ${err.message}</div>`;
    btn.innerHTML = '<i class="ti ti-login"></i> Kirish';
    btn.disabled = false;
  }
}

async function doRegister() {
  const username = document.getElementById('r-user').value.trim();
  const password = document.getElementById('r-pass').value;
  const password2 = document.getElementById('r-pass2').value;
  const msgEl = document.getElementById('r-msg');
  if (!username || !password) {
    msgEl.innerHTML = `<div class="msg-error"><i class="ti ti-alert-circle"></i> Login va parolni kiriting!</div>`;
    return;
  }
  if (password !== password2) {
    msgEl.innerHTML = `<div class="msg-error"><i class="ti ti-alert-circle"></i> Parollar mos kelmadi!</div>`;
    return;
  }
  const btn = document.getElementById('reg-btn');
  btn.innerHTML = '<span class="loader"></span>';
  btn.disabled = true;
  try {
    await API.register(username, password);
    msgEl.innerHTML = `<div class="msg-success"><i class="ti ti-circle-check"></i> Muvaffaqiyatli ro'yxatdan o'tdingiz! Kirishga o'tilmoqda...</div>`;
    setTimeout(() => {
      document.getElementById('auth-card').innerHTML = renderLoginForm();
      bindAuthPage();
    }, 1200);
  } catch (err) {
    msgEl.innerHTML = `<div class="msg-error"><i class="ti ti-alert-circle"></i> ${err.message}</div>`;
    btn.innerHTML = '<i class="ti ti-user-plus"></i> Ro\'yxatdan o\'tish';
    btn.disabled = false;
  }
}
