import { CountryCode, RetailerSpec } from '../types';
import { ARGENTINA_SPECS, URUGUAY_SPECS, CHILE_SPECS_DEFAULT, MEXICO_SPECS_DEFAULT, CERAN_SPECS_DEFAULT } from '../data/retailerSpecs';

const SPECS_STORAGE_KEY = 'pdp_custom_specs_v1';

export interface CountrySpecsStore {
  AR: RetailerSpec[];
  UY: RetailerSpec[];
  CL: RetailerSpec[];
  MX: RetailerSpec[];
  CERAN: RetailerSpec[];
}

export function getDefaultSpecs(): CountrySpecsStore {
  return {
    AR: ARGENTINA_SPECS,
    UY: URUGUAY_SPECS,
    CL: CHILE_SPECS_DEFAULT,
    MX: MEXICO_SPECS_DEFAULT,
    CERAN: CERAN_SPECS_DEFAULT,
  };
}

export function loadAllSpecs(): CountrySpecsStore {
  try {
    const raw = localStorage.getItem(SPECS_STORAGE_KEY);
    if (!raw) return getDefaultSpecs();
    const parsed = JSON.parse(raw);
    return {
      AR: Array.isArray(parsed.AR) && parsed.AR.length > 0 ? parsed.AR : ARGENTINA_SPECS,
      UY: Array.isArray(parsed.UY) && parsed.UY.length > 0 ? parsed.UY : URUGUAY_SPECS,
      CL: Array.isArray(parsed.CL) && parsed.CL.length > 0 ? parsed.CL : CHILE_SPECS_DEFAULT,
      MX: Array.isArray(parsed.MX) && parsed.MX.length > 0 ? parsed.MX : MEXICO_SPECS_DEFAULT,
      CERAN: Array.isArray(parsed.CERAN) && parsed.CERAN.length > 0 ? parsed.CERAN : CERAN_SPECS_DEFAULT,
    };
  } catch (e) {
    console.error('Failed to load custom specs from localStorage', e);
    return getDefaultSpecs();
  }
}

export function saveAllSpecs(store: CountrySpecsStore): void {
  try {
    localStorage.setItem(SPECS_STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Failed to save custom specs to localStorage', e);
  }
}

export function resetSpecsToDefault(): CountrySpecsStore {
  const defaults = getDefaultSpecs();
  saveAllSpecs(defaults);
  return defaults;
}
