/**
 * Simple Premium Check System - Single API for all premium operations
 * Replaces: MemberSystem, PremiumFlowManager, PremiumSystem
 * 
 * Usage:
 * - Regular check: PremiumCheck.verify(email)
 * - First-time activation: PremiumCheck.verify(email, checkoutId)
 */
window.PremiumCheck = {
  isActive: false,
  cache: new Map(),
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  
  /**
   * ONE METHOD for all premium operations
   * @param {string} email - User email
   * @param {string|null} checkoutId - Polar checkout ID for first-time activation 
   * @returns {boolean} isPremium status
   */
  async verify(email, checkoutId = null) {
    if (!email) {
      console.warn('[PremiumCheck] No email provided');
      return false;
    }
    
    try {
      let isPremium = false;
      
      if (checkoutId) {
        // First-time activation flow
        console.log('[PremiumCheck] 🎉 First-time activation:', checkoutId);
        isPremium = await this.activateFirstTime(email, checkoutId);
      } else {
        // Regular check flow
        isPremium = await this.checkRegular(email);
      }
      
      // Update UI state
      this.isActive = isPremium;
      if (isPremium) {
        this.showUI();
      } else {
        this.hideUI();
      }
      
      return isPremium;
      
    } catch (error) {
      console.error('[PremiumCheck] Verification failed:', error);
      this.isActive = false;
      this.hideUI();
      return false;
    }
  },
  
  /**
   * Regular premium status check with caching
   */
  async checkRegular(email) {
    // Check cache first
    const cached = this.cache.get(email);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      console.log('[PremiumCheck] Using cached result:', cached.isPremium);
      return cached.isPremium;
    }
    
    let isPremium = false;
    
    if (this.isLocalhost()) {
      // Development mock
      isPremium = this.mockCheck(email);
      console.log(`[PremiumCheck] 🧪 Mock result for ${email}: ${isPremium}`);
    } else {
      // Production API
      try {
        console.log('[PremiumCheck] 🌐 Calling production API for', email);
        const response = await fetch(`/api/check-premium?email=${encodeURIComponent(email)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          isPremium = data.isPremium || false;
          console.log('[PremiumCheck] 🌐 API result received');
        } else {
          console.error(`[PremiumCheck] API error: ${response.status} ${response.statusText}`);
          isPremium = false;
        }
      } catch (error) {
        console.error('[PremiumCheck] API call failed:', error);
        isPremium = false;
      }
    }
    
    // Cache result
    this.cache.set(email, { isPremium, timestamp: Date.now() });
    return isPremium;
  },
  
  /**
   * First-time premium activation (post-purchase)
   */
  async activateFirstTime(email, checkoutId) {
    console.log('[PremiumCheck] 🚀 Activating premium for checkout:', checkoutId);
    
    if (this.isLocalhost()) {
      // Mock activation for localhost
      return await this.mockActivateFirstTime(email, checkoutId);
    }
    
    try {
      const response = await fetch('/api/activate-premium', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          checkout_id: checkoutId, 
          email: email 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Activation failed: ${response.status} - ${errorData.error || response.statusText}`);
      }
      
      const result = await response.json();
      const isPremium = result.success || false;
      
      console.log('[PremiumCheck] ✅ First-time activation result:', isPremium);
      
      // Cache successful activation
      if (isPremium) {
        this.cache.set(email, { isPremium: true, timestamp: Date.now() });
      }
      
      return isPremium;
      
    } catch (error) {
      console.error('[PremiumCheck] ❌ First-time activation failed:', error);
      return false;
    }
  },

  /**
   * Mock first-time activation for localhost
   */
  async mockActivateFirstTime(email, checkoutId) {
    console.log('[PremiumCheck] 🧪 Mock first-time activation');
    
    // Validate mock checkout_id format
    if (!checkoutId || typeof checkoutId !== 'string' || checkoutId.length < 5) {
      console.error('[PremiumCheck] ❌ Mock activation failed: Invalid checkout_id format');
      return false;
    }
    
    // Check if email is in mock premium list
    const isPremiumEmail = this.mockCheck(email);
    if (!isPremiumEmail) {
      console.error(`[PremiumCheck] ❌ Mock activation failed: ${email} not in mock premium list`);
      return false;
    }
    
    // Simulate processing delay with Promise
    await new Promise(resolve => {
      setTimeout(() => {
        console.log('[PremiumCheck] 🧪 Mock activation processing complete');
        resolve();
      }, 500);
    });
    
    // Cache the successful activation
    this.cache.set(email, { isPremium: true, timestamp: Date.now() });
    
    console.log(`[PremiumCheck] ✅ Mock first-time activation successful for ${email} with checkout ${checkoutId}`);
    return true;
  },
  
  /**
   * Show premium UI elements
   */
  showUI() {
    // Add premium classes to body
    if (document.body) {
      document.body.classList.add('premium-user');
      document.body.setAttribute('data-premium', 'true');
    }
    
    if (document.documentElement) {
      document.documentElement.classList.add('premium-user');
      document.documentElement.setAttribute('data-premium', 'true');
    }
    
    // Show premium badge
    const badge = document.getElementById('global-premium-badge');
    if (badge) {
      badge.style.display = 'block';
      badge.style.opacity = '1';
      badge.style.visibility = 'visible';
      badge.classList.remove('hidden');
      badge.setAttribute('data-premium-active', 'true');
    }
    
    // Set premium cookie
    document.cookie = 'lapa_premium=true; path=/; max-age=86400; SameSite=Lax';
    
    // Apply mock ad blocking for localhost
    if (this.isLocalhost() && window.MockAdsSystem) {
      window.MockAdsSystem.applyAdBlocking();
    }
    
    // Dispatch premium activation event
    window.dispatchEvent(new CustomEvent('premiumModeActivated', {
      detail: { 
        source: 'PremiumCheck', 
        timestamp: Date.now() 
      }
    }));
    
    console.log('[PremiumCheck] ✅ Premium UI activated');
  },
  
  /**
   * Hide premium UI elements
   */
  hideUI() {
    // Remove premium classes
    if (document.body) {
      document.body.classList.remove('premium-user');
      document.body.removeAttribute('data-premium');
    }
    
    if (document.documentElement) {
      document.documentElement.classList.remove('premium-user');
      document.documentElement.removeAttribute('data-premium');
    }
    
    // Hide premium badge
    const badge = document.getElementById('global-premium-badge');
    if (badge) {
      badge.style.display = 'none';
      badge.style.opacity = '0';
      badge.style.visibility = 'hidden';
      badge.classList.add('hidden');
      badge.removeAttribute('data-premium-active');
    }
    
    // Clear premium cookies
    document.cookie = 'lapa_premium=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    
    // Stop mock ad blocking for localhost
    if (this.isLocalhost() && window.MockAdsSystem) {
      window.MockAdsSystem.stop();
    }
    
    console.log('[PremiumCheck] ❌ Premium UI deactivated');
  },
  
  /**
   * Check if running on localhost with mock enabled
   */
  isLocalhost() {
    // Check hostname AND DevMode mock status
    const isLocalhostHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const isMockEnabled = window.DevMode?.isMockEnabled === true;
    
    return isLocalhostHost && isMockEnabled;
  },
  
  /**
   * Mock premium check for development
   */
  mockCheck(email) {
    const mockEmails = [
      'hello@saigon.love', 
      'saigon@saigon.love', 
      'phea@saigon.love',
      'go@saigon.love'
    ];
    return mockEmails.includes(email) || email.includes('premium');
  },
  
  /**
   * Get current status (for debugging)
   */
  getStatus() {
    return {
      isActive: this.isActive,
      cacheSize: this.cache.size,
      isLocalhost: this.isLocalhost()
    };
  },
  
  /**
   * Clear cache (for testing)
   */
  clearCache() {
    this.cache.clear();
    console.log('[PremiumCheck] Cache cleared');
  }
};

/**
 * Initialize PremiumCheck on page load
 */
document.addEventListener('DOMContentLoaded', () => {
  // Check and restore premium on page load if user is signed in
  if (document.cookie.includes('lapa_premium=true')) {
    const isUserSignedIn = window.Clerk?.user || window.AuthSystem?.isAuthenticated;
    if (isUserSignedIn) {
      window.PremiumCheck.showUI();
      window.PremiumCheck.isActive = true;
      console.log('[PremiumCheck] Premium restored from cookie');
    } else {
      // Clean up stale premium data
      window.PremiumCheck.hideUI();
      console.log('[PremiumCheck] Cleaned stale premium data');
    }
  }
});

// Make available for debugging only when mock is enabled
if (window.DevMode?.isMockEnabled === true) {
  window.debugPremium = () => {
    console.log('[PremiumCheck] Debug info:', window.PremiumCheck.getStatus());
    console.log('[PremiumCheck] Cache contents:', Array.from(window.PremiumCheck.cache.entries()));
  };
}

console.log('[PremiumCheck] Simple premium system loaded and ready');