/**
 * Logout Handler - Essential cleanup after Clerk logout
 * Minimal code focused only on premium state cleanup
 */

(function() {
  'use strict';

  function cleanupPremiumState() {
    console.log('[Logout] Cleaning up premium state');
    
    // Simple cleanup using unified PremiumCheck system
    if (window.PremiumCheck) {
      window.PremiumCheck.hideUI();
      window.PremiumCheck.isActive = false;
      window.PremiumCheck.cache.clear();
    }
    
    // Clear additional storage keys for thoroughness
    const storageKeys = {
      localStorage: ['lapa_premium_fallback', 'lapa_premium_data', 'lapa_premium_cache'],
      sessionStorage: ['lapa_premium_session', 'premium_worker_reload', 'last_premium_reload']
    };
    
    Object.entries(storageKeys).forEach(([storage, keys]) => {
      keys.forEach(key => {
        try {
          window[storage].removeItem(key);
        } catch (e) {
          // Storage access failed, continue
        }
      });
    });
    
    console.log('[Logout] Premium cleanup completed');
  }

  // Setup Clerk logout listeners
  function init() {
    // Primary logout detection
    window.addEventListener('clerk:user', (event) => {
      if (event.detail === null) cleanupPremiumState();
    });
    
    // Backup logout detection
    window.addEventListener('clerk:signedOut', cleanupPremiumState);
    
    console.log('[Logout] Listeners initialized');
  }

  // Initialize immediately or when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();