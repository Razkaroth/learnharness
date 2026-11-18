'use strict';
const english = require('../locales/en.json');

const fill = (text, vars) => vars
  ? text.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(vars, name) ? String(vars[name]) : match)
  : text;

let active = (key, vars) => fill(english[key] ?? key, vars);

/** Installs the host dictionary for this activation. The host re-activates
 * the plugin when the app language changes, so text is read at mount time. */
function useI18n(i18n) {
  active = (key, vars) => i18n.t(key, vars);
}

function t(key, vars) {
  return active(key, vars);
}

module.exports = { useI18n, t };
