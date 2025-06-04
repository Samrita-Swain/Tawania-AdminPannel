// This script forces light mode in the browser
(function() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLightMode);
  } else {
    initLightMode();
  }

  function initLightMode() {
    try {
      // Force light mode - only if not already set by server
      if (document.documentElement) {
        // Check if styles are already applied from server
        if (!document.documentElement.style.colorScheme) {
          document.documentElement.style.colorScheme = 'light';
        }
        if (!document.documentElement.style.backgroundColor) {
          document.documentElement.style.backgroundColor = '#ffffff';
        }

        // Only modify classes if needed
        if (document.documentElement.classList.contains('dark')) {
          document.documentElement.classList.remove('dark');
        }
        if (!document.documentElement.classList.contains('light')) {
          document.documentElement.classList.add('light');
        }
      }

      if (document.body) {
        // Only set styles if not already set
        if (!document.body.style.backgroundColor) {
          document.body.style.backgroundColor = '#ffffff';
        }
        if (!document.body.style.color) {
          document.body.style.color = '#4f4f4f';
        }
      }

      // Override any dark mode preferences
      if (document.head) {
        const style = document.createElement('style');
        style.textContent = `
          :root {
            color-scheme: light !important;
          }
          html, body {
            background-color: #ffffff !important;
            color: #4f4f4f !important;
          }
          * {
            color-scheme: light !important;
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --background: #ffffff !important;
              --foreground: #171717 !important;
            }
          }
        `;
        document.head.appendChild(style);
      }
    } catch (e) {
      console.log('Light mode initialization error:', e);
    }
  }
})();
