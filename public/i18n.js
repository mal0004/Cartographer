/**
 * Cartographer — Internationalization Engine
 *
 * Detects language from localStorage or navigator, resolves
 * translation keys, updates DOM via data-i18n attributes,
 * and dispatches 'langchange' events for live switching.
 */

import { fr } from './translations/fr.js';
import { en } from './translations/en.js';

const LANGS = { fr, en };
const SUPPORTED = Object.keys(LANGS);
let currentLang = 'fr';

// ─── Language detection ──────────────────────────────────

export function detectLang() {
  const stored = localStorage.getItem('lang');
  if (stored && SUPPORTED.includes(stored)) return stored;

  const nav = (navigator.languages?.[0] || navigator.language || 'fr').slice(0, 2);
  return SUPPORTED.includes(nav) ? nav : 'fr';
}

// ─── Translation resolver ────────────────────────────────

export function t(key) {
  const parts = key.split('.');
  let val = LANGS[currentLang];
  for (const p of parts) {
    if (val == null || typeof val !== 'object') {
      console.warn(`[i18n] Missing key: "${key}" (lang=${currentLang})`);
      return key;
    }
    val = val[p];
  }
  if (val === undefined) {
    console.warn(`[i18n] Missing key: "${key}" (lang=${currentLang})`);
    return key;
  }
  return val;
}

// ─── DOM update ──────────────────────────────────────────

function updateDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder));
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.setAttribute('title', t(el.dataset.i18nTitle));
  });
  document.querySelectorAll('[data-i18n-tooltip]').forEach(el => {
    el.setAttribute('data-tooltip', t(el.dataset.i18nTooltip));
  });

  // Update html lang attribute
  document.documentElement.lang = currentLang;

  // Update lang toggle buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.setAttribute('aria-pressed', btn.dataset.lang === currentLang);
  });
}

// ─── Meta tags update ────────────────────────────────────

function updateMeta() {
  document.title = t('meta.title');
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', t('meta.description'));
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', t('meta.ogTitle'));
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', t('meta.ogDescription'));
}

// ─── Language switching ──────────────────────────────────

export function setLang(lang) {
  if (!SUPPORTED.includes(lang)) return;
  currentLang = lang;
  localStorage.setItem('lang', lang);
  updateDOM();
  updateMeta();
  document.dispatchEvent(new CustomEvent('langchange', {
    detail: { lang },
  }));
}

export function getLang() {
  return currentLang;
}

// ─── Init ────────────────────────────────────────────────

export function initI18n() {
  currentLang = detectLang();
  updateDOM();
  updateMeta();

  // Wire lang toggle clicks (header + footer)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.lang-btn');
    if (btn && btn.dataset.lang) setLang(btn.dataset.lang);
  });
}
