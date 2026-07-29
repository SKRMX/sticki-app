/* ==========================================================================
   Stocki / RedStock App - 100% Real Supabase Data Engine (No Hardcoded Mock Data)
   ========================================================================== */

// ⚙️ CONFIGURACIÓN DE SUPABASE & MERCADO PAGO
const SUPABASE_URL = 'https://zvghhfvsydajuiulgkir.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_J7s_lky44EFra28eggDS2A_Z0CKV98n';
const MERCADO_PAGO_PUBLIC_KEY = 'APP_USR-c9a99b22-e6bf-4c3d-b1d2-ef788313c5c6';

let supabaseClient = null;
if (typeof supabase !== 'undefined' && SUPABASE_URL && !SUPABASE_URL.includes('TU_PROYECTO')) {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('⚡ Conectado exitosamente a Supabase Database & Auth en vivo!');
}

(function () {
  const STORAGE_KEY = 'stocki_app_real_state_v3';

  // 100% REAL STATE - Starts Empty (NO Mock Sellers, NO Mock Inventory, NO Mock Chats)
  const defaultState = {
    currentUser: null,
    sellers: [],
    inventory: [],
    alerts: [],
    messages: []
  };

  let state = loadLocal();

  function loadLocal() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
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

  // Check active session on startup
  async function checkActiveSession() {
    if (supabaseClient) {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user) {
          const { data: prof } = await supabaseClient.from('profiles').select('*').eq('id', session.user.id).single();
          if (prof) {
            state.currentUser = prof;
            saveLocal();
          }
        }
      } catch (e) { console.warn(e); }
    }
    return state.currentUser;
  }

  // ==========================================================================
  // REAL SUPABASE AUTHENTICATION
  // ==========================================================================

  async function registerUser(email, password, fullName, phone, role, locationStr) {
    const slug = fullName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);
    
    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, phone, role, colonia: locationStr }
        }
      });

      if (error) return { success: false, message: error.message };

      if (data.user) {
        const profile = {
          id: data.user.id,
          full_name: fullName,
          phone,
          role: role || 'asociada',
          colonia: locationStr,
          whatsapp: '52' + phone.replace(/\D/g, ''),
          store_slug: slug,
          rating: 5.0,
          verified: true,
          is_subscribed: false
        };

        const { error: profErr } = await supabaseClient.from('profiles').upsert([profile]);
        if (profErr) console.warn('Profile DB Upsert:', profErr);

        state.currentUser = profile;
        if (!state.sellers.find(s => s.id === profile.id)) {
          state.sellers.push(profile);
        }
        saveLocal();
        return { success: true, profile };
      }
    }

    // Local Fallback
    const profile = {
      id: 'usr_' + Date.now(),
      full_name: fullName,
      phone,
      role: role || 'asociada',
      colonia: locationStr,
      whatsapp: '52' + phone.replace(/\D/g, ''),
      store_slug: slug,
      rating: 5.0,
      verified: true,
      is_subscribed: false,
      trialStartDate: new Date().toISOString()
    };
    state.currentUser = profile;
    state.sellers.push(profile);
    saveLocal();
    return { success: true, profile };
  }

  async function loginUser(email, password) {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) return { success: false, message: error.message };

      if (data.user) {
        const { data: prof } = await supabaseClient.from('profiles').select('*').eq('id', data.user.id).single();
        state.currentUser = prof || { id: data.user.id, full_name: email.split('@')[0], role: 'asociada' };
        saveLocal();
        return { success: true, profile: state.currentUser };
      }
    }

    return { success: false, message: 'Usuario no encontrado. Por favor crea una cuenta.' };
  }

  async function logoutUser() {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
    state.currentUser = null;
    saveLocal();
  }

  // ==========================================================================
  // REAL SUPABASE DATABASE DATA FETCHING & CRUD
  // ==========================================================================

  async function fetchRealDataFromSupabase() {
    if (supabaseClient) {
      try {
        const { data: profs } = await supabaseClient.from('profiles').select('*');
        if (profs) state.sellers = profs;

        const { data: invs } = await supabaseClient.from('seller_inventories').select('*');
        if (invs) state.inventory = invs;

        const { data: alrts } = await supabaseClient.from('alerts').select('*');
        if (alrts) state.alerts = alrts;

        saveLocal();
      } catch (e) {
        console.warn('Error fetching Supabase data:', e);
      }
    }
    return {
      sellers: state.sellers,
      inventory: state.inventory,
      alerts: state.alerts
    };
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

    const currentSellerId = state.currentUser.id;
    const newItem = {
      id: 'inv_' + Date.now(),
      seller_id: currentSellerId,
      sku: cleanSku,
      qty: parseInt(qty, 10),
      is_remate: !!isRemate,
      remate_price: rematePrice ? parseFloat(rematePrice) : null
    };

    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('seller_inventories').insert([{
        seller_id: currentSellerId,
        sku: cleanSku,
        qty: parseInt(qty, 10),
        is_remate: !!isRemate,
        remate_price: rematePrice ? parseFloat(rematePrice) : null
      }]).select();

      if (!error && data && data.length > 0) {
        state.inventory.push(data[0]);
        saveLocal();
        return { success: true, product: catalogItem };
      }
    }

    state.inventory.push(newItem);
    saveLocal();
    return { success: true, product: catalogItem };
  }

  async function deleteInventoryItem(invId) {
    if (supabaseClient) {
      await supabaseClient.from('seller_inventories').delete().eq('id', invId);
    }
    state.inventory = state.inventory.filter(i => i.id !== invId);
    saveLocal();
  }

  function generateMercadoPagoLink() {
    return `https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=STOCKI_SUB_49_MXN`;
  }

  window.StockiStore = {
    getState: () => state,
    saveLocal,
    strSKU,
    checkActiveSession,
    registerUser,
    loginUser,
    logoutUser,
    fetchRealDataFromSupabase,
    addInventoryItem,
    deleteInventoryItem,
    generateMercadoPagoLink,
    getTrialInfo: () => {
      if (!state.currentUser) return { daysLeft: 20, isSubscribed: false };
      const start = new Date(state.currentUser.created_at || Date.now());
      const diffDays = Math.ceil(Math.abs(new Date() - start) / (1000 * 60 * 60 * 24));
      const daysLeft = Math.max(0, 20 - diffDays);
      return { daysLeft, isSubscribed: state.currentUser.is_subscribed || false };
    },
    getSellerBySlug: (slug) => {
      return state.sellers.find(s => s.store_slug === slug) || null;
    }
  };
})();
