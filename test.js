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

const countingLine = '1 2 3 4';
if (formatLyrics(countingLine) !== 'One Two Three Four') {
  throw new Error('Rhythmic count sequences should be spelled out with capitalised words');
}

const countingCommaLine = '1,2,3,4';
if (formatLyrics(countingCommaLine) !== 'One, two, three, four') {
  throw new Error('Comma-separated counts should insert spaces and spell out numerals');
}

const oClockDigits = "It's 3 o clock";
if (formatLyrics(oClockDigits) !== "It's three o'clock") {
  throw new Error("Numeric o clock phrases should gain an apostrophe and word-based hour");
}

const oClockWords = "Twenty one o'clock";
if (formatLyrics(oClockWords) !== "Twenty one o'clock") {
  throw new Error("O'clock phrases already using words must be preserved");
}

const twentyOneLine = 'Twenty one reasons';
if (formatLyrics(twentyOneLine) !== '21 reasons') {
  throw new Error('Aggressive number mode should collapse written 21 into numerals outside protected contexts');
}

const timeContextLine = 'Meet me at 7:30 pm';
if (formatLyrics(timeContextLine) !== 'Meet me at 7:30 p.m.') {
  throw new Error('Time expressions must retain their numeric formatting and normalised meridiem');
}

const ohStructureBlock = 'Oh\n\n#CHORUS';
const formattedOhStructure = formatLyrics(ohStructureBlock);
if (!/\n#CHORUS/.test(formattedOhStructure)) {
  throw new Error('Structure tag should follow immediately after the stanza ending in "Oh"');
}
if (/\n\s*\n#CHORUS/.test(formattedOhStructure)) {
  throw new Error('Stanzas ending in "Oh" should not keep a blank line before the next structure tag');
}

const uhStructureBlock = 'uh...\n\n#VERSE';
const formattedUhStructure = formatLyrics(uhStructureBlock);
if (!/\n#VERSE/.test(formattedUhStructure)) {
  throw new Error('Structure tag should follow immediately after the stanza ending in "uh"');
}
if (/\n\s*\n#VERSE/.test(formattedUhStructure)) {
  throw new Error('Stanzas ending in "uh" (with punctuation) should not keep a blank line before the next structure tag');
}

module.exports = {
  formatLyrics,
  version: metaVersion,
};
