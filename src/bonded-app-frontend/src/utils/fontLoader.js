/**
 * Font Loader Utility for Bonded PWA
 * Handles Google Fonts loading with fallbacks and CSP compliance
 */
class FontLoader {
  constructor() {
    this.fontsLoaded = false;
    this.loadPromise = null;
  }
  /**
   * Load Google Fonts with proper error handling
   * @returns {Promise<boolean>} Whether fonts loaded successfully
   */
  async loadFonts() {
    if (this.loadPromise) {
      return this.loadPromise;
    }
    this.loadPromise = this.doLoadFonts();
    return this.loadPromise;
  }
  async doLoadFonts() {
    try {
      // Check if fonts are already available
      if (this.fontsLoaded || document.fonts.check('16px "Rethink Sans"')) {
        this.fontsLoaded = true;
        return true;
      }
      // Create font face definitions
      const fonts = [
        {
          family: 'Rethink Sans',
          url: 'https://fonts.gstatic.com/s/rethinksans/v1/Qw3EZQdVHhq1XrqHDd2DqrONOWc.woff2',
          weight: '400',
          style: 'normal'
        },
        {
          family: 'Rethink Sans',
          url: 'https://fonts.gstatic.com/s/rethinksans/v1/Qw3FZQdVHhq1XrqHDe-2K6vOXkJhKYE.woff2',
          weight: '700',
          style: 'normal'
        },
        {
          family: 'Trocchi',
          url: 'https://fonts.gstatic.com/s/trocchi/v17/CNj0Ze1H5uE4krE2.woff2',
          weight: '400',
          style: 'normal'
        }
      ];
      // Load fonts using Font Loading API if available
      if ('fonts' in document) {
        const loadPromises = fonts.map(font => {
          const fontFace = new FontFace(font.family, `url(${font.url})`, {
            weight: font.weight,
            style: font.style,
            display: 'swap'
          });
          document.fonts.add(fontFace);
          return fontFace.load();
        });
        await Promise.allSettled(loadPromises);
        this.fontsLoaded = true;
        return true;
      }
      // Fallback: CSS-based loading
      return this.loadFontsWithCSS();
    } catch (error) {
      this.fontsLoaded = false;
      return false;
    }
  }
  /**
   * Fallback method using CSS import
   * @returns {Promise<boolean>}
   */
  async loadFontsWithCSS() {
    return new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Rethink+Sans:ital,wght@0,400..800;1,400..800&family=Trocchi&display=swap';
      link.onload = () => {
        this.fontsLoaded = true;
        resolve(true);
      };
      link.onerror = () => {
        resolve(false);
      };
      // Timeout after 5 seconds
      setTimeout(() => {
        if (!this.fontsLoaded) {
          resolve(false);
        }
      }, 5000);
      document.head.appendChild(link);
    });
  }
  /**
   * Check if fonts are available
   * @returns {boolean}
   */
  areFontsLoaded() {
    return this.fontsLoaded;
  }
  /**
   * Get CSS class for font families with fallbacks
   * @param {'body' | 'heading'} type - Font type
   * @returns {string} CSS font-family value
   */
  getFontFamily(type = 'body') {
    const fallbacks = {
      body: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
      heading: 'Georgia, "Times New Roman", Times, serif'
    };
    if (this.fontsLoaded) {
      return type === 'body' 
        ? `"Rethink Sans", ${fallbacks.body}`
        : `"Trocchi", ${fallbacks.heading}`;
    }
    return fallbacks[type];
  }
}
// Export singleton instance
export const fontLoader = new FontLoader();
// Auto-load fonts when module is imported
fontLoader.loadFonts().then(success => {
  if (success) {
    document.documentElement.classList.add('fonts-loaded');
  } else {
    document.documentElement.classList.add('fonts-failed');
  }
}).catch(error => {
  document.documentElement.classList.add('fonts-failed');
}); 