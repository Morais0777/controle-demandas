// ============================================================
// APP.JS — Inicialização global, tema, toast, utilitários
// Funciona sem módulos ES6 — compatível com GitHub Pages
// ============================================================

// ── Cliente Supabase (criado a partir do config.js) ──────────
const supabase = window.supabase.createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey,
  { auth: { autoRefreshToken: true, persistSession: true } }
);

// ── Proteção de rota ──────────────────────────────────────────
async function initPage(pageTitle) {
  applyTheme();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.replace('../login.html');
    return null;
  }

  populateUser(session.user);
  highlightNav();

  document.getElementById('sidebarOverlay')?.addEventListener('click', closeMobileMenu);
  document.getElementById('btnLogout')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.replace('../login.html');
  });

  if (pageTitle) {
    const el = document.getElementById('topbarTitle');
    if (el) el.textContent = pageTitle;
  }

  return session.user;
}

// ── Tema ──────────────────────────────────────────────────────
function applyTheme() {
  const saved = localStorage.getItem('cd-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('cd-theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('iconTheme');
  if (!icon) return;
  icon.innerHTML = theme === 'dark'
    ? `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`
    : `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;
}

// ── Usuário na Sidebar ────────────────────────────────────────
function populateUser(user) {
  const email = user?.email || '';
  const initials = email.slice(0, 2).toUpperCase();
  const elAvatar = document.getElementById('userAvatar');
  const elName   = document.getElementById('userName');
  const elEmail  = document.getElementById('userEmail');
  if (elAvatar) elAvatar.textContent = initials;
  if (elName)   elName.textContent   = email.split('@')[0];
  if (elEmail)  elEmail.textContent  = email;
}

// ── Nav ativo ─────────────────────────────────────────────────
function highlightNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.sidebar-nav-item').forEach(item => {
    const href = item.getAttribute('href') || '';
    if (href && path.endsWith(href.split('/').pop())) {
      item.classList.add('active');
    }
  });
}

// ── Mobile ────────────────────────────────────────────────────
function toggleMobileMenu() {
  document.getElementById('sidebar')?.classList.toggle('mobile-open');
  document.getElementById('sidebarOverlay')?.classList.toggle('active');
}
function closeMobileMenu() {
  document.getElementById('sidebar')?.classList.remove('mobile-open');
  document.getElementById('sidebarOverlay')?.classList.remove('active');
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(message, type = 'success', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = {
    success: `<svg xmlns="http://www.w3.org/2000/svg" class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>`,
    error:   `<svg xmlns="http://www.w3.org/2000/svg" class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    warning: `<svg xmlns="http://www.w3.org/2000/svg" class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info:    `<svg xmlns="http://www.w3.org/2000/svg" class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `${icons[type] || ''}<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Helpers ───────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function isOverdue(dateStr, status) {
  if (!dateStr) return false;
  const concluded = ['concluida','concluido','cancelada','cancelado'];
  if (concluded.includes(status)) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

function isToday(dateStr) {
  if (!dateStr) return false;
  return dateStr === new Date().toISOString().slice(0, 10);
}

function statusBadge(status) {
  const labels = {
    pendente:'Pendente', em_andamento:'Em andamento', concluida:'Concluída',
    concluido:'Concluído', cancelada:'Cancelada', cancelado:'Cancelado', aberta:'Aberta'
  };
  return `<span class="badge badge-${status}"><span class="badge-dot"></span>${labels[status] || status}</span>`;
}

function priorBadge(p) {
  const labels = { baixa:'Baixa', media:'Média', alta:'Alta', urgente:'Urgente' };
  return `<span class="badge badge-${p}">${labels[p] || p}</span>`;
}

function showConfirm({ title, text, onConfirm }) {
  document.getElementById('globalConfirmModal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'globalConfirmModal';
  modal.className = 'modal-overlay open';
  modal.innerHTML = `
    <div class="modal modal-sm">
      <div class="modal-body" style="text-align:center;padding:32px 24px;">
        <div class="confirm-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <h3 style="margin-bottom:8px">${title}</h3>
        <p class="confirm-text">${text}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="confirmCancel">Cancelar</button>
        <button class="btn btn-danger" id="confirmOk">Confirmar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('confirmCancel').onclick = () => modal.remove();
  document.getElementById('confirmOk').onclick     = () => { modal.remove(); onConfirm(); };
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function debounce(fn, delay = 300) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderLayout(activeSection) {
  const navItems = [
    { href: 'dashboard.html',    label: 'Dashboard',    section: 'dashboard',    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
    { href: 'demandas.html',     label: 'Demandas',     section: 'demandas',     icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>' },
    { href: 'solicitacoes.html', label: 'Solicitações', section: 'solicitacoes', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>' },
    { href: 'lembretes.html',    label: 'Lembretes',    section: 'lembretes',    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>' },
    { href: 'relatorios.html',   label: 'Relatórios',   section: 'relatorios',   icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>' },
  ];
  const navHTML = navItems.map(item => `
    <a href="${item.href}" class="sidebar-nav-item ${activeSection === item.section ? 'active' : ''}">
      <span class="nav-icon">${item.icon}</span><span>${item.label}</span>
    </a>`).join('');

  const sidebarHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        </div>
        <div class="sidebar-logo-text">
          <span class="sidebar-logo-title">Demandas</span>
          <span class="sidebar-logo-sub">Controle &amp; Gestão</span>
        </div>
      </div>
      <nav class="sidebar-nav">
        <div class="sidebar-section-label">Principal</div>
        ${navHTML}
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-user-card">
          <div class="sidebar-user-avatar" id="userAvatar">US</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name" id="userName">Usuário</div>
            <div class="sidebar-user-email" id="userEmail">email</div>
          </div>
          <button class="btn-logout" id="btnLogout" title="Sair">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>
    </aside>`;

  // Overlay separado, posicionado como fixed fora do fluxo
  if (!document.getElementById('sidebarOverlay')) {
    document.body.insertAdjacentHTML('beforeend', '<div class="sidebar-overlay" id="sidebarOverlay"></div>');
  }

  const layout = document.getElementById('appLayout');
  if (layout) {
    // Insere a sidebar como primeiro filho do appLayout para evitar gaps
    layout.insertAdjacentHTML('afterbegin', sidebarHTML);
    // Garante que o app-layout seja um flex sem gaps
    layout.style.display = 'flex';
    layout.style.minHeight = '100vh';
    layout.style.gap = '0';
    layout.style.margin = '0';
    layout.style.padding = '0';
  }
  if (!document.getElementById('toastContainer')) {
    document.body.insertAdjacentHTML('beforeend', '<div class="toast-container" id="toastContainer"></div>');
  }
}


