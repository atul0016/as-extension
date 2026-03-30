'use strict';

/**
 * Universal Payment Backend — as-extension
 * Supports ALL extensions dynamically.
 *
 * To add a new extension, simply add Netlify env vars:
 *   <EXT_KEY>_PRICE_INR=99
 *   <EXT_KEY>_PRICE_USD=1.99
 *   <EXT_KEY>_NAME=My New Extension
 *
 * Where EXT_KEY is the ext param uppercased with hyphens replaced by underscores.
 * Example: ext=my-tool → MY_TOOL_PRICE_INR, MY_TOOL_PRICE_USD, MY_TOOL_NAME
 *
 * No code changes needed to add new extensions!
 */

// Fallback defaults if env vars are not set
const DEFAULT_PRODUCTS = {
  'pixel-ruler': {
    usd: '1.00',
    inr: '99',
    name: 'Pixel Ruler Premium'
  },
  'smart-capture': {
    usd: '2.99',
    inr: '1',   // ← set to 249 via Netlify env var: SMART_CAPTURE_PRICE_INR=249
    name: 'Advanced Smart Capture Premium'
  }
};

function getCorsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: getCorsHeaders(),
    body: JSON.stringify(body)
  };
}

function optionsResponse() {
  return {
    statusCode: 200,
    headers: getCorsHeaders(),
    body: ''
  };
}

function parseBody(event) {
  if (!event || !event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    throw new Error('Invalid JSON body.');
  }
}

function isValidInstallId(installId) {
  if (!installId || typeof installId !== 'string') return false;
  if (installId.length < 12 || installId.length > 128) return false;
  return /^[a-zA-Z0-9_-]+$/.test(installId);
}

function getCountryCode(headers = {}) {
  const lower = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
  );
  return (
    lower['x-country'] ||
    lower['cf-ipcountry'] ||
    lower['cloudfront-viewer-country'] ||
    ''
  ).toString().toUpperCase();
}

/**
 * Dynamically resolves config for ANY extension.
 * Priority: Netlify env vars → DEFAULT_PRODUCTS fallback → generic defaults
 */
function getProductConfig(ext) {
  // Convert ext id to env prefix: "my-cool-tool" → "MY_COOL_TOOL"
  const envPrefix = (ext || 'unknown').toUpperCase().replace(/-/g, '_');

  // Look up Netlify env vars first (highest priority)
  const envPriceInr = process.env[`${envPrefix}_PRICE_INR`];
  const envPriceUsd = process.env[`${envPrefix}_PRICE_USD`];
  const envName     = process.env[`${envPrefix}_NAME`];

  // Fall back to hardcoded defaults if no env var set
  const defaults = DEFAULT_PRODUCTS[ext] || { usd: '0.99', inr: '79', name: `${ext} Premium` };

  return {
    amountInr:    envPriceInr || defaults.inr,
    amountUsd:    envPriceUsd || defaults.usd,
    businessName: envName     || defaults.name
  };
}

module.exports = {
  json,
  optionsResponse,
  parseBody,
  isValidInstallId,
  getCountryCode,
  getProductConfig
};
