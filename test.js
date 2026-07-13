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

require('./mxm-formatter-extension/numbered-title-prefixes.js');
const { formatLyrics: formatExtensionLyrics } = require('./mxm-formatter-extension/content.js');
if (typeof formatExtensionLyrics !== 'function') {
  throw new Error('mxm-formatter-extension/content.js did not export a formatLyrics function');
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
if (formatLyrics(countingLine) !== 'One, two, three, four') {
  throw new Error('Rhythmic count sequences should be spelled out with comma-separated lowercase words');
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

const numberedTitleCases = new Map([
  ['BBC 1', 'BBC 1'],
  ['SABC 1', 'SABC 1'],
  ['ZBC Radio 3', 'ZBC Radio 3'],
  ['Golf 8', 'Golf 8'],
  ['Highway 6', 'Highway 6'],
  ['Route 4', 'Route 4'],
  ['Channel 5', 'Channel 5'],
  ['Far Cry 2', 'Far Cry 2'],
  ['Borderlands 4', 'Borderlands 4'],
  ['Resident Evil 3', 'Resident Evil 3'],
]);

for (const [input, expected] of numberedTitleCases) {
  const actual = formatExtensionLyrics(input);
  if (actual !== expected) {
    throw new Error(`Numbered title should keep its digit: ${input} formatted as ${actual}`);
  }
}

const ordinaryNumberLine = 'I got 2 reasons';
if (formatExtensionLyrics(ordinaryNumberLine) !== 'I got two reasons') {
  throw new Error('Ordinary lyric numerals should still be spelled out');
}

const lowercaseGolfLine = 'I played golf 8 times';
if (formatExtensionLyrics(lowercaseGolfLine) !== 'I played golf eight times') {
  throw new Error('Lowercase golf should not be treated as a numbered model title');
}

const embeddedAcronymLine = 'MyBBC 1';
if (formatExtensionLyrics(embeddedAcronymLine) !== 'MyBBC one') {
  throw new Error('Numbered title prefixes should require a real word boundary');
}

const inlineBackingVocalLine = "You can call on me you /can call on me\\ as long as I'm breathing";
const formattedInlineBackingVocalLine = "You can call on me you (can call on me) as long as I'm breathing";
if (formatExtensionLyrics(inlineBackingVocalLine) !== formattedInlineBackingVocalLine) {
  throw new Error('Inline backing-vocal shorthand must close at the backslash marker');
}

const sameLineLeftBackingVocalLine = "My, my, my\\ I'm once bitten, twice shy, baby";
const formattedSameLineLeftBackingVocalLine = "(My, my, my) I'm once bitten, twice shy, baby";
if (formatExtensionLyrics(sameLineLeftBackingVocalLine) !== formattedSameLineLeftBackingVocalLine) {
  throw new Error('Same-line backslash shorthand must wrap the lyric to its left');
}

const tightSameLineLeftBackingVocalLine = "My, my, my\\I'm once bitten, twice shy, baby";
if (formatExtensionLyrics(tightSameLineLeftBackingVocalLine) !== formattedSameLineLeftBackingVocalLine) {
  throw new Error('Same-line backslash shorthand must work without a space after the marker');
}

const lineBoundaryCases = new Map([
  ['well-known', 'Well-known'],
  ['well\nI know', 'Well\nI know'],
  ['christmas\ntime', 'Christmas\nTime'],
  ['new\nyear', 'New\nYear'],
  ['one\ntwo', 'One\nTwo'],
  ['very\nvery', 'Very\nVery'],
  ['i\nll go', 'I\nLl go'],
]);

for (const [input, expected] of lineBoundaryCases) {
  const actual = formatExtensionLyrics(input);
  if (actual !== expected) {
    throw new Error(`Formatter rule crossed a line break: ${JSON.stringify(input)} formatted as ${JSON.stringify(actual)}`);
  }
}

const illContractionCases = new Map([
  ['ill see see you', "I'll see see you"],
  ['ill be there', "I'll be there"],
  ['and ill see you', "And I'll see you"],
  ['i ll see you', "I'll see you"],
  ["i'll see you", "I'll see you"],
  ['he fell ill yesterday', 'He fell ill yesterday'],
  ['I feel ill', 'I feel ill'],
  ['ill-fated', 'Ill-fated'],
  ['illness', 'Illness'],
]);

for (const [input, expected] of illContractionCases) {
  const actual = formatExtensionLyrics(input);
  if (actual !== expected) {
    throw new Error(`Formatter misread ill contraction context: ${JSON.stringify(input)} formatted as ${JSON.stringify(actual)}`);
  }
}

module.exports = {
  formatLyrics,
  version: metaVersion,
};
