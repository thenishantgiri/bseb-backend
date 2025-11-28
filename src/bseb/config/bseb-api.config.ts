/**
 * BSEB External API Configuration
 * Centralized configuration for all BSEB API endpoints, keys, and settings
 */

export const BsebApiConfig = {
  // ============================================
  // Form Data / Registration API
  // ============================================
  formData: {
    baseUrl: 'https://examapi.biharboardonline.org/export/app',
    hash: 'a591a6d40bf420404a011733cfb7b190d62c6',
    cacheTtl: 86400, // 24 hours
    cachePrefix: 'bseb:form',
  },

  // ============================================
  // Admit Card APIs
  // ============================================
  admitCard: {
    baseUrl: 'http://115.243.18.52:8081/api/BsebInter',
    endpoints: {
      theory: 'GetAdmitCardTheory',
      practical: 'GetAdmitCardPractical',
    },
    cacheTtl: 3600, // 1 hour
    cachePrefix: 'bseb:admitcard',
  },

  // ============================================
  // Results API (Future)
  // ============================================
  results: {
    baseUrl: '', // To be configured
    endpoints: {
      inter: '',
      matric: '',
    },
    cacheTtl: 3600,
    cachePrefix: 'bseb:results',
  },

  // ============================================
  // Marksheet API (Future)
  // ============================================
  marksheet: {
    baseUrl: '',
    cacheTtl: 86400,
    cachePrefix: 'bseb:marksheet',
  },

  // ============================================
  // Certificate API (Future)
  // ============================================
  certificate: {
    baseUrl: '',
    cacheTtl: 86400,
    cachePrefix: 'bseb:certificate',
  },

  // ============================================
  // Exam Schedule / Timetable API (Future)
  // ============================================
  examSchedule: {
    baseUrl: '',
    cacheTtl: 3600,
    cachePrefix: 'bseb:schedule',
  },

  // ============================================
  // Global Settings
  // ============================================
  global: {
    timeout: 30000, // 30 seconds
    userAgent: 'BSEBConnect/1.0',
    retryAttempts: 2,
    retryDelay: 1000, // 1 second
  },
};

export type BsebApiDomain = keyof Omit<typeof BsebApiConfig, 'global'>;
