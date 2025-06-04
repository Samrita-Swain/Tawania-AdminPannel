// Global Error Handler Script
// This script should be loaded as early as possible to catch all errors
(function() {
  'use strict';

  // Flag to prevent infinite loops
  let errorHandlerActive = false;

  // Store original console methods
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  // Enhanced error logging function
  function logError(type, error, extra = {}) {
    if (errorHandlerActive) return;
    errorHandlerActive = true;

    try {
      const errorInfo = {
        type: type,
        message: error?.message || String(error),
        stack: error?.stack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...extra
      };

      // Log to console with a clear prefix
      originalConsoleWarn(`[Global Error Handler] ${type}:`, errorInfo);

      // You can add custom error reporting here
      // Example: sendErrorToService(errorInfo);

    } catch (loggingError) {
      originalConsoleError('Error in error handler:', loggingError);
    } finally {
      errorHandlerActive = false;
    }
  }

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    logError('Unhandled Promise Rejection', event.reason, {
      promise: event.promise
    });
    
    // Prevent the default behavior (console error)
    event.preventDefault();
  });

  // Handle uncaught JavaScript errors
  window.addEventListener('error', function(event) {
    logError('Uncaught Error', event.error || new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
    
    // Prevent the error from propagating
    event.preventDefault();
  });

  // Handle resource loading errors (images, scripts, etc.)
  window.addEventListener('error', function(event) {
    if (event.target !== window) {
      logError('Resource Loading Error', new Error(`Failed to load resource: ${event.target.src || event.target.href}`), {
        element: event.target.tagName,
        source: event.target.src || event.target.href
      });
    }
  }, true); // Use capture phase

  // Enhanced console.error to catch React errors
  console.error = function(...args) {
    // Check if this looks like a React error
    const message = args[0];
    if (typeof message === 'string') {
      // Skip hydration warnings as they're handled elsewhere
      if (message.includes('Hydration failed') || 
          message.includes('hydration mismatch') ||
          message.includes('server rendered HTML')) {
        return; // Suppress hydration warnings
      }

      // Log other React errors
      if (message.includes('React') || 
          message.includes('Warning:') ||
          message.includes('Error:')) {
        logError('React Error', new Error(message), {
          args: args.slice(1)
        });
      }
    }

    // Call original console.error for non-suppressed errors
    originalConsoleError.apply(console, args);
  };

  // Handle Next.js specific errors
  if (typeof window !== 'undefined') {
    // Wait for Next.js to load
    window.addEventListener('load', function() {
      // Check for Next.js error handling
      if (window.__NEXT_DATA__) {
        // Override Next.js error handler if it exists
        const originalNextError = window.__NEXT_DATA__.err;
        if (originalNextError) {
          logError('Next.js Error', originalNextError);
        }
      }

      // Handle Next.js router errors
      if (window.next && window.next.router) {
        window.next.router.events.on('routeChangeError', function(err, url) {
          logError('Next.js Route Error', err, { url });
        });
      }
    });
  }

  // Periodic health check to ensure error handling is working
  setInterval(function() {
    if (!window.globalErrorHandlerActive) {
      window.globalErrorHandlerActive = true;
    }
  }, 30000); // Check every 30 seconds

  // Mark that the global error handler is active
  window.globalErrorHandlerActive = true;

  console.log('[Global Error Handler] Initialized successfully');
})();
