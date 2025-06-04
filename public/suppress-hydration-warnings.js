// Simple script to suppress hydration warnings in development
(function() {
  // Only suppress warnings in development
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    // Store the original console.error
    const originalError = console.error;
    
    // Override console.error to filter out hydration warnings
    console.error = function(...args) {
      // Check if this is a hydration warning
      const message = args[0];
      if (typeof message === 'string' && (
        message.includes('Hydration failed') ||
        message.includes('hydration mismatch') ||
        message.includes('server rendered HTML') ||
        message.includes('client properties')
      )) {
        // Suppress hydration warnings
        return;
      }
      
      // Call the original console.error for other errors
      originalError.apply(console, args);
    };
  }
})();
