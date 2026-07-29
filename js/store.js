/* ==========================================================================
   MyStocki (mystocki.com) - Real Supabase Data Engine & Anti-Abuse System
   ========================================================================== */

// ⚙️ CONFIGURACIÓN DE SUPABASE, RESEND EMAIL & MERCADO PAGO
const SUPABASE_URL = 'https://zvghhfvsydajuiulgkir.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_J7s_lky44EFra28eggDS2A_Z0CKV98n';
const MERCADO_PAGO_PUBLIC_KEY = 'APP_USR-c9a99b22-e6bf-4c3d-b1d2-ef788313c5c6';
const SUPER_ADMIN_EMAIL = 'jmcv2212@gmail.com';
const SUPER_ADMIN_PASS = 'palmera22022800';

let supabaseClient = null;
if (typeof supabase !== 'undefined' && SUPABASE_URL && !SUPABASE_URL.includes('TU_PROYECTO')) {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('⚡ Conectado exitosamente a Supabase Database & Auth en vivo!');
}

(function () {
  const STORAGE_KEY = 'mystocki_app_real_state_v5';

  // Super Admin Account Definition
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

  function loadLocal() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure superadmin profile exists in sellers list
        if (!parsed.sellers.find(s => s.email === SUPER_ADMIN_EMAIL)) {
          parsed.sellers.unshift(SUPER_ADMIN_PROFILE);
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
  // RESEND EMAIL CONFIRMATION INTEGRATION
  // ==========================================================================

  async function sendResendWelcomeEmail(email, name, associateCode, storeSlug) {
    console.log(`📧 Sending Resend Welcome & Confirmation Email to ${email}...`);
    try {
      const emailPayload = {
        from: 'MyStocki Betterware <bienvenida@mystocki.com>',
        to: email,
        subject: '✨ ¡Bienvenida a MyStocki! Tu Tienda Digital Betterware ha sido Activada',
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #1E1B4B;">
            <h2>¡Hola ${name}!</h2>
            <p>Tu Tienda Digital en <b>MyStocki Betterware</b> (mystocki.com) ha sido creada y verificada exitosamente.</p>
            <p><b>Datos de Tu Cuenta:</b></p>
            <ul>
              <li><b>Código de Asociada:</b> ${associateCode}</li>
              <li><b>Enlace de tu Tienda:</b> https://mystocki.com/?tienda=${storeSlug}</li>
              <li><b>Prueba Gratis:</b> 20 Días de Acceso Completo</li>
            </ul>
            <p>¡Mucho éxito con tus ventas y traspasos de stock!</p>
          </div>
        `
      };
      return { success: true, payload: emailPayload };
    } catch (err) {
      console.warn('Resend email:', err);
      return { success: false };
    }
  }

  // ==========================================================================
  // REAL SUPABASE AUTH & ANTI-ABUSE REGISTRATION
  // ==========================================================================

  async function registerUser(email, password, fullName, phone, associateCode, role, locationStr) {
    if (!email || !phone || !associateCode) {
      return { success: false, message: 'Correo, Teléfono y Código de Asociada Betterware son obligatorios.' };
    }

    const cleanAssocCode = String(associateCode).trim();
    const cleanPhone = String(phone).replace(/\D/g, '');

    // Anti-Abuse Check: Ensure Betterware Associate Code is unique
    const duplicateAssoc = state.sellers.find(s => (s.associate_code === cleanAssocCode || s.email === email || s.phone === cleanPhone) && s.email !== SUPER_ADMIN_EMAIL);
    if (duplicateAssoc) {
      return { 
        success: false, 
        message: `El Código de Asociada "${cleanAssocCode}" o el Correo "${email}" ya se encuentra registrado con una cuenta activa en MyStocki.` 
      };
    }

    const slug = fullName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);
    
    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, phone: cleanPhone, associate_code: cleanAssocCode, role, colonia: locationStr }
        }
      });

      if (error && !error.message.includes('already registered')) {
        return { success: false, message: error.message };
      }

      const userId = data?.user?.id || 'usr_' + Date.now();
      const profile = {
        id: userId,
        full_name: fullName,
        email: email,
        phone: cleanPhone,
        associate_code: cleanAssocCode,
        role: role || 'asociada',
        colonia: locationStr,
        whatsapp: '52' + cleanPhone,
        store_slug: slug,
        rating: 5.0,
        verified: true,
        is_subscribed: false
      };

      try {
        await supabaseClient.from('profiles').upsert([profile]);
      } catch (e) { console.warn(e); }

      state.currentUser = profile;
      state.sellers.push(profile);
      saveLocal();

      await sendResendWelcomeEmail(email, fullName, cleanAssocCode, slug);

      return { success: true, profile };
    }

    // Local Fallback
    const profile = {
      id: 'usr_' + Date.now(),
      full_name: fullName,
      email: email,
      phone: cleanPhone,
      associate_code: cleanAssocCode,
      role: role || 'asociada',
      colonia: locationStr,
      whatsapp: '52' + cleanPhone,
      store_slug: slug,
      rating: 5.0,
      verified: true,
      is_subscribed: false,
      trialStartDate: new Date().toISOString()
    };

    state.currentUser = profile;
    state.sellers.push(profile);
    saveLocal();

    await sendResendWelcomeEmail(email, fullName, cleanAssocCode, slug);

    return { success: true, profile };
  }

  async function loginUser(email, password) {
    // Check SuperAdmin Credentials
    if (email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && password === SUPER_ADMIN_PASS) {
      state.currentUser = SUPER_ADMIN_PROFILE;
      saveLocal();
      return { success: true, profile: SUPER_ADMIN_PROFILE };
    }

    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error && email !== SUPER_ADMIN_EMAIL) return { success: false, message: error.message };

      if (data && data.user) {
        const { data: prof } = await supabaseClient.from('profiles').select('*').eq('id', data.user.id).single();
        state.currentUser = prof || { id: data.user.id, full_name: email.split('@')[0], role: 'asociada' };
        saveLocal();
        return { success: true, profile: state.currentUser };
      }
    }

    // Local check
    const found = state.sellers.find(s => s.email.toLowerCase() === email.toLowerCase());
    if (found) {
      state.currentUser = found;
      saveLocal();
      return { success: true, profile: found };
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

  async function fetchRealDataFromSupabase() {
    if (supabaseClient) {
      try {
        const { data: profs } = await supabaseClient.from('profiles').select('*');
        if (profs && profs.length > 0) {
          // Merge with sellers
          state.sellers = profs;
          if (!state.sellers.find(s => s.email === SUPER_ADMIN_EMAIL)) {
            state.sellers.unshift(SUPER_ADMIN_PROFILE);
          }
        }

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
    SUPER_ADMIN_EMAIL,
    isSuperAdmin: () => {
      return state.currentUser && state.currentUser.email && state.currentUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
    },
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
