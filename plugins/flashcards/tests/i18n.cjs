'use strict';
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const english = JSON.parse(readFileSync(join(__dirname, '../locales/en.json'), 'utf8'));

const lookup = (key, vars) => (english[key] ?? key).replace(/\{(\w+)\}/g, (match, name) => vars && Object.hasOwn(vars, name) ? String(vars[name]) : match);

/** The host's English lookup for unit fixtures; native tests use the real host. */
const englishI18n = {
  language: 'en',
  t: lookup,
};

const englishBackendI18n = {
  language: () => 'en',
  t: (key, vars) => lookup(key, vars),
};

module.exports = { englishI18n, englishBackendI18n, english };
