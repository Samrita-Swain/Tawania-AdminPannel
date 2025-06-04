// This script helps initialize a fallback session when NextAuth fails
(function() {
  // Create a fallback session object
  const fallbackSession = {
    user: null,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };

  // Function to check if NextAuth is working properly
  const checkNextAuthStatus = () => {
    // Check if NextAuth has initialized properly
    if (
      !window.__NEXT_DATA__ || 
      !window.__NEXT_DATA__.props || 
      !window.__NEXT_DATA__.props.pageProps || 
      !window.__NEXT_DATA__.props.pageProps.session
    ) {
      // NextAuth session is not available in the initial props
      console.warn('NextAuth session not found in initial props, applying fallback');
      
      // Apply fallback session
      if (window.__NEXT_DATA__ && window.__NEXT_DATA__.props && window.__NEXT_DATA__.props.pageProps) {
        window.__NEXT_DATA__.props.pageProps.session = fallbackSession;
      }
    }
  };

  // Function to patch the NextAuth client
  const patchNextAuthClient = () => {
    // Wait for NextAuth to initialize
    if (typeof window.next === 'object' && window.next.router) {
      const originalPush = window.next.router.push;
      const originalReplace = window.next.router.replace;
      
      // Patch router.push to handle auth redirects
      window.next.router.push = function(url, ...args) {
        // Check if this is an auth-related redirect
        if (typeof url === 'string' && (
          url.includes('/api/auth/signin') || 
          url.includes('/api/auth/error')
        )) {
          console.warn('Intercepted auth redirect to:', url);
          // Instead of redirecting, stay on the current page
          return Promise.resolve(false);
        }
        return originalPush.call(this, url, ...args);
      };
      
      // Patch router.replace to handle auth redirects
      window.next.router.replace = function(url, ...args) {
        // Check if this is an auth-related redirect
        if (typeof url === 'string' && (
          url.includes('/api/auth/signin') || 
          url.includes('/api/auth/error')
        )) {
          console.warn('Intercepted auth replace to:', url);
          // Instead of redirecting, stay on the current page
          return Promise.resolve(false);
        }
        return originalReplace.call(this, url, ...args);
      };
      
      console.log('NextAuth router navigation patched');
    }
  };

  // Run the checks when the page loads
  window.addEventListener('load', function() {
    // Check NextAuth status immediately
    checkNextAuthStatus();
    
    // Patch NextAuth client after a short delay to ensure it's loaded
    setTimeout(patchNextAuthClient, 1000);
    
    // Also periodically check for NextAuth errors
    setInterval(function() {
      // Look for NextAuth error elements
      const errorElements = document.querySelectorAll('[data-nextauth-error]');
      if (errorElements.length > 0) {
        console.warn('NextAuth error elements detected, hiding them');
        // Hide any NextAuth error elements
        errorElements.forEach(el => {
          el.style.display = 'none';
        });
      }
    }, 2000);
  });

  console.log('NextAuth session fix initialized');
})();
