/* ==========================================================================
   MyStocki (mystocki.com) - Global Real-Time Cloud Engine & Database
   ========================================================================== */

const SUPABASE_URL = 'https://zvghhfvsydajuiulgkir.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_J7s_lky44EFra28eggDS2A_Z0CKV98n';
const MERCADO_PAGO_PUBLIC_KEY = 'APP_USR-c9a99b22-e6bf-4c3d-b1d2-ef788313c5c6';
const SUPER_ADMIN_EMAIL = 'jmcv2212@gmail.com';
const SUPER_ADMIN_PASS = 'palmera22022800';

// Global Real-Time Cloud Registry Endpoint
const GLOBAL_CLOUD_DB_URL = 'https://jsonblob.com/api/jsonBlob/019fac6f-8d41-72c1-af9a-59ea269a3fb1';

let supabaseClient = null;
if (typeof supabase !== 'undefined' && SUPABASE_URL && !SUPABASE_URL.includes('TU_PROYECTO')) {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

(function () {
  const STORAGE_KEY = 'mystocki_app_real_state_v11';

  const SUPER_ADMIN_PROFILE = {
    id: 'usr_superadmin_01',
    full_name: 'SuperAdministrador MyStocki',
    email: SUPER_ADMIN_EMAIL,
    phone: '529211756673',
    associate_code: 'SUPERADMIN',
    role: 'superadmin',
    colonia: 'Oficinas Centrales MyStocki',
    whatsapp: '529211756673',
    store_slug: 'admin-mystocki',
    rating: 5.0,
    verified: true,
    is_subscribed: true
  };

  const defaultState = {
    currentUser: null,
    sellers: [SUPER_ADMIN_PROFILE],
    inventory: [],
    alerts: [],
    messages: []
  };

  let state = loadLocal();

  function isDummyUser(s) {
    if (!s) return true;
    const em = (s.email || '').toLowerCase();
    const fn = (s.full_name || s.name || '').toLowerCase();
    const id = (s.id || '').toLowerCase();
    return em.includes('analuisa') || em.includes('betterware.com') || fn.includes('ana luisa') || id === 'usr_vendedora_02';
  }

  function getSellerKey(s) {
    if (!s) return '';
    if (s.email && s.email.trim()) return s.email.trim().toLowerCase();
    if (s.associate_code && String(s.associate_code).trim()) return 'code_' + String(s.associate_code).trim().toLowerCase();
    return s.id || '';
  }

  function loadLocal() {
    try {
      // Clear legacy storage keys
      for (let i = 1; i <= 10; i++) {
        localStorage.removeItem('mystocki_app_real_state_v' + i);
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.sellers) {
          parsed.sellers = parsed.sellers.filter(s => !isDummyUser(s));
          if (!parsed.sellers.find(s => s.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase())) {
            parsed.sellers.unshift(SUPER_ADMIN_PROFILE);
          }
        }
        return parsed;
      }
    } catch (e) { console.warn(e); }
    return defaultState;
  }

  function saveLocal() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function strSKU(val) {
    if (val === null || val === undefined) return '';
    return String(val).replace('.0', '').trim();
  }

  // ==========================================================================
  // REAL-TIME GLOBAL CLOUD PERSISTENCE ENGINE (BIDIRECTIONAL SYNC + DEDUPLICATION)
  // ==========================================================================

  async function syncCloudDB() {
    try {
      // 1. Fetch current Cloud Registry
      const resGet = await fetch(GLOBAL_CLOUD_DB_URL, { headers: { 'Accept': 'application/json' } });
      let cloudData = { sellers: [SUPER_ADMIN_PROFILE], inventory: [], alerts: [] };
      if (resGet.ok) {
        cloudData = await resGet.json();
      }

      const sellerMap = new Map();

      // First load cloudData sellers into map (deduplicating by email)
      (cloudData.sellers || []).forEach(s => {
        if (!isDummyUser(s)) {
          const key = getSellerKey(s);
          if (key) sellerMap.set(key, s);
        }
      });

      // Merge with local state sellers (newest local edits win + subscription status merge)
      (state.sellers || []).forEach(s => {
        if (!isDummyUser(s)) {
          const key = getSellerKey(s);
          if (key) {
            const cloudSeller = sellerMap.get(key) || {};
            const merged = {
              ...cloudSeller,
              ...s,
              id: cloudSeller.id || s.id,
              trial_days_added: Math.max(s.trial_days_added || 0, cloudSeller.trial_days_added || 0),
              is_subscribed: s.is_subscribed || cloudSeller.is_subscribed || false,
              discount_applied: s.discount_applied || cloudSeller.discount_applied || false
            };
            sellerMap.set(key, merged);
          }
        }
      });

      // Update state.currentUser if logged in
      if (state.currentUser) {
        const userKey = getSellerKey(state.currentUser);
        const syncedUser = sellerMap.get(userKey);
        if (syncedUser) {
          state.currentUser = {
            ...state.currentUser,
            ...syncedUser
          };
          sellerMap.set(userKey, state.currentUser);
        }
      }

      const mergedSellers = Array.from(sellerMap.values());
      if (!mergedSellers.find(s => s.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase())) {
        mergedSellers.unshift(SUPER_ADMIN_PROFILE);
      }

      // Merge inventory
      const invMap = new Map();
      (cloudData.inventory || []).forEach(i => invMap.set(i.id, i));
      (state.inventory || []).forEach(i => invMap.set(i.id, i));

      const mergedInventory = Array.from(invMap.values());

      // Update local state
      state.sellers = mergedSellers;
      state.inventory = mergedInventory;
      saveLocal();

      // Write clean merged state back to Global Cloud DB
      const payload = {
        updated_at: new Date().toISOString(),
        sellers: mergedSellers,
        inventory: mergedInventory,
        alerts: state.alerts
      };

      await fetch(GLOBAL_CLOUD_DB_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });

      return { success: true, sellers: mergedSellers, inventory: mergedInventory };
    } catch (err) {
      console.warn('Cloud Sync Error:', err);
      return { success: false, sellers: state.sellers, inventory: state.inventory };
    }
  }

  // Session persistence handler: NEVER log out user or SuperAdmin on page refresh
  async function checkActiveSession() {
    if (state.currentUser) {
      return state.currentUser;
    }

    if (supabaseClient) {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user) {
          const meta = session.user.user_metadata || {};
          const prof = {
            id: session.user.id,
            full_name: meta.full_name || session.user.email.split('@')[0],
            email: session.user.email.toLowerCase(),
            phone: meta.phone || '',
            associate_code: meta.associate_code || '',
            role: meta.role || 'asociada',
            colonia: meta.colonia || 'México',
            whatsapp: meta.phone ? '52' + meta.phone : '',
            store_slug: (meta.full_name || 'vendedora').toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + session.user.id.slice(0, 4),
            rating: 5.0,
            verified: true,
            is_subscribed: false
          };
          state.currentUser = prof;
          saveLocal();
        }
      } catch (e) { console.warn(e); }
    }
    return state.currentUser;
  }

  // ==========================================================================
  // REAL SUPABASE AUTH & REGISTRATION
  // ==========================================================================

  async function registerUser(email, password, fullName, phone, associateCode, role, locationStr) {
    if (!email || !phone || !associateCode) {
      return { success: false, message: 'Correo, Teléfono y Código de Asociada Betterware son obligatorios.' };
    }

    const cleanAssocCode = String(associateCode).trim();
    const cleanPhone = String(phone).replace(/\D/g, '');
    const cleanEmail = String(email).trim().toLowerCase();

    // Anti-Abuse Check: Ensure Betterware Associate Code / Email is unique
    const duplicateAssoc = state.sellers.find(s => 
      s.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase() &&
      (s.associate_code === cleanAssocCode || s.email.toLowerCase() === cleanEmail || s.phone === cleanPhone)
    );

    if (duplicateAssoc) {
      return { 
        success: false, 
        message: `El Código de Asociada "${cleanAssocCode}" o Correo "${cleanEmail}" ya se encuentra registrado.` 
      };
    }

    const slug = fullName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);
    const userId = 'usr_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    const profile = {
      id: userId,
      full_name: fullName,
      email: cleanEmail,
      phone: cleanPhone,
      associate_code: cleanAssocCode,
      role: role || 'asociada',
      colonia: locationStr,
      whatsapp: '52' + cleanPhone,
      store_slug: slug,
      rating: 5.0,
      verified: true,
      is_subscribed: false,
      created_at: new Date().toISOString()
    };

    if (supabaseClient) {
      try {
        await supabaseClient.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { full_name: fullName, associate_code: cleanAssocCode, phone: cleanPhone, role: role || 'asociada', colonia: locationStr } }
        });
      } catch (e) { console.warn(e); }
    }

    state.currentUser = profile;
    state.sellers.push(profile);
    saveLocal();

    // Perform Immediate Global Cloud DB Sync (< 500ms)
    await syncCloudDB();

    return { success: true, profile };
  }

  async function loginUser(email, password) {
    const cleanEmail = email.trim().toLowerCase();

    // Check SuperAdmin Credentials
    if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase() && password === SUPER_ADMIN_PASS) {
      state.currentUser = SUPER_ADMIN_PROFILE;
      saveLocal();
      await syncCloudDB(); // SuperAdmin syncs all users live on login!
      return { success: true, profile: SUPER_ADMIN_PROFILE };
    }

    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email: cleanEmail, password });
        if (data && data.user) {
          const meta = data.user.user_metadata || {};
          const prof = {
            id: data.user.id,
            full_name: meta.full_name || cleanEmail.split('@')[0],
            email: cleanEmail,
            phone: meta.phone || '',
            associate_code: meta.associate_code || '',
            role: meta.role || 'asociada',
            colonia: meta.colonia || 'México',
            whatsapp: meta.phone ? '52' + meta.phone : '',
            store_slug: (meta.full_name || 'vendedora').toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + data.user.id.slice(0, 4),
            rating: 5.0,
            verified: true,
            is_subscribed: false
          };
          state.currentUser = prof;
          const existingIdx = state.sellers.findIndex(s => s.id === prof.id || s.email.toLowerCase() === cleanEmail);
          if (existingIdx !== -1) {
            state.sellers[existingIdx] = prof;
          } else {
            state.sellers.push(prof);
          }
          saveLocal();
          await syncCloudDB();
          return { success: true, profile: prof };
        }
      } catch (e) { console.warn(e); }
    }

    // Local / Cloud Sync check
    await syncCloudDB();
    const found = state.sellers.find(s => s.email.toLowerCase() === cleanEmail);
    if (found) {
      state.currentUser = found;
      saveLocal();
      return { success: true, profile: found };
    }

    return { success: false, message: 'Usuario no encontrado. Por favor crea una cuenta.' };
  }

  async function logoutUser() {
    if (supabaseClient) {
      try { await supabaseClient.auth.signOut(); } catch (e) {}
    }
    state.currentUser = null;
    saveLocal();
  }

  async function fetchRealDataFromSupabase() {
    return await syncCloudDB();
  }

  async function addInventoryItem(sku, qty, isRemate = false, rematePrice = null) {
    const cleanSku = strSKU(sku);
    const catalogItem = window.BW_CATALOG ? window.BW_CATALOG.find(p => strSKU(p.sku) === cleanSku) : null;
    if (!catalogItem) {
      return { success: false, message: 'SKU no encontrado en el catálogo de Betterware.' };
    }

    if (!state.currentUser) {
      return { success: false, message: 'Debes iniciar sesión para agregar productos a tu tienda.' };
    }

    const newItem = {
      id: 'inv_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      seller_id: state.currentUser.id,
      seller_email: (state.currentUser.email || '').toLowerCase(),
      sku: cleanSku,
      qty: parseInt(qty, 10),
      is_remate: !!isRemate,
      remate_price: rematePrice ? parseFloat(rematePrice) : null,
      created_at: new Date().toISOString()
    };

    state.inventory.push(newItem);
    saveLocal();

    await syncCloudDB(); // Sync inventory across devices

    return { success: true, product: catalogItem };
  }

  async function deleteInventoryItem(invId) {
    state.inventory = state.inventory.filter(i => i.id !== invId);
    saveLocal();
    await syncCloudDB();
  }

  function generateMercadoPagoLink() {
    return `https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=STOCKI_SUB_49_MXN`;
  }

  window.StockiStore = {
    getState: () => state,
    saveLocal,
    syncCloudDB,
    strSKU,
    checkActiveSession,
    registerUser,
    loginUser,
    logoutUser,
    fetchRealDataFromSupabase,
    addInventoryItem,
    deleteInventoryItem,
    generateMercadoPagoLink,
    SUPER_ADMIN_EMAIL,
    isSuperAdmin: () => {
      return state.currentUser && state.currentUser.email && state.currentUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
    },
    getTrialInfo: () => {
      if (!state.currentUser) return { daysLeft: 20, isSubscribed: false };
      const start = new Date(state.currentUser.created_at || Date.now());
      const diffDays = Math.floor(Math.abs(new Date() - start) / (1000 * 60 * 60 * 24));
      const bonusDays = state.currentUser.trial_days_added || 0;
      const daysLeft = Math.max(0, (20 + bonusDays) - diffDays);
      return { daysLeft, isSubscribed: state.currentUser.is_subscribed || false };
    },
    getSellerBySlug: (slug) => {
      return state.sellers.find(s => s.store_slug === slug) || null;
    }
  };
})();
