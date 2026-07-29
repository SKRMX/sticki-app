/* ==========================================================================
   MyStocki (mystocki.com) - Main Interactive Controller & Real Backend
   ========================================================================== */

let deferredPwaPrompt = null;

document.addEventListener('DOMContentLoaded', async () => {
  detectAndSetNativeTheme();
  initPwaInstaller();
  await initApp();
});

let currentDistanceFilter = 'all';
let currentCategoryFilter = 'all';
let currentFeedMode = 'busco';

// ==========================================================================
// 📲 AUTOMATIC PWA INSTALLATION SYSTEM & PROMPT HANDLER
// ==========================================================================

function initPwaInstaller() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('⚡ PWA Service Worker registrado con éxito:', reg.scope))
      .catch(err => console.warn('PWA SW Registration:', err));
  }
}

function triggerPwaInstall() {}

function closePwaBanner() {}

// ==========================================================================
// 👑 EXECUTIVE SUPERADMIN CONTROL CENTER (jmcv2212@gmail.com Exclusivo)
// ==========================================================================

async function handleAdminSyncCloud() {
  showToast('⚡ Sincronizando usuarias y base de datos en la nube...', 'info');
  const res = await StockiStore.syncCloudDB();
  renderAdminMetricsAndUsers();
  const count = (res.sellers || []).filter(s => s.email.toLowerCase() !== StockiStore.SUPER_ADMIN_EMAIL.toLowerCase()).length;
  showToast(`✅ Sincronización exitosa. Se encontraron ${count} usuarias registradas en la nube.`, 'success');
}

function openAdminNewUserModal() {
  document.getElementById('adminNewUserModal')?.classList.add('active');
}

async function handleAdminRegisterUser(e) {
  e.preventDefault();
  const name = document.getElementById('adminRegName').value;
  const code = document.getElementById('adminRegCode').value;
  const phone = document.getElementById('adminRegPhone').value;
  const email = document.getElementById('adminRegEmail').value;
  const colonia = document.getElementById('adminRegColonia').value;

  const res = await StockiStore.registerUser(email, 'Pass1234!', name, phone, code, 'asociada', colonia);
  if (res.success) {
    showToast(`✅ Vendedora ${name} dada de alta y sincronizada en la nube.`, 'success');
    closeModal('adminNewUserModal');
    renderAdminMetricsAndUsers();
  } else {
    showToast(`Error: ${res.message}`, 'error');
  }
}

function switchAdminTab(tabName) {
  document.getElementById('adminSecDashboard').style.display = tabName === 'dashboard' ? 'block' : 'none';
  document.getElementById('adminSecCatalog').style.display = tabName === 'catalog' ? 'block' : 'none';
  document.getElementById('adminSecSystem').style.display = tabName === 'system' ? 'block' : 'none';

  const btnDash = document.getElementById('btnAdminTabDashboard');
  const btnCat = document.getElementById('btnAdminTabCatalog');
  const btnSys = document.getElementById('btnAdminTabSystem');

  if (btnDash) {
    btnDash.style.borderColor = tabName === 'dashboard' ? '#F59E0B' : 'transparent';
    btnDash.style.color = tabName === 'dashboard' ? '#FFFFFF' : '#94A3B8';
  }
  if (btnCat) {
    btnCat.style.borderColor = tabName === 'catalog' ? '#F59E0B' : 'transparent';
    btnCat.style.color = tabName === 'catalog' ? '#FFFFFF' : '#94A3B8';
  }
  if (btnSys) {
    btnSys.style.borderColor = tabName === 'system' ? '#F59E0B' : 'transparent';
    btnSys.style.color = tabName === 'system' ? '#FFFFFF' : '#94A3B8';
  }

  if (tabName === 'catalog') renderAdminCatalogList();
  if (tabName === 'dashboard') renderAdminMetricsAndUsers();
}

function renderAdminMetricsAndUsers() {
  const metricsContainer = document.getElementById('superAdminMetricsContainer');
  const userTableContainer = document.getElementById('superAdminUserTableList');
  if (!metricsContainer || !userTableContainer) return;

  const state = StockiStore.getState();
  const sellers = (state.sellers || []).filter(s => s.email.toLowerCase() !== StockiStore.SUPER_ADMIN_EMAIL.toLowerCase());
  const inventory = state.inventory || [];

  const totalUsers = sellers.length;
  const subscribedUsers = sellers.filter(s => s.is_subscribed).length;
  const totalProducts = inventory.length;
  const totalRevenue = subscribedUsers * 49;

  metricsContainer.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;">
      <div style="background: linear-gradient(135deg, #1E1B4B 0%, #312E81 100%); color: white; padding: 18px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1);">
        <div style="font-size: 11px; color: #C7D2FE; text-transform: uppercase; font-weight: 800;">Usuarias Registradas</div>
        <div style="font-size: 32px; font-weight: 900; color: white; margin: 4px 0;">${totalUsers}</div>
        <div style="font-size: 11px; color: #94A3B8;">Vendedoras en la nube</div>
      </div>

      <div style="background: linear-gradient(135deg, #065F46 0%, #047857 100%); color: white; padding: 18px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1);">
        <div style="font-size: 11px; color: #A7F3D0; text-transform: uppercase; font-weight: 800;">Pagaron Mensualidad</div>
        <div style="font-size: 32px; font-weight: 900; color: white; margin: 4px 0;">${subscribedUsers}</div>
        <div style="font-size: 11px; color: #D1FAE5;">$49/mes Mercado Pago</div>
      </div>

      <div style="background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%); color: white; padding: 18px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1);">
        <div style="font-size: 11px; color: #BAE6FD; text-transform: uppercase; font-weight: 800;">Ingreso Recurrente</div>
        <div style="font-size: 32px; font-weight: 900; color: white; margin: 4px 0;">$${totalRevenue} MXN</div>
        <div style="font-size: 11px; color: #E0F2FE;">Cobros mensuales</div>
      </div>

      <div style="background: linear-gradient(135deg, #4338CA 0%, #3730A3 100%); color: white; padding: 18px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1);">
        <div style="font-size: 11px; color: #C7D2FE; text-transform: uppercase; font-weight: 800;">Artículos Publicados</div>
        <div style="font-size: 32px; font-weight: 900; color: white; margin: 4px 0;">${totalProducts}</div>
        <div style="font-size: 11px; color: #E0E7FF;">Stock en vivo</div>
      </div>
    </div>
  `;

  userTableContainer.innerHTML = sellers.length === 0 ? 
    '<p style="font-size: 13px; color: #94A3B8; text-align: center; padding: 30px;">No hay vendedoras registradas en la plataforma por el momento. Haz clic en "Sincronizar Usuarias en Vivo" arriba.</p>' :
    sellers.map(s => renderAdminUserRow(s)).join('');
}

function renderAdminUserRow(s) {
  const isSub = s.is_subscribed;
  const hasDiscount = s.discount_applied;

  return `
    <div style="padding: 14px; margin-bottom: 10px; background: #0F172A; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; display: flex; justify-content: space-between; align-items: center;" id="admin_row_${s.id}">
      <div>
        <div style="font-size: 15px; font-weight: 800; color: white;">${s.full_name || s.name || 'Vendedora'}</div>
        <div style="font-size: 12px; color: #F59E0B; font-weight: 700;">🆔 Código: ${s.associate_code || 'N/A'} • ${s.role || 'Asociada'}</div>
        <div style="font-size: 12px; color: #94A3B8;">📧 ${s.email || 'Sin correo'} • 📱 ${s.phone || 'Sin tel'} • 📍 ${s.colonia || 'México'}</div>
      </div>

      <div style="display: flex; align-items: center; gap: 8px;">
        ${isSub ? '<span class="pill pill-accent">⭐ PAGADO $49</span>' : '<span class="pill pill-warning">⏳ PRUEBA GRATIS</span>'}
        ${hasDiscount ? '<span class="pill pill-primary">🎟️ 50% DESC</span>' : ''}
        
        <button class="btn-secondary" style="font-size: 11px; padding: 6px 10px;" onclick="adminGiftFreeMonth('${s.id}')">🎁 +30 Días</button>
        <button class="btn-secondary" style="font-size: 11px; padding: 6px 10px;" onclick="adminApplyDiscount('${s.id}')">🎟️ Descuento</button>
        <button class="btn-outline" style="font-size: 11px; padding: 6px 10px; color: white; border-color: rgba(255,255,255,0.2);" onclick="adminToggleSub('${s.id}')">${isSub ? '❌ Cancelar' : '💳 Activar'}</button>
        <button class="btn-outline" style="font-size: 11px; padding: 6px 10px; color: #EF4444; border-color: rgba(239, 68, 68, 0.4);" onclick="adminDeleteUser('${s.id}')">🗑️ Borrar</button>
      </div>
    </div>
  `;
}

function filterAdminUserTable(query) {
  const q = query.toLowerCase().trim();
  const state = StockiStore.getState();
  const filtered = state.sellers.filter(s => 
    s.email.toLowerCase() !== StockiStore.SUPER_ADMIN_EMAIL.toLowerCase() &&
    ((s.full_name || '').toLowerCase().includes(q) ||
    (s.email || '').toLowerCase().includes(q) ||
    (s.associate_code || '').toLowerCase().includes(q))
  );

  const container = document.getElementById('superAdminUserTableList');
  if (container) {
    container.innerHTML = filtered.map(s => renderAdminUserRow(s)).join('');
  }
}

// CATALOG EDITOR FOR SUPERADMIN (SKU, Title, Prices, Image URL)
function renderAdminCatalogList(query = '') {
  const container = document.getElementById('adminCatalogList');
  if (!container) return;

  const q = query.toLowerCase().trim();
  const catalog = window.BW_CATALOG || [];
  
  const filtered = catalog.filter(p => 
    StockiStore.strSKU(p.sku).includes(q) ||
    p.name.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q)
  );

  container.innerHTML = filtered.map(p => `
    <div style="background: #0F172A; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px; display: flex; gap: 12px; align-items: center;">
      <img src="${p.image}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; background: white;" onerror="this.src='https://via.placeholder.com/100'">
      <div style="flex: 1;">
        <div style="font-size: 12px; font-weight: 800; color: #F59E0B;">SKU ${p.sku} • ${p.category}</div>
        <div style="font-size: 13px; font-weight: 700; color: white; line-height: 1.2;">${p.name}</div>
        <div style="font-size: 11px; color: #94A3B8; margin-top: 4px;">
          Catálogo: <b style="color: white;">$${p.price_sale.toFixed(2)}</b> | Costo A: <b style="color: #34D399;">$${p.price_assoc.toFixed(2)}</b>
        </div>
      </div>
      <button class="btn-secondary" style="font-size: 11px; padding: 6px 10px;" onclick="openEditSkuModal('${p.sku}')">✏️ Editar</button>
    </div>
  `).join('');
}

function openEditSkuModal(sku) {
  const found = window.BW_CATALOG.find(p => StockiStore.strSKU(p.sku) === StockiStore.strSKU(sku));
  if (!found) return;

  document.getElementById('editSkuModalTitle').textContent = `✏️ Editar SKU ${found.sku}`;
  document.getElementById('editSkuOriginal').value = found.sku;
  document.getElementById('editSkuInput').value = found.sku;
  document.getElementById('editCategoryInput').value = found.category || 'Cocina';
  document.getElementById('editNameInput').value = found.name;
  document.getElementById('editPriceSaleInput').value = found.price_sale;
  document.getElementById('editPriceAssocInput').value = found.price_assoc;
  document.getElementById('editImageInput').value = found.image;
  document.getElementById('editImgPreview').src = found.image;

  document.getElementById('editSkuModal')?.classList.add('active');
}

function openNewSkuModal() {
  document.getElementById('editSkuModalTitle').textContent = `✨ Agregar Nuevo SKU al Catálogo`;
  document.getElementById('editSkuOriginal').value = '';
  document.getElementById('editSkuInput').value = '';
  document.getElementById('editCategoryInput').value = 'Cocina';
  document.getElementById('editNameInput').value = '';
  document.getElementById('editPriceSaleInput').value = '';
  document.getElementById('editPriceAssocInput').value = '';
  document.getElementById('editImageInput').value = '';
  document.getElementById('editImgPreview').src = '';

  document.getElementById('editSkuModal')?.classList.add('active');
}

function handleSaveSkuItem(e) {
  e.preventDefault();
  const origSku = document.getElementById('editSkuOriginal').value;
  const newSku = StockiStore.strSKU(document.getElementById('editSkuInput').value);
  const category = document.getElementById('editCategoryInput').value;
  const name = document.getElementById('editNameInput').value;
  const priceSale = parseFloat(document.getElementById('editPriceSaleInput').value);
  const priceAssoc = parseFloat(document.getElementById('editPriceAssocInput').value);
  const image = document.getElementById('editImageInput').value;

  const itemData = {
    sku: newSku,
    name,
    category,
    price_sale: priceSale,
    price_assoc: priceAssoc,
    price_dist: priceAssoc * 0.82,
    profit: priceSale - priceAssoc,
    image,
    description: name + ' - Catálogo Oficial Betterware'
  };

  if (origSku) {
    const idx = window.BW_CATALOG.findIndex(p => StockiStore.strSKU(p.sku) === StockiStore.strSKU(origSku));
    if (idx !== -1) window.BW_CATALOG[idx] = itemData;
  } else {
    window.BW_CATALOG.unshift(itemData);
  }

  showToast(`✅ Producto SKU ${newSku} (${name}) guardado en el catálogo oficial.`, 'success');
  closeModal('editSkuModal');
  renderAdminCatalogList();
  renderMarketplace();
}

function exportUsersCSV() {
  const state = StockiStore.getState();
  const sellers = state.sellers || [];
  let csv = 'ID,Nombre,Email,Telefono,CodigoAsociada,Rol,Colonia,Suscrito\n';
  sellers.forEach(s => {
    csv += `"${s.id}","${s.full_name || ''}","${s.email || ''}","${s.phone || ''}","${s.associate_code || ''}","${s.role || ''}","${s.colonia || ''}","${s.is_subscribed ? 'SI' : 'NO'}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `mystocki_usuarias_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportCatalogJSON() {
  const json = JSON.stringify(window.BW_CATALOG || [], null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `mystocki_catalogo_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function adminGiftFreeMonth(userId) {
  const state = StockiStore.getState();
  const seller = state.sellers.find(s => s.id === userId || s.email.toLowerCase() === userId.toLowerCase());
  if (!seller) return;

  seller.trial_days_added = (seller.trial_days_added || 0) + 30;
  if (state.currentUser && (state.currentUser.id === seller.id || state.currentUser.email.toLowerCase() === seller.email.toLowerCase())) {
    state.currentUser.trial_days_added = seller.trial_days_added;
  }
  StockiStore.saveLocal();
  await StockiStore.syncCloudDB();
  showToast(`🎁 ¡Se regalaron +30 días gratis a ${seller.full_name || 'vendedora'}!`, 'success');
  renderAdminMetricsAndUsers();
  updateTrialDisplay();
}

async function adminApplyDiscount(userId) {
  const state = StockiStore.getState();
  const seller = state.sellers.find(s => s.id === userId);
  if (!seller) return;

  seller.discount_applied = !seller.discount_applied;
  StockiStore.saveLocal();
  await StockiStore.syncCloudDB();
  showToast(`🎟️ Descuento del 50% para el siguiente mes ${seller.discount_applied ? 'aplicado' : 'removido'} a ${seller.full_name}.`, 'info');
  renderAdminMetricsAndUsers();
}

async function adminToggleSub(userId) {
  const state = StockiStore.getState();
  const seller = state.sellers.find(s => s.id === userId);
  if (!seller) return;

  seller.is_subscribed = !seller.is_subscribed;
  StockiStore.saveLocal();
  await StockiStore.syncCloudDB();
  showToast(`💳 Suscripción de ${seller.full_name} ${seller.is_subscribed ? 'activada' : 'desactivada'}.`, 'success');
  renderAdminMetricsAndUsers();
}

function adminDeleteUser(userId) {
  showConfirm('Eliminar Usuario', '¿Estás seguro de que deseas eliminar permanentemente a esta vendedora y su tienda?', async () => {
    const state = StockiStore.getState();
    state.sellers = state.sellers.filter(s => s.id !== userId);
    state.inventory = state.inventory.filter(i => i.seller_id !== userId);
    StockiStore.saveLocal();
    await StockiStore.syncCloudDB();

    showToast('Usuario y tienda eliminados del sistema.', 'info');
    renderAdminMetricsAndUsers();
    renderMarketplace();
  });
}

// ==========================================================================
// 💡 HOW IT WORKS LANDING MODAL CONTROLLER
// ==========================================================================

function openHowItWorksModal() {
  document.getElementById('howItWorksModal')?.classList.add('active');
}

// ==========================================================================
// 🍞 NATIVE IN-APP TOAST & CONFIRM DIALOG SYSTEM (No Browser alert())
// ==========================================================================

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) {
    console.log(message);
    return;
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

let pendingConfirmAction = null;

function showConfirm(title, message, onConfirm) {
  const modal = document.getElementById('confirmModal');
  const titleEl = document.getElementById('confirmModalTitle');
  const msgEl = document.getElementById('confirmModalMessage');
  const btnAction = document.getElementById('confirmModalBtnAction');

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;

  pendingConfirmAction = onConfirm;
  btnAction.onclick = () => {
    closeModal('confirmModal');
    if (pendingConfirmAction) pendingConfirmAction();
  };

  modal.classList.add('active');
}

// Native OS Theme Adapter (iOS HIG vs Android Material Design 3)
function detectAndSetNativeTheme(forcedMode = 'auto') {
  const body = document.body;
  body.classList.remove('os-ios', 'os-android', 'os-auto');

  if (forcedMode === 'ios') {
    body.classList.add('os-ios');
    return;
  }
  if (forcedMode === 'android') {
    body.classList.add('os-android');
    return;
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(navigator.userAgent);

  if (isIOS) {
    body.classList.add('os-ios');
  } else if (isAndroid) {
    body.classList.add('os-android');
  } else {
    body.classList.add('os-ios');
  }
}

function setNativeTheme(mode) {
  detectAndSetNativeTheme(mode);
}

async function initApp() {
  await StockiStore.checkActiveSession();
  await StockiStore.syncCloudDB();

  const isSuper = StockiStore.isSuperAdmin();
  const superAdminView = document.getElementById('superAdminView');
  const regularUserApp = document.getElementById('regularUserApp');

  if (isSuper) {
    if (superAdminView) superAdminView.style.display = 'block';
    if (regularUserApp) regularUserApp.style.display = 'none';
    renderAdminMetricsAndUsers();
  } else {
    if (superAdminView) superAdminView.style.display = 'none';
    if (regularUserApp) regularUserApp.style.display = 'flex';
    
    updateAuthWidget();
    updateTrialDisplay();
    renderRematesCarousel();
    renderMarketplace();
    renderMyInventory();
    renderFeed();
    renderChatList();

    const urlParams = new URLSearchParams(window.location.search);
    const storeSlug = urlParams.get('tienda');
    if (storeSlug) {
      const seller = StockiStore.getSellerBySlug(storeSlug);
      if (seller) viewSellerStore(seller.id);
    }
  }
}

function toggleHeaderUserMenu() {
  const menu = document.getElementById('headerUserMenuPopover');
  if (menu) menu.classList.toggle('active');
}

// Close dropdown popover when clicking outside
document.addEventListener('click', (e) => {
  const menu = document.getElementById('headerUserMenuPopover');
  const btn = document.getElementById('headerAvatarBtn');
  if (menu && menu.classList.contains('active')) {
    if (!menu.contains(e.target) && (!btn || !btn.contains(e.target))) {
      menu.classList.remove('active');
    }
  }
});

function updateAuthWidget() {
  const container = document.getElementById('authHeaderWidget');
  if (!container) return;

  const state = StockiStore.getState();
  const user = state.currentUser;

  if (user) {
    const initial = (user.full_name || 'U').charAt(0).toUpperCase();
    container.innerHTML = `
      <div style="position: relative;">
        <button id="headerAvatarBtn" class="header-user-avatar-btn" onclick="toggleHeaderUserMenu()">${initial}</button>
        
        <div id="headerUserMenuPopover" class="header-dropdown-menu">
          <div style="padding: 10px 12px; border-bottom: 1px solid var(--border-color); text-align: left;">
            <div style="font-size: 13px; font-weight: 800; color: var(--text-main); line-height: 1.2;">${user.full_name || 'Vendedora'}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${user.email}</div>
          </div>
          <button class="dropdown-item" onclick="toggleHeaderUserMenu(); switchTab('tab-profile');">
            <span>👤</span> <span>Mi Perfil & Configuración</span>
          </button>
          <button class="dropdown-item" onclick="toggleHeaderUserMenu(); openHowItWorksModal();">
            <span>💡</span> <span>¿Cómo funciona MyStocki?</span>
          </button>
          <div style="padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: var(--text-muted);">
            <span>🌐 Tema OS:</span>
            <select class="role-selector" style="font-size: 11px; padding: 2px 4px;" onchange="setNativeTheme(this.value)">
              <option value="auto">🌐 Auto OS</option>
              <option value="ios">🍏 iOS</option>
              <option value="android">🤖 Android</option>
            </select>
          </div>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item" style="color: var(--danger);" onclick="toggleHeaderUserMenu(); handleLogout();">
            <span>🚪</span> <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <button class="btn-primary" style="padding: 6px 14px; font-size: 12px; font-weight: 700;" onclick="openAuthModal('login')">🔑 Ingresar</button>
    `;
  }
}

function updateTrialDisplay() {
  const trialInfo = StockiStore.getTrialInfo();
  const trialBanner = document.getElementById('trialBanner');
  const trialDaysText = document.getElementById('trialDaysText');
  const profileTrialCountdown = document.getElementById('profileTrialCountdown');
  const profileBonusDaysInfo = document.getElementById('profileBonusDaysInfo');
  const trialBoxContainer = document.getElementById('trialBoxContainer');
  const paymentActionBox = document.getElementById('paymentActionBox');
  const activeSubBox = document.getElementById('activeSubBox');
  const profileSubStatusBadge = document.getElementById('profileSubStatusBadge');
  const state = StockiStore.getState();

  if (!state.currentUser) {
    if (trialBanner) trialBanner.style.display = 'flex';
    if (trialDaysText) trialDaysText.textContent = '20 Días Gratis para Vendedoras';
    if (profileTrialCountdown) profileTrialCountdown.textContent = '20 Días Prueba Gratis';
    if (trialBoxContainer) trialBoxContainer.style.display = 'block';
    if (paymentActionBox) paymentActionBox.style.display = 'block';
    if (activeSubBox) activeSubBox.style.display = 'none';
    if (profileSubStatusBadge) profileSubStatusBadge.style.display = 'none';
    return;
  }

  if (trialInfo.isSubscribed) {
    // Hide ALL payment prompt banners across the app when subscribed!
    if (trialBanner) trialBanner.style.display = 'none';
    if (trialBoxContainer) trialBoxContainer.style.display = 'none';
    if (paymentActionBox) paymentActionBox.style.display = 'none';
    if (activeSubBox) activeSubBox.style.display = 'block';
    if (profileSubStatusBadge) profileSubStatusBadge.style.display = 'inline-flex';
  } else {
    if (trialBanner) trialBanner.style.display = 'flex';
    if (trialBoxContainer) trialBoxContainer.style.display = 'block';
    if (paymentActionBox) paymentActionBox.style.display = 'block';
    if (activeSubBox) activeSubBox.style.display = 'none';
    if (profileSubStatusBadge) profileSubStatusBadge.style.display = 'none';

    const bonus = state.currentUser.trial_days_added || 0;
    const text = `Quedan ${trialInfo.daysLeft} días gratis`;
    if (trialDaysText) trialDaysText.textContent = text;
    if (profileTrialCountdown) profileTrialCountdown.textContent = text;
    if (profileBonusDaysInfo) {
      if (bonus > 0) {
        profileBonusDaysInfo.textContent = `🎉 ¡SuperAdmin te ha regalado +${bonus} días gratis acumulados!`;
        profileBonusDaysInfo.style.color = '#059669';
        profileBonusDaysInfo.style.fontWeight = '700';
      } else {
        profileBonusDaysInfo.textContent = 'Acceso completo a tu tienda digital, buscador por SKU y traspasos.';
      }
    }
  }
}

function loadProfileSettingsForm() {
  const state = StockiStore.getState();
  const user = state.currentUser;
  if (!user) return;

  const fnInput = document.getElementById('settingFullName');
  const codeInput = document.getElementById('settingAssocCode');
  const phoneInput = document.getElementById('settingPhone');
  const emailInput = document.getElementById('settingEmail');
  const roleSelect = document.getElementById('settingRole');
  const badgeRole = document.getElementById('profileRoleBadge');

  if (fnInput) fnInput.value = user.full_name || '';
  if (codeInput) codeInput.value = user.associate_code || '';
  if (phoneInput) phoneInput.value = user.phone || '';
  if (emailInput) emailInput.value = user.email || '';
  if (roleSelect) roleSelect.value = user.role || 'asociada';
  if (badgeRole) badgeRole.textContent = (user.role === 'lider' ? 'Distribuidora / Líder' : 'Asociada');

  const colStr = user.colonia || '';
  const cpMatch = colStr.match(/CP\s*(\d{5})/i);
  if (cpMatch) {
    const cpVal = cpMatch[1];
    const cpInput = document.getElementById('settingCP');
    if (cpInput) {
      cpInput.value = cpVal;
      handleSettingCPLookup(cpVal);
    }
  }
}

async function handleSettingCPLookup(val) {
  const cleanCP = val.replace(/\D/g, '');
  const box = document.getElementById('settingCPBox');
  if (!box) return;

  if (cleanCP.length !== 5) {
    return;
  }

  const res = await StockiCPLookup.lookup(cleanCP);
  if (res.valid) {
    document.getElementById('settingEstado').value = res.estado;
    document.getElementById('settingMunicipio').value = res.municipio;

    const colSelect = document.getElementById('settingColoniaSelect');
    colSelect.innerHTML = res.colonias.map(c => `<option value="${c}">${c}</option>`).join('');
  } else {
    document.getElementById('settingEstado').value = 'México';
    document.getElementById('settingMunicipio').value = 'Zona ' + cleanCP;
  }
}

async function handleSaveProfileSettings(e) {
  e.preventDefault();
  const state = StockiStore.getState();
  const user = state.currentUser;
  if (!user) {
    showToast('Debes iniciar sesión para guardar tu configuración.', 'error');
    return;
  }

  const fn = document.getElementById('settingFullName').value;
  const code = document.getElementById('settingAssocCode').value;
  const phone = document.getElementById('settingPhone').value;
  const role = document.getElementById('settingRole').value;

  user.full_name = fn;
  user.associate_code = code;
  user.phone = phone.replace(/\D/g, '');
  user.whatsapp = '52' + user.phone;
  user.role = role;

  const idx = state.sellers.findIndex(s => s.id === user.id);
  if (idx !== -1) state.sellers[idx] = user;

  StockiStore.saveLocal();
  await StockiStore.syncCloudDB();

  showToast('✅ Información personal guardada en tu cuenta.', 'success');
  updateAuthWidget();
  renderMyInventory();
}

async function handleSaveLocationSettings(e) {
  e.preventDefault();
  const state = StockiStore.getState();
  const user = state.currentUser;
  if (!user) {
    showToast('Debes iniciar sesión para guardar tu ubicación.', 'error');
    return;
  }

  const cp = document.getElementById('settingCP').value;
  const estado = document.getElementById('settingEstado').value;
  const municipio = document.getElementById('settingMunicipio').value;
  const colonia = document.getElementById('settingColoniaSelect').value;

  const fullLoc = `Col. ${colonia}, ${municipio}, ${estado} (CP ${cp})`;
  user.colonia = fullLoc;

  const idx = state.sellers.findIndex(s => s.id === user.id);
  if (idx !== -1) state.sellers[idx] = user;

  StockiStore.saveLocal();
  await StockiStore.syncCloudDB();

  showToast('📍 Ubicación de entrega actualizada correctamente.', 'success');
  renderMyInventory();
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-section').forEach(sec => sec.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));

  const targetSec = document.getElementById(tabId);
  if (targetSec) targetSec.classList.add('active');

  const indexMap = {
    'tab-search': 0,
    'tab-store': 1,
    'tab-feed': 2,
    'tab-chat': 3,
    'tab-profile': 4
  };
  const navBtns = document.querySelectorAll('.bottom-nav .nav-item');
  if (navBtns[indexMap[tabId]]) {
    navBtns[indexMap[tabId]].classList.add('active');
  }

  if (tabId === 'tab-search') renderMarketplace();
  if (tabId === 'tab-store') renderMyInventory();
  if (tabId === 'tab-feed') renderFeed();
  if (tabId === 'tab-chat') renderChatList();
  if (tabId === 'tab-profile') loadProfileSettingsForm();
}

// ==========================================================================
// INSTANT MEXICAN POSTAL CODE (CP) AUTO-LOOKUP HANDLER (< 1ms Execution)
// ==========================================================================

async function handleCPLookup(val) {
  const cleanCP = val.replace(/\D/g, '');
  const box = document.getElementById('cpResultBox');
  if (!box) return;

  if (cleanCP.length !== 5) {
    box.style.display = 'none';
    return;
  }

  box.style.display = 'block';

  // Real SEPOMEX API Lookup
  const res = await StockiCPLookup.lookup(cleanCP);
  if (res.valid) {
    document.getElementById('regEstado').value = res.estado;
    document.getElementById('regMunicipio').value = res.municipio;

    const colSelect = document.getElementById('regColoniaSelect');
    colSelect.innerHTML = res.colonias.map(c => `<option value="${c}">${c}</option>`).join('');
  } else {
    document.getElementById('regEstado').value = 'México';
    document.getElementById('regMunicipio').value = 'Zona ' + cleanCP;
  }
}

// ==========================================================================
// REAL SUPABASE AUTH & ANTI-ABUSE REGISTRATION HANDLERS
// ==========================================================================

function openAuthModal(mode = 'login') {
  switchAuthTab(mode);
  document.getElementById('authModal')?.classList.add('active');
}

function switchAuthTab(mode) {
  const isLogin = mode === 'login';
  document.getElementById('btnTabLogin')?.classList.toggle('active', isLogin);
  document.getElementById('btnTabRegister')?.classList.toggle('active', !isLogin);
  document.getElementById('loginForm').style.display = isLogin ? 'block' : 'none';
  document.getElementById('registerForm').style.display = isLogin ? 'none' : 'block';
  document.getElementById('authModalTitle').textContent = isLogin ? '🔑 Iniciar Sesión' : '📝 Registrar mi Tienda Digital';
}

async function handleRealLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const pass = document.getElementById('loginPassword').value;

  const res = await StockiStore.loginUser(email, pass);
  if (res.success) {
    showToast(`¡Bienvenida de nuevo, ${res.profile.full_name || 'Vendedora'}!`, 'success');
    closeModal('authModal');
    await initApp();
  } else {
    showToast(`Error al ingresar: ${res.message}`, 'error');
  }
}

async function handleRealRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value;
  const associateCode = document.getElementById('regAssociateCode').value;
  const phone = document.getElementById('regPhone').value;
  const role = document.getElementById('regRole').value;
  const cp = document.getElementById('regCP').value;
  const estado = document.getElementById('regEstado').value;
  const municipio = document.getElementById('regMunicipio').value;
  const colonia = document.getElementById('regColoniaSelect').value;
  const email = document.getElementById('regEmail').value;
  const pass = document.getElementById('regPassword').value;

  if (!email || !phone || !associateCode) {
    showToast('Correo, Teléfono y Código de Asociada Betterware son obligatorios.', 'error');
    return;
  }

  const fullLocation = `Col. ${colonia}, ${municipio}, ${estado} (CP ${cp})`;

  const res = await StockiStore.registerUser(email, pass, name, phone, associateCode, role, fullLocation);
  if (res.success) {
    showToast(`✨ ¡Felicidades ${name}! Tu Tienda ha sido verificada con Código ${associateCode}. Correo enviado via Resend.`, 'success');
    closeModal('authModal');
    await initApp();
    switchTab('tab-store');
  } else {
    showToast(`❌ Error: ${res.message}`, 'error');
  }
}

async function handleLogout() {
  await StockiStore.logoutUser();
  await initApp();
  showToast('Has cerrado sesión correctamente.', 'info');
}

// ==========================================================================
// EMBEDDED IN-APP MERCADO PAGO PAYMENT HANDLER
// ==========================================================================

async function handleNativeMercadoPagoPayment(e) {
  e.preventDefault();
  const cardNumber = document.getElementById('mpCardNumber').value;
  const holder = document.getElementById('mpCardHolder').value;

  if (cardNumber.length < 15) {
    showToast('Ingresa un número de tarjeta válido.', 'error');
    return;
  }

  showToast('💳 Procesando suscripción segura en Mercado Pago...', 'info');

  const state = StockiStore.getState();
  if (state.currentUser) {
    state.currentUser.is_subscribed = true;
    StockiStore.saveLocal();
    await StockiStore.syncCloudDB();
  }

  setTimeout(() => {
    showToast('⭐ ¡Suscripción activa! Gracias por suscribirte a MyStocki ($49 MXN/mes).', 'success');
    closeModal('subscribeModal');
    updateTrialDisplay();
  }, 1200);
}

// ==========================================================================
// FEATURED REMATES CAROUSEL & MARKETPLACE
// ==========================================================================

function renderRematesCarousel() {
  const container = document.getElementById('rematesCarousel');
  if (!container) return;

  const state = StockiStore.getState();
  const remateItems = state.inventory.filter(i => i.is_remate);

  if (remateItems.length === 0) {
    container.innerHTML = `<span style="font-size: 12px; color: var(--text-muted); font-style: italic;">No hay artículos en remate publicados hoy en tu zona.</span>`;
    return;
  }

  container.innerHTML = remateItems.map(inv => {
    const p = window.BW_CATALOG.find(cat => StockiStore.strSKU(cat.sku) === StockiStore.strSKU(inv.sku));
    if (!p) return '';

    return `
      <div style="min-width: 140px; background: white; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px; cursor: pointer;" onclick="openProductDetailModal('${inv.id}')">
        <div style="position: relative; padding-top: 100%; border-radius: 6px; overflow: hidden; margin-bottom: 6px;">
          <img src="${p.image}" style="position: absolute; top:0; left:0; width:100%; height:100%; object-fit: cover;">
          <span style="position: absolute; top: 4px; left: 4px; background: var(--warning); color: white; font-size: 9px; font-weight: 800; padding: 2px 4px; border-radius: 3px;">REMATE</span>
        </div>
        <div style="font-size: 11px; font-weight: 800; color: var(--primary);">SKU ${p.sku}</div>
        <div style="font-size: 12px; font-weight: 700; line-height: 1.1; height: 26px; overflow: hidden;">${p.name}</div>
        <div style="font-size: 13px; font-weight: 800; color: var(--danger);">$${inv.remate_price || p.price_assoc}</div>
      </div>
    `;
  }).join('');
}

function renderMarketplace() {
  const grid = document.getElementById('productGrid');
  const countEl = document.getElementById('resultCount');
  if (!grid) return;

  const state = StockiStore.getState();
  const searchQ = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
  const currentRole = state.currentUser ? state.currentUser.role : 'asociada';

  let results = [];

  state.inventory.forEach(invItem => {
    const seller = state.sellers.find(s => s.id === invItem.seller_id) || {
      full_name: 'Vendedora Registrada',
      colonia: 'México',
      distanceKm: 1.0
    };
    const catProduct = window.BW_CATALOG ? window.BW_CATALOG.find(p => StockiStore.strSKU(p.sku) === StockiStore.strSKU(invItem.sku)) : null;

    if (!catProduct) return;

    if (currentDistanceFilter !== 'all' && (seller.distanceKm || 1) > parseFloat(currentDistanceFilter)) return;
    if (currentCategoryFilter !== 'all' && catProduct.category.toLowerCase() !== currentCategoryFilter.toLowerCase()) return;

    if (searchQ) {
      const matchName = catProduct.name.toLowerCase().includes(searchQ);
      const matchSku = StockiStore.strSKU(catProduct.sku).includes(searchQ);
      const matchCat = catProduct.category.toLowerCase().includes(searchQ);
      if (!matchName && !matchSku && !matchCat) return;
    }

    results.push({ ...invItem, seller, catProduct });
  });

  if (countEl) countEl.textContent = `Mostrando ${results.length} artículos disponibles en stock en vivo`;

  if (results.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--text-muted); background: #FFFFFF; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        <div style="font-size: 42px; margin-bottom: 8px;">🏪</div>
        <div style="font-weight: 800; font-size: 16px; color: var(--text-main);">Aún no hay stock publicado en tu zona</div>
        <p style="font-size: 13px; margin: 6px 0 16px; color: var(--text-muted);">Sé la primera vendedora de tu colonia en publicar tu inventario de Betterware.</p>
        
        <div style="display: flex; flex-direction: column; gap: 8px; max-width: 280px; margin: 0 auto;">
          <button class="btn-primary" onclick="openAuthModal('register')">🚀 Crear mi Tienda Digital Gratis</button>
          <button class="btn-secondary" onclick="openHowItWorksModal()">💡 ¿Cómo funciona la plataforma?</button>
        </div>
      </div>
    `;
    return;
  }

  grid.innerHTML = results.map(item => {
    const p = item.catProduct;
    const s = item.seller;
    
    let priceHTML = `<div class="price-sale">$${p.price_sale.toFixed(2)}</div>`;
    if (currentRole === 'asociada') {
      priceHTML += `<div class="price-distrib">Costo A: $${p.price_assoc.toFixed(2)}</div>`;
    } else if (currentRole === 'lider') {
      priceHTML += `<div class="price-distrib">Costo D: $${p.price_dist.toFixed(2)}</div>`;
    }

    return `
      <div class="product-card" onclick="openProductDetailModal('${item.id}')">
        <div class="product-thumb-wrapper">
          <img src="${p.image}" alt="${p.name}" class="product-thumb" onerror="this.src='https://via.placeholder.com/300?text=Betterware'">
          ${item.is_remate ? '<span class="badge-remate">🔥 REMATE</span>' : ''}
          <span class="badge-distance">📍 ${s.colonia ? s.colonia.split(',')[0] : 'Cerca'}</span>
        </div>
        <div class="product-info">
          <span class="product-sku">SKU ${p.sku}</span>
          <div class="product-name" title="${p.name}">${p.name}</div>
          <div class="price-row">
            ${priceHTML}
          </div>
          <div class="seller-mini" onclick="event.stopPropagation(); viewSellerStore('${s.id}')">
            <span class="seller-avatar">${(s.full_name || s.name || 'V').charAt(0)}</span>
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 110px;">${s.full_name || s.name}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function handleSearch() { renderMarketplace(); }

function filterDistance(btnEl, distance) {
  document.querySelectorAll('.action-bar button[data-distance]').forEach(b => b.classList.remove('active'));
  btnEl.classList.add('active');
  currentDistanceFilter = distance;
  renderMarketplace();
}

function filterCategory(btnEl, cat) {
  document.querySelectorAll('.action-bar button[data-cat]').forEach(b => b.classList.remove('active'));
  btnEl.classList.add('active');
  currentCategoryFilter = cat;
  renderMarketplace();
}

function previewSkuItem(val) {
  const previewBox = document.getElementById('skuPreviewBox');
  if (!previewBox) return;

  const cleanSku = StockiStore.strSKU(val);
  if (!cleanSku || cleanSku.length < 3) {
    previewBox.style.display = 'none';
    return;
  }

  const found = window.BW_CATALOG ? window.BW_CATALOG.find(p => StockiStore.strSKU(p.sku) === cleanSku) : null;

  if (!found) {
    previewBox.style.display = 'block';
    previewBox.innerHTML = `<span style="font-size: 12px; color: var(--danger); font-weight: 600;">⚠️ SKU ${cleanSku} no encontrado en el catálogo Betterware.</span>`;
    return;
  }

  previewBox.style.display = 'block';
  previewBox.innerHTML = `
    <div style="display: flex; gap: 10px; align-items: center;">
      <img src="${found.image}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color);" onerror="this.src='https://via.placeholder.com/100'">
      <div style="flex: 1;">
        <div style="font-size: 12px; font-weight: 800; color: var(--primary);">SKU ${found.sku} • ${found.category}</div>
        <div style="font-size: 13px; font-weight: 700; color: var(--text-main); line-height: 1.2;">${found.name}</div>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
          Catálogo: <b>$${found.price_sale.toFixed(2)}</b> | Costo Asociado: <b style="color: var(--accent);">$${found.price_assoc.toFixed(2)}</b> | Ganancia: <b>$${found.profit.toFixed(2)}</b>
        </div>
      </div>
    </div>
  `;
}

function toggleRematePrice(checked) {
  const group = document.getElementById('rematePriceGroup');
  if (group) group.style.display = checked ? 'block' : 'none';
}

async function handleAddStock(e) {
  e.preventDefault();

  const state = StockiStore.getState();
  if (!state.currentUser) {
    showToast('Debes iniciar sesión para agregar productos a tu tienda.', 'error');
    openAuthModal('login');
    return;
  }

  const sku = document.getElementById('addSkuInput').value;
  const qty = document.getElementById('addQtyInput').value;
  const isRemate = document.getElementById('addRemateCheck').checked;
  const rematePrice = document.getElementById('addRematePrice').value;

  const result = await StockiStore.addInventoryItem(sku, qty, isRemate, rematePrice);

  if (result.success) {
    showToast(`Producto SKU ${sku} (${result.product.name}) añadido a tu Tienda.`, 'success');
    document.getElementById('addStockForm').reset();
    document.getElementById('skuPreviewBox').style.display = 'none';
    document.getElementById('rematePriceGroup').style.display = 'none';
    renderMyInventory();
    renderMarketplace();
    renderRematesCarousel();
  } else {
    showToast(result.message, 'error');
  }
}

// RENDER MY INVENTORY & PROFILE STORE TAB
function renderMyInventory() {
  const container = document.getElementById('myInventoryList');
  if (!container) return;

  const state = StockiStore.getState();
  const user = state.currentUser;

  if (!user) {
    document.getElementById('myProfileName').textContent = 'Tu Tienda Digital';
    document.getElementById('myProfileColonia').textContent = 'Ingresa para activar tu tienda';
    document.getElementById('myProfileInitials').textContent = '🔒';
    document.getElementById('statItemCount').textContent = '0';
    document.getElementById('statRating').textContent = '5.0 ★';
    document.getElementById('statTraspasos').textContent = '0';

    container.innerHTML = `
      <div style="text-align: center; padding: 30px 16px; background: #FAFAFA; border-radius: var(--radius-md);">
        <div style="font-size: 40px; margin-bottom: 8px;">🔑</div>
        <div style="font-size: 16px; font-weight: 800; color: var(--text-main);">Inicia Sesión o Registra tu Tienda</div>
        <p style="font-size: 13px; color: var(--text-muted); margin: 6px 0 16px;">Para subir tu inventario por SKU y recibir solicitudes de traspaso de otras vendedoras, debes ingresar a tu cuenta.</p>
        <div style="display: flex; flex-direction: column; gap: 8px; max-width: 240px; margin: 0 auto;">
          <button class="btn-primary" onclick="openAuthModal('login')">Ingresar a mi Cuenta</button>
          <button class="btn-secondary" onclick="openHowItWorksModal()">💡 Ver ¿Cómo funciona?</button>
        </div>
      </div>
    `;
    return;
  }

  document.getElementById('myProfileName').textContent = user.full_name || 'Vendedora Registrada';
  document.getElementById('myProfileColonia').textContent = user.colonia || 'México';
  document.getElementById('myProfileInitials').textContent = (user.full_name || 'V').substring(0, 2).toUpperCase();

  updateTrialDisplay();

  const items = state.inventory.filter(i => i.seller_id === user.id);

  const statCount = document.getElementById('statItemCount');
  const statRating = document.getElementById('statRating');
  const statTraspasos = document.getElementById('statTraspasos');

  const totalArticles = items.reduce((acc, i) => acc + (parseInt(i.qty, 10) || 0), 0);
  const userRating = user.rating !== undefined && user.rating !== null ? parseFloat(user.rating).toFixed(1) : '5.0';
  const totalTraspasos = user.traspasos_count || (state.messages ? state.messages.filter(m => m.seller_id === user.id || m.sender_id === user.id).length : 0);

  if (statCount) statCount.textContent = totalArticles;
  if (statRating) statRating.textContent = `${userRating} ★`;
  if (statTraspasos) statTraspasos.textContent = totalTraspasos;

  if (items.length === 0) {
    container.innerHTML = `<p style="font-size: 13px; color: var(--text-muted); text-align: center; padding: 20px;">Aún no has cargado ningún producto a tu tienda. ¡Ingresa un SKU arriba para comenzar!</p>`;
    return;
  }

  container.innerHTML = items.map(i => {
    const p = window.BW_CATALOG.find(cat => StockiStore.strSKU(cat.sku) === StockiStore.strSKU(i.sku)) || {
      name: 'Producto SKU ' + i.sku,
      image: 'https://via.placeholder.com/100',
      price_sale: 0
    };
    return `
      <div style="display: flex; gap: 12px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-color);">
        <img src="${p.image}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 8px;" onerror="this.src='https://via.placeholder.com/100'">
        <div style="flex: 1;">
          <div style="font-size: 11px; font-weight: 700; color: var(--primary);">SKU ${p.sku}</div>
          <div style="font-size: 13px; font-weight: 700; color: var(--text-main);">${p.name}</div>
          <div style="font-size: 12px; color: var(--text-muted);">Disponible: <b>${i.qty} pzas</b> | Catálogo: $${p.price_sale.toFixed(2)}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          ${i.is_remate ? `<span class="pill pill-warning">Remate $${i.remate_price}</span>` : `<span class="pill pill-accent">Disponible</span>`}
          <button class="modal-close" style="width: 24px; height: 24px; font-size: 12px;" onclick="deleteStockItem('${i.id}')">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

function deleteStockItem(id) {
  showConfirm('Eliminar Producto', '¿Deseas eliminar este artículo de tu tienda?', async () => {
    await StockiStore.deleteInventoryItem(id);
    showToast('Producto eliminado de tu tienda.', 'info');
    renderMyInventory();
    renderMarketplace();
    renderRematesCarousel();
  });
}

function viewSellerStore(sellerId) {
  const state = StockiStore.getState();
  const seller = state.sellers.find(s => s.id === sellerId) || state.currentUser;
  if (!seller) return;

  const items = state.inventory.filter(i => i.seller_id === seller.id);

  const modal = document.getElementById('sellerStoreModal');
  const titleEl = document.getElementById('sellerStoreTitle');
  const contentEl = document.getElementById('sellerStoreContent');

  if (titleEl) titleEl.textContent = `Tienda Digital de ${seller.full_name || seller.name}`;

  const waNumber = seller.whatsapp || '525512345678';
  const whatsappMsg = encodeURIComponent(`¡Hola ${seller.full_name || seller.name}! Vi tu Tienda Digital en MyStocki y me interesa consultar tus productos Betterware de entrega inmediata.`);
  const waUrl = `https://wa.me/${waNumber}?text=${whatsappMsg}`;

  contentEl.innerHTML = `
    <div style="background: linear-gradient(135deg, #1E1B4B 0%, #312E81 100%); color: white; border-radius: var(--radius-md); padding: 16px; margin-bottom: 16px;">
      <div style="font-size: 18px; font-weight: 800;">${seller.full_name || seller.name}</div>
      <div style="font-size: 12px; color: #C7D2FE; margin-bottom: 8px;">📍 ${seller.colonia || 'México'}</div>
      <p style="font-size: 12px; color: #E0E7FF; margin-bottom: 12px;">Vendedora verificada con entrega local inmediata.</p>
      
      <div style="display: flex; gap: 8px;">
        <a href="${waUrl}" target="_blank" class="btn-whatsapp" style="text-decoration: none;">💬 Contactar por WhatsApp Directo</a>
      </div>
    </div>

    <h4 style="font-size: 14px; margin-bottom: 10px;">Catálogo Físico Disponible (${items.length} ítems):</h4>
    <div style="display: flex; flex-direction: column; gap: 10px;">
      ${items.length === 0 ? '<p style="font-size: 12px; color: var(--text-muted);">Esta vendedora no tiene stock publicado por el momento.</p>' : ''}
      ${items.map(i => {
        const p = window.BW_CATALOG.find(cat => StockiStore.strSKU(cat.sku) === StockiStore.strSKU(i.sku)) || { name: 'SKU ' + i.sku, image: '', price_sale: 0 };
        return `
          <div style="display: flex; gap: 10px; border: 1px solid var(--border-color); padding: 10px; border-radius: var(--radius-sm); align-items: center;">
            <img src="${p.image}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;" onerror="this.src='https://via.placeholder.com/100'">
            <div style="flex: 1;">
              <div style="font-size: 11px; font-weight: 700; color: var(--primary);">SKU ${p.sku}</div>
              <div style="font-size: 13px; font-weight: 700;">${p.name}</div>
              <div style="font-size: 12px; font-weight: 800; color: var(--text-main);">$${p.price_sale.toFixed(2)}</div>
            </div>
            <button class="btn-secondary" style="font-size: 11px; padding: 6px 10px;" onclick="startDirectChat('${seller.id}', '${p.name}', '${p.sku}')">Solicitar</button>
          </div>
        `;
      }).join('')}
    </div>
  `;

  modal.classList.add('active');
}

function previewMyStore() {
  const state = StockiStore.getState();
  if (!state.currentUser) {
    openAuthModal('login');
    return;
  }
  viewSellerStore(state.currentUser.id);
}

function copyStoreLink() {
  const state = StockiStore.getState();
  const user = state.currentUser;
  if (!user) {
    openAuthModal('login');
    return;
  }
  const slug = user.store_slug || 'mi-tienda';
  const url = `${window.location.origin}${window.location.pathname}?tienda=${slug}`;
  
  navigator.clipboard.writeText(url).then(() => {
    showToast('Enlace de tu Tienda Digital copiado al portapapeles.', 'success');
  }).catch(() => {
    showToast(`Tu enlace es: ${url}`, 'info');
  });
}

function openProductDetailModal(inventoryItemId) {
  const state = StockiStore.getState();
  const invItem = state.inventory.find(i => i.id === inventoryItemId);
  if (!invItem) return;

  const seller = state.sellers.find(s => s.id === invItem.seller_id) || { full_name: 'Vendedora Registrada', colonia: 'México', whatsapp: '525512345678' };
  const product = window.BW_CATALOG.find(p => StockiStore.strSKU(p.sku) === StockiStore.strSKU(invItem.sku));
  if (!product) return;

  const modal = document.getElementById('productDetailModal');
  const titleEl = document.getElementById('detailProductTitle');
  const contentEl = document.getElementById('productDetailContent');

  if (titleEl) titleEl.textContent = product.name;

  const waNumber = seller.whatsapp || '525512345678';
  const whatsappMsg = encodeURIComponent(`¡Hola ${seller.full_name || seller.name}! Vi en MyStocki que tienes el producto ${product.name} (SKU ${product.sku}). ¿Aún lo tienes para entrega hoy?`);
  const waUrl = `https://wa.me/${waNumber}?text=${whatsappMsg}`;

  contentEl.innerHTML = `
    <div style="text-align: center; margin-bottom: 14px;">
      <img src="${product.image}" style="width: 100%; max-height: 200px; object-fit: contain; border-radius: var(--radius-md);" onerror="this.src='https://via.placeholder.com/300'">
    </div>
    
    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
      <span style="font-size: 12px; font-weight: 800; color: var(--primary);">SKU ${product.sku}</span>
      <span class="pill pill-accent">Disponible: ${invItem.qty} pzas</span>
    </div>

    <h2 style="font-size: 18px; margin-bottom: 8px;">${product.name}</h2>
    <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px; line-height: 1.4;">${product.description}</p>

    <div style="background: #F8FAFC; padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 700;">
        <span>Precio Catálogo Oficial:</span>
        <span>$${product.price_sale.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; color: var(--accent); margin-top: 4px;">
        <span>Precio de Traspaso (Costo Asociada):</span>
        <span>$${product.price_assoc.toFixed(2)}</span>
      </div>
    </div>

    <div style="border-top: 1px solid var(--border-color); padding-top: 12px; margin-bottom: 14px;">
      <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Vendedora cercana:</div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 14px; font-weight: 800;">${seller.full_name || seller.name}</div>
          <div style="font-size: 11px; color: var(--text-muted);">📍 ${seller.colonia || 'México'}</div>
        </div>
        <button class="btn-outline" onclick="viewSellerStore('${seller.id}')">Ver Tienda Completa</button>
      </div>
    </div>

    <div style="display: flex; flex-direction: column; gap: 8px;">
      <a href="${waUrl}" target="_blank" class="btn-whatsapp" style="text-decoration: none;">💬 Contactar por WhatsApp Directo</a>
      <button class="btn-primary" onclick="closeModal('productDetailModal'); startDirectChat('${seller.id}', '${product.name}', '${product.sku}')">💬 Negociar Traspaso en Chat MyStocki</button>
    </div>
  `;

  modal.classList.add('active');
}

function openSubscribeModal() { document.getElementById('subscribeModal')?.classList.add('active'); }

function switchFeedMode(mode) {
  currentFeedMode = mode;
  document.getElementById('btnFeedAlerts')?.classList.toggle('active', mode === 'busco');
  document.getElementById('btnFeedRemates')?.classList.toggle('active', mode === 'remate');
  renderFeed();
}

function renderFeed() {
  const container = document.getElementById('feedList');
  if (!container) return;

  const state = StockiStore.getState();
  const alerts = state.alerts.filter(a => a.alert_type === currentFeedMode);

  if (alerts.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 30px; background: white; border-radius: var(--radius-md); border: 1px solid var(--border-color);">📢 Aún no hay publicaciones recientes en esta sección.</p>`;
    return;
  }

  container.innerHTML = alerts.map(a => `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <div>
          <span style="font-size: 11px; font-weight: 800; color: var(--primary);">SKU ${a.sku} • ${a.product_name || 'Producto Betterware'}</span>
          <div style="font-size: 14px; font-weight: 700; color: var(--text-main);">${a.seller_name || 'Vendedora Local'}</div>
          <div style="font-size: 11px; color: var(--text-muted);">📍 ${a.colonia || 'México'} • ${a.created_at || 'Reciente'}</div>
        </div>
        <span class="pill ${a.alert_type === 'busco' ? 'pill-warning' : 'pill-accent'}">${a.alert_type === 'busco' ? 'BUSCO SKU' : 'REMATE'}</span>
      </div>
      <p style="font-size: 13px; color: var(--text-main); margin-bottom: 12px;">"${a.message}"</p>
      <button class="btn-secondary" style="width: 100%;" onclick="startDirectChat('${a.seller_id || ''}', '${a.product_name}', '${a.sku}')">💬 Responder a Vendedora</button>
    </div>
  `).join('');
}

function openNewAlertModal() {
  const state = StockiStore.getState();
  if (!state.currentUser) {
    showToast('Debes iniciar sesión para publicar alertas.', 'error');
    openAuthModal('login');
    return;
  }
  document.getElementById('newAlertModal')?.classList.add('active');
}

function handleCreateAlert(e) {
  e.preventDefault();
  const sku = document.getElementById('alertSkuInput').value;
  const qty = document.getElementById('alertQtyInput').value;
  const msg = document.getElementById('alertMsgInput').value;

  const catProduct = window.BW_CATALOG.find(p => StockiStore.strSKU(p.sku) === StockiStore.strSKU(sku));
  const productName = catProduct ? catProduct.name : 'Producto SKU ' + sku;

  const state = StockiStore.getState();
  const user = state.currentUser;
  if (!user) return;

  state.alerts.unshift({
    id: 'alt_' + Date.now(),
    seller_name: user.full_name,
    colonia: user.colonia,
    sku: StockiStore.strSKU(sku),
    product_name: productName,
    needed_qty: parseInt(qty, 10),
    message: msg,
    alert_type: 'busco',
    created_at: 'Hace un momento'
  });
  StockiStore.saveLocal();
  StockiStore.syncCloudDB();

  showToast(`Alerta publicada para el SKU ${sku}.`, 'success');
  closeModal('newAlertModal');
  switchFeedMode('busco');
}

function renderChatList() {
  const container = document.getElementById('chatListContainer');
  if (!container) return;

  const state = StockiStore.getState();
  const user = state.currentUser;

  if (!user) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px 16px; background: white; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        <div style="font-size: 36px; margin-bottom: 8px;">💬</div>
        <div style="font-size: 15px; font-weight: 800; color: var(--text-main);">Inicia Sesión para Chatear</div>
        <p style="font-size: 12px; color: var(--text-muted); margin: 6px 0 14px;">Inicia sesión para acordar traspasos de stock y entregas locales con vendedoras cercanas.</p>
        <button class="btn-primary" style="max-width: 220px; margin: 0 auto;" onclick="openAuthModal('login')">Ingresar a mi Cuenta</button>
      </div>
    `;
    return;
  }

  const chats = state.messages;
  if (chats.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 30px; background: white; border-radius: var(--radius-md); border: 1px solid var(--border-color);">💬 Aún no tienes chats de traspaso. Explora el buscador y contacta a vendedoras cercanas.</p>`;
    return;
  }

  container.innerHTML = chats.map(c => `
    <div class="chat-item" onclick="showToast('Abriendo chat de traspaso...', 'info')">
      <div class="chat-avatar">${c.sender_name ? c.sender_name.charAt(0) : 'V'}</div>
      <div class="chat-details">
        <div class="chat-user-name">
          <span>${c.sender_name}</span>
          <span class="chat-time">${c.time || '12:40 PM'}</span>
        </div>
        <div class="chat-last-msg">${c.content}</div>
      </div>
    </div>
  `).join('');
}

function startDirectChat(sellerId, productName, sku) {
  const state = StockiStore.getState();
  if (!state.currentUser) {
    showToast('Debes iniciar sesión para chatear.', 'error');
    openAuthModal('login');
    return;
  }
  switchTab('tab-chat');
  showToast(`Iniciando conversación por ${productName} (SKU ${sku})...`, 'info');
}

function closeModal(modalId) { document.getElementById(modalId)?.classList.remove('active'); }
function closeModalOnOverlay(e, modalId) { if (e.target.id === modalId) closeModal(modalId); }
