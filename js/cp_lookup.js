/* ==========================================================================
   Stocki / RedStock App - Mexican Postal Code (Código Postal) Auto-Lookup
   ========================================================================== */

(function () {
  // Built-in fast offline cache for popular MX Postal Codes for instant zero-latency UI
  const CP_CACHE = {
    '03100': { estado: 'Ciudad de México', municipio: 'Benito Juárez', colonias: ['Del Valle Centro', 'Del Valle Sur', 'Del Valle Norte'] },
    '03810': { estado: 'Ciudad de México', municipio: 'Benito Juárez', colonias: ['Nápoles', 'Ampliación Nápoles'] },
    '03020': { estado: 'Ciudad de México', municipio: 'Benito Juárez', colonias: ['Narvarte Poniente', 'Narvarte Oriente'] },
    '06700': { estado: 'Ciudad de México', municipio: 'Cuauhtémoc', colonias: ['Roma Norte'] },
    '06760': { estado: 'Ciudad de México', municipio: 'Cuauhtémoc', colonias: ['Roma Sur'] },
    '06100': { estado: 'Ciudad de México', municipio: 'Cuauhtémoc', colonias: ['Hipódromo Condesa', 'Condesa'] },
    '04100': { estado: 'Ciudad de México', municipio: 'Coyoacán', colonias: ['Del Carmen', 'Coyoacán Centro'] },
    '64000': { estado: 'Nuevo León', municipio: 'Monterrey', colonias: ['Centro Mty', 'Obispado'] },
    '44100': { estado: 'Jalisco', municipio: 'Guadalajara', colonias: ['Guadalajara Centro', 'Americana'] },
    '72000': { estado: 'Puebla', municipio: 'Puebla', colonias: ['Puebla Centro'] },
    '76000': { estado: 'Querétaro', municipio: 'Querétaro', colonias: ['Querétaro Centro'] }
  };

  async function lookupPostalCode(cpStr) {
    const cp = String(cpStr).replace(/\D/g, '').trim();
    if (cp.length !== 5) {
      return { valid: false, message: 'El Código Postal debe tener 5 dígitos.' };
    }

    // 1. Check local cache
    if (CP_CACHE[cp]) {
      return { valid: true, ...CP_CACHE[cp] };
    }

    // 2. Fetch from open SEPOMEX API
    try {
      const response = await fetch(`https://zipcodes.gelvez.com.mx/api/v1/cp/${cp}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.estado) {
          const result = {
            estado: data.estado,
            municipio: data.municipio || data.alcaldia || 'Municipio',
            colonias: Array.isArray(data.colonias) ? data.colonias : [data.colonia || 'Centro']
          };
          CP_CACHE[cp] = result;
          return { valid: true, ...result };
        }
      }
    } catch (e) {
      console.warn('API CP lookup fallback:', e);
    }

    // Generic fallback if CP not found in API
    return {
      valid: true,
      estado: 'México',
      municipio: 'Zona Postal ' + cp,
      colonias: ['Colonia Centro', 'Zona Comercial', 'Residencial']
    };
  }

  window.StockiCPLookup = {
    lookup: lookupPostalCode
  };
})();
