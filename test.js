const fs = require('fs');
const path = require('path');

const repoRoot = __dirname;
const metaPath = path.join(repoRoot, 'MxM-Formatter.meta.js');
const userPath = path.join(repoRoot, 'MxM-Formatter.user.js');

function extractUserscriptVersion(text) {
  const match = text.match(/@version\s+([^\s]+)/);
  return match ? match[1].trim() : null;
}

function extractScriptConstantVersion(text) {
  const match = text.match(/const\s+SCRIPT_VERSION\s*=\s*['"]([^'\"]+)['"]/);
  return match ? match[1].trim() : null;
}

const metaContent = fs.readFileSync(metaPath, 'utf8');
const userContent = fs.readFileSync(userPath, 'utf8');

const metaVersion = extractUserscriptVersion(metaContent);
if (!metaVersion) {
  throw new Error('Unable to read @version from MxM-Formatter.meta.js');
}

const userHeaderVersion = extractUserscriptVersion(userContent);
if (!userHeaderVersion) {
  throw new Error('Unable to read @version from MxM-Formatter.user.js');
}

if (metaVersion !== userHeaderVersion) {
  throw new Error(
    `Version mismatch: meta script is ${metaVersion} but user script header is ${userHeaderVersion}`
  );
}

const scriptConstantVersion = extractScriptConstantVersion(userContent);
if (scriptConstantVersion && scriptConstantVersion !== metaVersion) {
  throw new Error(
    `Version mismatch: meta script is ${metaVersion} but SCRIPT_VERSION constant is ${scriptConstantVersion}`
  );
}

const { formatLyrics } = require('./MxM-Formatter.user.js');
if (typeof formatLyrics !== 'function') {
  throw new Error('MxM-Formatter.user.js did not export a formatLyrics function');
}

const standaloneParenthetical = '(Yeah, yeah, yeah)';
const formattedStandalone = formatLyrics(standaloneParenthetical);
if (formattedStandalone !== standaloneParenthetical) {
  throw new Error('Standalone parenthetical line should remain unchanged after formatting');
}

const sampleBlock = 'Yeah\n(YEAH, YEAH)\nOh';
const formattedBlock = formatLyrics(sampleBlock).split('\n');
const preservedLine = formattedBlock[1];
if (preservedLine !== '(YEAH, YEAH)') {
  throw new Error('Standalone parenthetical lines inside multi-line blocks must retain original casing');
}

module.exports = {
  formatLyrics,
  version: metaVersion,
};
