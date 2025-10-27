/**
 * Unified Authentication System
 * Merges: auth-redirect.js + HeaderAuthManager from auth-v1.js
 * Eliminates duplicate Clerk event listeners and consolidates auth logic
 */
window.AuthSystem = {
  user: null,
  isAuthenticated: false,
  protectedPages: ['/account', '/premium', '/dashboard'],
  isInitialized: false,
  clerkLoadTimeout: 1000,
  checkInterval: 50,
  earlyRedirectEnabled: true,
  authSkeleton: null,
  mobileAuthSkeleton: null,
  
  /**
   * Single initialization point
   */
  async init() {
    if (this.isInitialized) return;
    
    console.log('[AuthSystem] Initializing...');
    
    // Initialize skeleton elements
    this.authSkeleton = document.getElementById('auth-skeleton');
    this.mobileAuthSkeleton = document.getElementById('mobile-auth-skeleton');
    
    console.log('[AuthSystem] Skeleton elements:', {
      authSkeleton: !!this.authSkeleton,
      mobileAuthSkeleton: !!this.mobileAuthSkeleton
    });
    
    // Check protected page first (early redirect)
    this.checkProtectedPage();
    
    // Wait for Clerk to be available (with timeout)
    await this.waitForClerkAvailability();
    
    // Setup Clerk integration
    await this.setupClerkIntegration();
    
    // Single Clerk event listener (no duplicates)
    this.setupEventListeners();
    
    this.isInitialized = true;
    console.log('[AuthSystem] Initialization completed');
  },
  
  /**
   * Wait for Clerk script to load
   */
  async waitForClerkAvailability() {
    const maxWait = 5000; // 5 seconds
    const checkInterval = 100; // 100ms
    const startTime = Date.now();
    
    while (!window.Clerk && (Date.now() - startTime) < maxWait) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    if (!window.Clerk) {
      console.warn('[AuthSystem] Clerk not available after 5s timeout');
    } else {
      console.log('[AuthSystem] Clerk is now available');
    }
  },
  
  /**
   * Early redirect check (from auth-redirect.js)
   */
  checkProtectedPage() {
    const currentPath = window.location.pathname;
    const isProtected = this.protectedPages.some(page => currentPath.startsWith(page));
    
    if (isProtected) {
      this.checkAuthForProtectedPage();
    }
  },
  
  /**
   * Check authentication status for protected pages
   */
  async checkAuthForProtectedPage() {
    try {
      // Early redirect: Check cookies first for instant redirect
      if (this.earlyRedirectEnabled && this.shouldEarlyRedirect()) {
        this.redirectToSignIn();
        return;
      }

      // Wait for Clerk to load with timeout
      const clerkLoaded = await this.waitForClerk();
      
      if (!clerkLoaded) {
        // Clerk failed to load, check fallback auth state
        if (!this.hasSessionCookies()) {
          this.redirectToSignIn();
        }
        return;
      }

      // Check if user is authenticated
      if (!window.Clerk?.user) {
        this.redirectToSignIn();
      }
    } catch (error) {
      // Error checking auth for protected page - allow fallback handling
    }
  },
  
  /**
   * Clerk setup (from HeaderAuthManager)
   */
  async setupClerkIntegration() {
    console.log('[AuthSystem] Setting up Clerk integration...');
    
    if (!window.Clerk) {
      console.warn('[AuthSystem] Clerk not available, showing fallback');
      this.hideSkeletons();
      this.showFallbackSignIn();
      return;
    }
    
    try {
      console.log('[AuthSystem] Loading Clerk...');
      await window.Clerk.load();
      console.log('[AuthSystem] Clerk loaded successfully');
      this.setupUserInterface();
      this.hideSkeletons();
    } catch (error) {
      console.error('[AuthSystem] Clerk load failed:', error);
      this.hideSkeletons();
      this.showFallbackSignIn();
    }
  },
  
  /**
   * Single event listener to prevent conflicts
   */
  setupEventListeners() {
    // Single Clerk user event listener
    document.addEventListener('clerk:user', (event) => {
      this.user = event.detail;
      this.isAuthenticated = !!this.user;
      
      // Update UI
      this.updateAuthDisplay();
      
      // Check premium status using unified system
      if (window.PremiumCheck && this.isAuthenticated && this.user) {
        const email = this.user.primaryEmailAddress?.emailAddress;
        if (email) {
          window.PremiumCheck.verify(email);
        }
      }
    });

    // Listen for navigation events
    window.addEventListener('popstate', () => {
      setTimeout(() => {
        this.checkProtectedPage();
      }, 100);
    });

    // Listen for Clerk loaded event
    document.addEventListener('clerk:loaded', () => {
      console.log('[AuthSystem] Clerk loaded');
    });
  },
  
  /**
   * Setup user interface elements
   */
  setupUserInterface() {
    console.log('[AuthSystem] Setting up user interface...');
    
    const signInElements = document.querySelectorAll('[data-clerk-sign-in-button]');
    const userButtonElements = document.querySelectorAll('[data-clerk-user-button]');
    const signedOutElements = document.querySelectorAll('[data-clerk-signed-out]');
    const signedInElements = document.querySelectorAll('[data-clerk-signed-in]');

    console.log('[AuthSystem] Found elements:', {
      signInButtons: signInElements.length,
      userButtons: userButtonElements.length,
      signedOutElements: signedOutElements.length,
      signedInElements: signedInElements.length,
      clerkUser: !!window.Clerk.user
    });

    // Setup sign in buttons
    signInElements.forEach(element => {
      element.addEventListener('click', () => {
        window.Clerk.openSignIn();
      });
      element.style.cursor = 'pointer';
    });

    // Setup user menu
    this.setupUserMenu(userButtonElements);

    // Update auth display
    const isSignedIn = !!window.Clerk.user;
    console.log('[AuthSystem] Updating auth display, isSignedIn:', isSignedIn);
    this.updateAuthDisplay(isSignedIn);
    
    console.log('[AuthSystem] User interface setup completed');
  },
  
  /**
   * Setup custom user menu
   */
  setupUserMenu(userButtonElements) {
    userButtonElements.forEach(element => {
      if (window.Clerk.user) {
        element.innerHTML = `
          <div class="relative">
            <button id="user-menu-button" class="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors">
              <img src="${window.Clerk.user.imageUrl || '/default-avatar.png'}" alt="User" class="w-8 h-8 rounded-full" />
            </button>
            <div id="user-menu-dropdown" class="hidden absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <a href="/account" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100">
                <span class="flex items-center">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                  My Account
                </span>
              </a>
              <a href="https://polar.sh/lapaninja/portal" target="_blank" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100">
                <span class="flex items-center">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                  </svg>
                  Manage Subscription
                </span>
              </a>
              <button onclick="window.Clerk.signOut()" class="block w-full cursor-pointer text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                <span class="flex items-center">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                  </svg>
                  Sign out
                </span>
              </a>
            </div>
          </div>
        `;
    
        // Add event listeners
        const button = element.querySelector('#user-menu-button');
        const dropdown = element.querySelector('#user-menu-dropdown');
        
        if (button && dropdown) {
          button.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
          });
    
          // Close dropdown when clicking outside
          document.addEventListener('click', (e) => {
            if (!element.contains(e.target)) {
              dropdown.classList.add('hidden');
            }
          });
        }
      }
    });
  },
  
  /**
   * UI Management
   */
  updateAuthDisplay(isSignedIn = this.isAuthenticated) {
    console.log('[AuthSystem] updateAuthDisplay called, isSignedIn:', isSignedIn);
    
    // Hide skeleton first
    this.hideSkeletons();

    const signedInElements = document.querySelectorAll('[data-clerk-signed-in]');
    const signedOutElements = document.querySelectorAll('[data-clerk-signed-out]');
    
    console.log('[AuthSystem] Auth elements found:', {
      signedInElements: signedInElements.length,
      signedOutElements: signedOutElements.length
    });

    if (isSignedIn) {
      console.log('[AuthSystem] User signed in - showing signed in elements');
      this.showElements(signedInElements);
      this.hideElements(signedOutElements);
      
      // Check premium status on every auth display update
      const currentUser = this.user || window.Clerk?.user;
      if (window.PremiumCheck && currentUser) {
        const email = currentUser.primaryEmailAddress?.emailAddress;
        if (email) {
          window.PremiumCheck.verify(email);
        }
      }
    } else {
      console.log('[AuthSystem] User not signed in - showing signed out elements');
      this.showElements(signedOutElements);
      this.hideElements(signedInElements);
      
      // Hide premium UI when not signed in
      if (window.PremiumCheck) {
        window.PremiumCheck.hideUI();
      }
    }
  },
  
  /**
   * Show elements helper
   */
  showElements(elements) {
    console.log(`[AuthSystem] Showing ${elements.length} elements`);
    elements.forEach((element, index) => {
      console.log(`[AuthSystem] Showing element ${index}:`, element);
      element.classList.remove('hidden');
    });
  },
  
  /**
   * Hide elements helper
   */
  hideElements(elements) {
    elements.forEach(element => {
      element.classList.add('hidden');
    });
  },
  
  /**
   * Hide auth skeletons
   */
  hideSkeletons() {
    console.log('[AuthSystem] Hiding skeletons...');
    [this.authSkeleton, this.mobileAuthSkeleton].forEach((skeleton, index) => {
      const name = index === 0 ? 'authSkeleton' : 'mobileAuthSkeleton';
      if (skeleton) {
        console.log(`[AuthSystem] Hiding ${name}:`, skeleton);
        skeleton.style.display = 'none';
      } else {
        console.warn(`[AuthSystem] ${name} not found`);
      }
    });
    console.log('[AuthSystem] Skeletons hidden');
  },
  
  /**
   * Show fallback sign in
   */
  showFallbackSignIn() {
    const signedOutElements = document.querySelectorAll('[data-clerk-signed-out]');
    this.showElements(signedOutElements);
  },
  
  /**
   * Wait for Clerk to load with timeout
   */
  waitForClerk() {
    return new Promise(resolve => {
      const startTime = Date.now();
      
      const checkClerk = () => {
        if (window.Clerk && window.Clerk.user !== undefined) {
          resolve(true);
          return;
        }
        
        if (Date.now() - startTime > this.clerkLoadTimeout) {
          resolve(false);
          return;
        }
        
        setTimeout(checkClerk, this.checkInterval);
      };
      
      checkClerk();
    });
  },
  
  /**
   * Redirect to sign-in page
   */
  redirectToSignIn() {
    const returnUrl = encodeURIComponent(window.location.href);
    const signInUrl = `/sign-in?return_url=${returnUrl}`;
    
    // Add analytics tracking if available
    if (typeof gtag !== 'undefined') {
      gtag('event', 'auth_redirect', {
        'method': 'protected_page_redirect',
        'page_type': 'middleware_redirect',
        'source_page': window.location.pathname
      });
    }
    
    window.location.href = signInUrl;
  },
  
  /**
   * Check if should do early redirect
   */
  shouldEarlyRedirect() {
    const hasClerkSession = this.hasSessionCookies();
    const hasRecentSignIn = this.hasRecentSignIn();
    
    return !hasClerkSession && !hasRecentSignIn;
  },
  
  /**
   * Check for session cookies
   */
  hasSessionCookies() {
    return document.cookie.includes('__clerk_') || document.cookie.includes('__session');
  },
  
  /**
   * Check for recent sign in
   */
  hasRecentSignIn() {
    try {
      const lastSignIn = localStorage.getItem('lapa_last_signin');
      if (!lastSignIn) return false;
      
      const signInTime = parseInt(lastSignIn);
      const now = Date.now();
      const dayInMs = 24 * 60 * 60 * 1000;
      
      return (now - signInTime) < dayInMs;
    } catch (error) {
      return false;
    }
  },
  
  /**
   * Get user email
   */
  getUserEmail() {
    return this.user?.primaryEmailAddress?.emailAddress || null;
  },
  
  /**
   * Add protected route dynamically
   */
  addProtectedRoute(route) {
    if (!this.protectedPages.includes(route)) {
      this.protectedPages.push(route);
    }
  },
  
  /**
   * Check if route is protected
   */
  isProtectedRoute(path) {
    return this.protectedPages.some(page => path.startsWith(page));
  }
};

/**
 * Auth utility functions
 */
window.AuthUtils = {
  /**
   * Get current return URL
   */
  getCurrentReturnUrl() {
    return encodeURIComponent(window.location.href);
  },

  /**
   * Validate return URL for security
   */
  isValidReturnUrl(url) {
    try {
      const decodedUrl = decodeURIComponent(url);
      
      if (decodedUrl.startsWith('/')) {
        return true;
      }
      
      const parsed = new URL(decodedUrl);
      return parsed.origin === window.location.origin;
    } catch {
      return false;
    }
  },

  /**
   * Build sign-in URL with return URL
   */
  buildSignInUrl(returnUrl = null) {
    const baseUrl = '/sign-in';
    const safeReturnUrl = returnUrl || this.getCurrentReturnUrl();
    
    if (this.isValidReturnUrl(safeReturnUrl)) {
      return `${baseUrl}?return_url=${safeReturnUrl}`;
    }
    
    return baseUrl;
  }
};

/**
 * Premium check helper functions (consolidated from auth-v1.js)
 */
// getSimplePremiumCache removed - using PremiumCheck system

// setSimplePremiumCache removed - using PremiumCheck system

// checkPremiumSimple removed - using PremiumCheck system

// Premium functions removed - using PremiumCheck system

/**
 * Initialize auth system
 */
(function() {
  let initialized = false;
  
  const init = () => {
    if (initialized) {
      console.log('[AuthSystem] Already initialized, skipping');
      return;
    }
    initialized = true;
    window.AuthSystem.init();
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded
    init();
  }

  // Store for global access
  window.authSystemInstance = window.AuthSystem;
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AuthSystem: window.AuthSystem, AuthUtils: window.AuthUtils };
}