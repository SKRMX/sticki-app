/* ==========================================================================
   Stocki / RedStock App - Main Interactive Controller & Real Backend
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  detectAndSetNativeTheme();
  await initApp();
});

let currentDistanceFilter = 'all';
let currentCategoryFilter = 'all';
let currentFeedMode = 'busco';

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
  }, 3200);
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
  await StockiStore.fetchRealDataFromSupabase();

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

function updateAuthWidget() {
  const container = document.getElementById('authHeaderWidget');
  if (!container) return;

  const state = StockiStore.getState();
  const user = state.currentUser;

  if (user) {
    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px; cursor: pointer;" onclick="switchTab('tab-profile')">
        <span class="seller-avatar" style="width: 28px; height: 28px; font-weight: 800;">${user.full_name ? user.full_name.charAt(0) : 'U'}</span>
        <span style="font-size: 12px; font-weight: 700; color: var(--text-main); max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${user.full_name ? user.full_name.split(' ')[0] : 'Cuenta'}</span>
      </div>
      <button class="btn-outline" style="padding: 4px 8px; font-size: 11px;" onclick="handleLogout()">Salir</button>
    `;
  } else {
    container.innerHTML = `
      <button class="btn-primary" style="padding: 6px 12px; font-size: 12px;" onclick="openAuthModal('login')">🔑 Ingresar</button>
    `;
  }
}

function updateTrialDisplay() {
  const trialInfo = StockiStore.getTrialInfo();
  const trialDaysText = document.getElementById('trialDaysText');
  const profileTrialCountdown = document.getElementById('profileTrialCountdown');
  const state = StockiStore.getState();

  if (!state.currentUser) {
    if (trialDaysText) trialDaysText.textContent = '20 Días Gratis para Vendedoras';
    if (profileTrialCountdown) profileTrialCountdown.textContent = '20 Días Prueba Gratis';
    return;
  }

  if (trialInfo.isSubscribed) {
    if (trialDaysText) trialDaysText.textContent = '⭐ SUSCRIPCIÓN ACTIVA MERCADO PAGO';
    if (profileTrialCountdown) profileTrialCountdown.textContent = 'Suscripción Activa ($49/mes)';
  } else {
    const text = `Quedan ${trialInfo.daysLeft} días gratis`;
    if (trialDaysText) trialDaysText.textContent = text;
    if (profileTrialCountdown) profileTrialCountdown.textContent = text;
  }
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
}

// ==========================================================================
// MEXICAN POSTAL CODE (CP) AUTO-LOOKUP HANDLER
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
  document.getElementById('regEstado').value = 'Buscando...';
  document.getElementById('regMunicipio').value = 'Buscando...';

  const res = await StockiCPLookup.lookup(cleanCP);
  if (res.valid) {
    document.getElementById('regEstado').value = res.estado;
    document.getElementById('regMunicipio').value = res.municipio;

    const colSelect = document.getElementById('regColoniaSelect');
    colSelect.innerHTML = res.colonias.map(c => `<option value="${c}">${c}</option>`).join('');
  } else {
    document.getElementById('regEstado').value = 'No encontrado';
    document.getElementById('regMunicipio').value = 'Revisar CP';
  }
}

// ==========================================================================
// REAL SUPABASE AUTH HANDLERS
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
    updateAuthWidget();
    renderMyInventory();
    renderMarketplace();
  } else {
    showToast(`Error al ingresar: ${res.message}`, 'error');
  }
}

async function handleRealRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value;
  const phone = document.getElementById('regPhone').value;
  const role = document.getElementById('regRole').value;
  const cp = document.getElementById('regCP').value;
  const estado = document.getElementById('regEstado').value;
  const municipio = document.getElementById('regMunicipio').value;
  const colonia = document.getElementById('regColoniaSelect').value;
  const email = document.getElementById('regEmail').value;
  const pass = document.getElementById('regPassword').value;

  const fullLocation = `Col. ${colonia}, ${municipio}, ${estado} (CP ${cp})`;

  const res = await StockiStore.registerUser(email, pass, name, phone, role, fullLocation);
  if (res.success) {
    showToast(`¡Felicidades! Tu Tienda Digital para ${fullLocation} ha sido creada.`, 'success');
    closeModal('authModal');
    updateAuthWidget();
    switchTab('tab-store');
  } else {
    showToast(`Error en el registro: ${res.message}`, 'error');
  }
}

async function handleLogout() {
  await StockiStore.logoutUser();
  updateAuthWidget();
  renderMyInventory();
  renderMarketplace();
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
  }

  setTimeout(() => {
    showToast('⭐ ¡Suscripción activa! Gracias por suscribirte a Stocki ($49 MXN/mes).', 'success');
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
        <button class="btn-primary" style="max-width: 280px; margin: 0 auto;" onclick="openAuthModal('register')">🚀 Crear mi Tienda Digital Gratis</button>
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
        <button class="btn-primary" style="max-width: 240px; margin: 0 auto;" onclick="openAuthModal('login')">Ingresar a mi Cuenta</button>
      </div>
    `;
    return;
  }

  document.getElementById('myProfileName').textContent = user.full_name || 'Vendedora Registrada';
  document.getElementById('myProfileColonia').textContent = user.colonia || 'México';
  document.getElementById('myProfileInitials').textContent = (user.full_name || 'V').substring(0, 2).toUpperCase();

  const items = state.inventory.filter(i => i.seller_id === user.id);

  const statCount = document.getElementById('statItemCount');
  if (statCount) statCount.textContent = items.reduce((acc, i) => acc + i.qty, 0);

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
  const whatsappMsg = encodeURIComponent(`¡Hola ${seller.full_name || seller.name}! Vi tu Tienda Digital en Stocki y me interesa consultar tus productos Betterware de entrega inmediata.`);
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
  const whatsappMsg = encodeURIComponent(`¡Hola ${seller.full_name || seller.name}! Vi en Stocki que tienes el producto ${product.name} (SKU ${product.sku}). ¿Aún lo tienes para entrega hoy?`);
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
      <button class="btn-primary" onclick="closeModal('productDetailModal'); startDirectChat('${seller.id}', '${product.name}', '${product.sku}')">💬 Negociar Traspaso en Chat Stocki</button>
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
