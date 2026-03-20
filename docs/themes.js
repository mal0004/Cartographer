/**
 * Cartographer — Map Themes
 *
 * 5 predefined visual themes switchable in one click.
 * Each theme defines colors, fonts, border styles, etc.
 */

const MAP_THEMES = {
  parchment: {
    id: 'parchment',
    name: 'Parchemin ancien',
    fonts: {
      title: "'Cinzel', serif",
      body: "'Source Serif 4', 'Georgia', serif",
      urls: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap',
    },
    vars: {
      '--bg': '#F5F0E8',
      '--bg-alt': '#EDE7DA',
      '--ink': '#2C1810',
      '--ink-light': '#5a4a3a',
      '--accent': '#8B2635',
      '--accent-light': '#a83a4a',
      '--border': '#C8BBAA',
      '--shadow': 'rgba(44, 24, 16, 0.15)',
      '--toolbar-bg': 'rgba(245, 240, 232, 0.95)',
      '--font-title': "'Cinzel', serif",
      '--font-body': "'Source Serif 4', 'Georgia', serif",
    },
  },
  blueprint: {
    id: 'blueprint',
    name: 'Blueprint militaire',
    fonts: {
      title: "'Space Mono', monospace",
      body: "'Space Mono', monospace",
      urls: 'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap',
    },
    vars: {
      '--bg': '#0D1B2A',
      '--bg-alt': '#1B2838',
      '--ink': '#4FC3F7',
      '--ink-light': '#2196a8',
      '--accent': '#4FC3F7',
      '--accent-light': '#81D4FA',
      '--border': '#1a3a5a',
      '--shadow': 'rgba(0, 0, 0, 0.5)',
      '--toolbar-bg': 'rgba(13, 27, 42, 0.95)',
      '--font-title': "'Space Mono', monospace",
      '--font-body': "'Space Mono', monospace",
    },
  },
  watercolor: {
    id: 'watercolor',
    name: 'Aquarelle',
    fonts: {
      title: "'Lora', serif",
      body: "'Lora', serif",
      urls: 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&display=swap',
    },
    vars: {
      '--bg': '#FAFAF5',
      '--bg-alt': '#F0EDE5',
      '--ink': '#4A4A4A',
      '--ink-light': '#8A8A7A',
      '--accent': '#7B8FB2',
      '--accent-light': '#9BB0D0',
      '--border': '#D5CFC0',
      '--shadow': 'rgba(100, 100, 80, 0.12)',
      '--toolbar-bg': 'rgba(250, 250, 245, 0.95)',
      '--font-title': "'Lora', serif",
      '--font-body': "'Lora', serif",
    },
  },
  modern: {
    id: 'modern',
    name: 'Atlas moderne',
    fonts: {
      title: "'DM Sans', sans-serif",
      body: "'DM Sans', sans-serif",
      urls: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap',
    },
    vars: {
      '--bg': '#F8F9FA',
      '--bg-alt': '#EEEEF0',
      '--ink': '#333333',
      '--ink-light': '#777777',
      '--accent': '#2563EB',
      '--accent-light': '#3B82F6',
      '--border': '#D1D5DB',
      '--shadow': 'rgba(0, 0, 0, 0.08)',
      '--toolbar-bg': 'rgba(248, 249, 250, 0.95)',
      '--font-title': "'DM Sans', sans-serif",
      '--font-body': "'DM Sans', sans-serif",
    },
  },
  nightgold: {
    id: 'nightgold',
    name: 'Nuit dorée',
    fonts: {
      title: "'Cinzel', serif",
      body: "'Source Serif 4', 'Georgia', serif",
      urls: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap',
    },
    vars: {
      '--bg': '#1A1A2E',
      '--bg-alt': '#22223a',
      '--ink': '#E8E0D0',
      '--ink-light': '#a8a090',
      '--accent': '#C9A84C',
      '--accent-light': '#ddc06a',
      '--border': '#3a3a5a',
      '--shadow': 'rgba(0, 0, 0, 0.4)',
      '--toolbar-bg': 'rgba(26, 26, 46, 0.95)',
      '--font-title': "'Cinzel', serif",
      '--font-body': "'Source Serif 4', 'Georgia', serif",
    },
  },
};

class ThemeManager {
  constructor() {
    this.currentThemeId = 'parchment';
    this._loadedFonts = new Set();
  }

  applyTheme(themeId) {
    const theme = MAP_THEMES[themeId];
    if (!theme) return;

    this.currentThemeId = themeId;

    // Remove old data-theme attribute (overridden by theme system)
    document.documentElement.removeAttribute('data-theme');

    // Apply CSS variables
    const root = document.documentElement;
    for (const [prop, val] of Object.entries(theme.vars)) {
      root.style.setProperty(prop, val);
    }

    // Load fonts if needed
    if (!this._loadedFonts.has(themeId)) {
      const existing = document.querySelector(`link[data-theme-font="${themeId}"]`);
      if (!existing) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = theme.fonts.urls;
        link.dataset.themeFont = themeId;
        document.head.appendChild(link);
      }
      this._loadedFonts.add(themeId);
    }
  }

  getCurrentTheme() {
    return MAP_THEMES[this.currentThemeId];
  }

  getAllThemes() {
    return Object.values(MAP_THEMES);
  }
}

window.ThemeManager = ThemeManager;
window.MAP_THEMES = MAP_THEMES;
