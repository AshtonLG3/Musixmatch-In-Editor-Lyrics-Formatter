(function (global) {
  const hasWindow = typeof window !== 'undefined' && typeof document !== 'undefined';
  const root = hasWindow ? window : global;
  const SCRIPT_VERSION = '1.1.43';
  const ALWAYS_AGGRESSIVE = true;
  const SETTINGS_KEY = 'mxmFmtSettings.v105';
  const defaults = { showPanel: true, aggressiveNumbers: true };

  const extensionDefaults = {
    lang: "EN",
    autoLowercase: false,
    fixBackingVocals: true,
    showFloatingButton: false
  };
  const extensionOptions = { ...extensionDefaults };

  function loadSettings() {
    if (!hasWindow) return { ...defaults };
    try {
      const stored = root.localStorage.getItem(SETTINGS_KEY);
      return { ...defaults, ...(stored ? JSON.parse(stored) : {}) };
    } catch {
      return { ...defaults };
    }
  }

  const settings = loadSettings();
  const focusTrackedDocs = new WeakSet();
  const shortcutTrackedDocs = new WeakSet();

  const INSTRUMENTAL_PHRASE_RE = /^(?:instrumental(?:\s+(?:break|bridge|outro|interlude|solo))?)$/i;

  // ---------- Dynamic Focus Tracker ----------
  let currentEditable = null;
  function findDeepEditable(rootDoc) {
    let el = rootDoc.activeElement;
    while (el) {
      if (el.shadowRoot && el.shadowRoot.activeElement) el = el.shadowRoot.activeElement;
      else if (el.tagName === "IFRAME" && el.contentDocument?.activeElement)
        el = el.contentDocument.activeElement;
      else break;
    }
    if (el?.isContentEditable || el?.tagName === "TEXTAREA" || el?.getAttribute?.("role") === "textbox")
      return el;
    return null;
  }

  // ---------- Number Rules ----------
  const NUM_WORDS_0_10 = ["zero","one","two","three","four","five","six","seven","eight","nine","ten"];
  const WORD_TO_NUM_11_19 = { eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19 };
  const WORD_TO_TENS = { twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90 };
  const WORD_TO_ONES = { one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9 };
  const OCLOCK_DIGIT_TO_WORD = {
    1:"one",2:"two",3:"three",4:"four",5:"five",6:"six",7:"seven",8:"eight",9:"nine",10:"ten",11:"eleven",12:"twelve"
  };
  const OCLOCK_WORD_SET = new Set(Object.values(OCLOCK_DIGIT_TO_WORD));

  function isTimeContext(line, _s, e) {
    const after = line.slice(e);
    return (/^\s*:\s*\d{2}/.test(after) || /^\s*(?:a|p)\.?m\.?/i.test(after) || /^\s*(?:am|pm)\b/i.test(after));
  }
  function isDateContext(line, s, e) {
    const ctx = line.slice(Math.max(0, s - 6), Math.min(line.length, e + 6));
    return (/(?:\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?)/.test(ctx) || /\b(19|20)\d{2}\b/.test(ctx));
  }
  function isDecadeNumeric(line, _s, e) {
    const after = line.slice(e);
    return /^['’]s\b/.test(after);
  }
  function isOClockFollowing(line, e) {
    const after = line.slice(e);
    return /^\s*(?:o\s+clock|oclock|o['’]clock)\b/i.test(after);
  }
  function isCountingSequence(line) {
    // Detects rhythmic count-offs like 1,2,3,4 or 1 2 3 4
    return /^\s*(?:\d{1,2}[,\s]+){1,}\d{1,2}\s*$/.test(line.trim());
  }

  function spellOutCountSequence(line) {
    // Convert each number (0–10) in a count sequence into its word form
    const numWords = ["zero","one","two","three","four","five","six","seven","eight","nine","ten"];
    return line
      .replace(/\b(0|[1-9]|10)\b/g, (_, d) => numWords[Number(d)])
      .replace(/([a-z])([a-z])/gi, (m, a, b) => a + b.toLowerCase()) // normalize casing
      .replace(/(^|\s)([a-z])/g, (m, s, l) => s + l.toUpperCase())   // capitalize first if needed
      .replace(/\s*,\s*/g, ", ")                                     // clean spacing after commas
      .replace(/\s+/g, " ");                                         // collapse spaces
  }
  function numerals0to10ToWords(line) {
    const re = /\b(0|1|2|3|4|5|6|7|8|9|10)\b/g;
    let out = "", last = 0, m;
    while ((m = re.exec(line)) !== null) {
      const s = m.index, e = s + m[0].length, num = parseInt(m[0], 10);
      if (
        isTimeContext(line, s, e) ||
        isDateContext(line, s, e) ||
        isDecadeNumeric(line, s, e)
      ) {
        out += line.slice(last, e);
      }
      else out += line.slice(last, s) + NUM_WORDS_0_10[num];
      last = e;
    }
    out += line.slice(last);
    return out;
  }
  function words11to99ToNumerals(line) {
    line = line.replace(/\b(eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)\b/gi,
      (w, raw, offset, str) => {
        const end = offset + w.length;
        if (isOClockFollowing(str, end)) return w;
        return String(WORD_TO_NUM_11_19[raw.toLowerCase()]);
      });
    line = line.replace(/\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[-\s]+(one|two|three|four|five|six|seven|eight|nine)|(one|two|three|four|five|six|seven|eight|nine))?\b/gi,
      (_, tensRaw, onesWithSep, onesBare, offset, str) => {
        const match = _;
        const end = offset + match.length;
        if (isOClockFollowing(str, end)) return match;
        let n = WORD_TO_TENS[tensRaw.toLowerCase()];
        const onesRaw = onesWithSep || onesBare;
        if (onesRaw) n += WORD_TO_ONES[onesRaw.toLowerCase()];
        return String(n);
      });
    return line;
  }
  function applyNumberRules(text) {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i];
      if (isCountingSequence(currentLine)) {
        lines[i] = spellOutCountSequence(currentLine);
        continue;
      }
      const numCount = (currentLine.match(/\b\d+\b/g) || []).length;
      const useNumerals =
        numCount >= 3 ||
        /\b(19|20)\d{2}\b|['’]\d0s|\d{1,2}:\d{2}\s*(?:a\.m\.|p\.m\.)/i.test(currentLine);
      if (useNumerals && settings.aggressiveNumbers) {
        lines[i] = currentLine;
      } else {
        let L = numerals0to10ToWords(currentLine);
        if (settings.aggressiveNumbers) L = words11to99ToNumerals(L);
        lines[i] = L;
      }
    }
    return lines.join('\n');
  }

  function normalizeOClock(text) {
    if (!text) return text;
    const re = /\b(?:(\d{1,2})|(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve))\s*(o['’]?\s*clock)\b/gi;
    return text.replace(re, (match, digit, word, tail) => {
      let baseWord;
      if (digit) {
        const num = parseInt(digit, 10);
        baseWord = OCLOCK_DIGIT_TO_WORD[num];
        if (!baseWord) return match;
      } else {
        const lower = word.toLowerCase();
        if (!OCLOCK_WORD_SET.has(lower)) return match;
        baseWord = lower;
      }
      let normalizedWord;
      if (word) {
        if (word === word.toUpperCase()) normalizedWord = baseWord.toUpperCase();
        else normalizedWord = baseWord;
      } else {
        normalizedWord = baseWord;
      }
      const tailLetters = tail.replace(/[^A-Za-z]/g, '');
      const isAllCaps = tailLetters && tailLetters === tailLetters.toUpperCase();
      if (isAllCaps) normalizedWord = normalizedWord.toUpperCase();
      const clockPart = isAllCaps ? " O'CLOCK" : " o'clock";
      return normalizedWord + clockPart;
    });
  }

  const WORD_TO_DIGIT_TIME = {
    zero: 0,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12
  };

  const MERIDIEM_PATTERN = '(?:a|p)\\s*\\.?\\s*m\\.?';
  const MERIDIEM_TRAIL = '(?=$|[^A-Za-z0-9_])';
  const DIGIT_TIME_RE = new RegExp(`\\b(\\d{1,2})(?:\\s*[:.]\\s*(\\d{1,2}))?\\s*(${MERIDIEM_PATTERN})${MERIDIEM_TRAIL}`, 'gi');
  const WORD_TIME_RE = new RegExp(`\\b(${Object.keys(WORD_TO_DIGIT_TIME).join('|')})\\b\\s*(${MERIDIEM_PATTERN})${MERIDIEM_TRAIL}`, 'gi');

  function normalizeAmPmTimes(text) {
    if (!text) return text;

    const normalizeMeridiem = token => {
      const match = token.match(/[ap]/i);
      const letter = match ? match[0].toLowerCase() : 'a';
      return letter === 'a' ? 'a.m.' : 'p.m.';
    };

    text = text.replace(DIGIT_TIME_RE, (match, hourRaw, minuteRaw, meridiemToken) => {
      const hour = parseInt(hourRaw, 10);
      if (!Number.isFinite(hour) || hour > 12) return match;
      if (minuteRaw && minuteRaw.length > 2) return match;
      const minute = minuteRaw ? minuteRaw.padStart(2, '0') : null;
      const meridiem = normalizeMeridiem(meridiemToken);
      return minute ? `${hour}:${minute} ${meridiem}` : `${hour} ${meridiem}`;
    });

    text = text.replace(WORD_TIME_RE, (match, hourWord, meridiemToken) => {
      const hour = WORD_TO_DIGIT_TIME[hourWord.toLowerCase()];
      if (hour === undefined) return match;
      const meridiem = normalizeMeridiem(meridiemToken);
      return `${hour} ${meridiem}`;
    });

    return text;
  }

  const NO_INTERJECTION_FOLLOWERS = new Set([
    "i","i'm","im","i'd","i'll","i've","imma",
    "you","you're","youre","u","ya","y'all","yall","ya'll",
    "he","she","we","they","it","it's","its",
    "there","there's","theres","this","that","these","those",
    "dont","don't","do","does","did","didn't","didnt",
    "cant","can't","cannot","wont","won't","wouldnt","wouldn't",
    "shouldnt","shouldn't","couldnt","couldn't","aint","ain't",
    "never","ever","please","thanks","thank","sorry",
    "sir","ma'am","maam","bro","dude","man","girl","boy","baby","babe","darling","honey",
    "stop","wait","listen","hold","hang","come","comeon","c'mon","let","lets","let's",
    "leave","gimme","gonna","gotta","no","nah"
  ]);

  const NO_TRAILING_SKIP_PREV = new Set([
    "say","says","said","tell","tells","told","ask","asks","asked",
    "reply","replies","replied","yell","yells","yelled","shout","shouts","shouted",
    "scream","screams","screamed","whisper","whispers","whispered"
  ]);

  const NO_QUOTE_CHARS = "\"'“”‘’";
  const NO_BETWEEN_WORDS_RE = /((?:['’]?)[A-Za-z0-9][^\s,.;!?()#"]*)([ \t]+)([Nn][Oo])([ \t]+)((?:['’]?)[A-Za-z0-9][^\s,.;!?()#"]*)/g;
  const NO_FILLER_REMOVE_RE =
    /(\b(?:yeah|yea|yah|ya|yup|yep|yuh)\b)(\s*,?\s+)([Nn][Oo])(\s+)((?:['’]?)[A-Za-z0-9][^\s,.;!?()#"]*)/gi;

  function normalizeNoBoundaryWord(word, removeLeading) {
    if (!word) return '';
    let out = word;
    if (removeLeading) out = out.replace(/^['’"]+/, '');
    else out = out.replace(/['’"]+$/, '');
    return out.toLowerCase();
  }

  function isNumericToken(token) {
    return token !== '' && /^\d+$/.test(token);
  }

  function shouldIsolateStandaloneNo(prevWord, nextWord) {
    if (!nextWord) return false;
    const prevLower = normalizeNoBoundaryWord(prevWord, true);
    const nextLower = normalizeNoBoundaryWord(nextWord, false);
    if (!nextLower) return false;
    if (nextLower === 'no') return false;
    if (prevLower === 'no') return false;
    if (isNumericToken(prevLower) || isNumericToken(nextLower)) return true;
    if (NO_INTERJECTION_FOLLOWERS.has(nextLower)) return true;
    return false;
  }

  function shouldCommaAfterNo(str, idx) {
    let i = idx;
    while (i < str.length && (str[i] === ' ' || str[i] === '\t')) i++;
    while (i < str.length && NO_QUOTE_CHARS.includes(str[i])) i++;
    if (i >= str.length) return false;
    if (str[i] === '\n') return false;
    if (str[i] === ',') return false;
    if (/[.!?;:)]/.test(str[i])) return false;
    const match = str.slice(i).match(/^([A-Za-z']+)/);
    if (!match) return false;
    const nextLower = match[1].toLowerCase();
    return NO_INTERJECTION_FOLLOWERS.has(nextLower);
  }

  function applyNoCommaRules(text) {
    if (!text) return text;

    // Exempt idioms like "Say no more" from added commas
    text = text.replace(/\b(Say|Told|Telling|Tell|Tells)\s+no\s+more\b/gi, m => m);

    text = text.replace(
      NO_FILLER_REMOVE_RE,
      (match, fillerWord, separator, _noWord, postSpaces, nextWord) => {
        if (separator.includes('\n') || postSpaces.includes('\n')) return match;
        const nextLower = nextWord.replace(/['’"]+$/, '').toLowerCase();
        if (nextLower === 'no') return match;
        if (NO_INTERJECTION_FOLLOWERS.has(nextLower)) return match;
        const normalizedSeparator = separator.includes(',') ? ', ' : ' ';
        return `${fillerWord}${normalizedSeparator}${nextWord}`;
      }
    );

    text = text.replace(
      NO_BETWEEN_WORDS_RE,
      (match, prevWord, preSpaces, noWord, postSpaces, nextWord) => {
        if (preSpaces.includes('\n') || postSpaces.includes('\n')) return match;

        const prevLower = prevWord.replace(/^['’"]+/, '').toLowerCase();
        const nextLower = nextWord.replace(/['’"]+$/, '').toLowerCase();
        if (nextLower === 'more' && /^(say|told|telling|tell|tells)$/.test(prevLower)) return match;

        if (!shouldIsolateStandaloneNo(prevWord, nextWord)) return match;

        return `${prevWord}, ${noWord}, ${nextWord}`;
      }
    );

    text = text.replace(
      /((?:['’]?)[A-Za-z0-9][^\s,.;!?()#"]*)(\s*,\s*)([Nn][Oo])([ \t]+)((?:['’]?)[A-Za-z0-9][^\s,.;!?()#"]*)/g,
      (match, prevWord, commaBlock, noWord, postSpaces, nextWord) => {
        if (postSpaces.includes('\n')) return match;

        const prevLower = prevWord.replace(/^['’"]+/, '').toLowerCase();
        const nextLower = nextWord.replace(/['’"]+$/, '').toLowerCase();
        if (nextLower === 'more' && /^(say|told|telling|tell|tells)$/.test(prevLower)) return match;

        if (!shouldIsolateStandaloneNo(prevWord, nextWord)) return match;

        return `${prevWord}, ${noWord}, ${nextWord}`;
      }
    );

    text = text.replace(
      /((?:['’]?)[A-Za-z0-9][^\s,.;!?()#"]*)([ \t]+)([Nn][Oo])(\s*,\s*)((?:['’]?)[A-Za-z0-9][^\s,.;!?()#"]*)/g,
      (match, prevWord, preSpaces, noWord, commaBlock, nextWord) => {
        if (preSpaces.includes('\n')) return match;

        const prevLower = prevWord.replace(/^['’"]+/, '').toLowerCase();
        const nextLower = nextWord.replace(/['’"]+$/, '').toLowerCase();
        if (nextLower === 'more' && /^(say|told|telling|tell|tells)$/.test(prevLower)) return match;

        if (!shouldIsolateStandaloneNo(prevWord, nextWord)) return match;

        return `${prevWord}, ${noWord}, ${nextWord}`;
      }
    );

    text = text.replace(
      /(\b[\w'"]+)(\s*,\s*|\s+)([Nn][Oo])(\s+)([A-Za-z']+)/g,
      (match, prevWord, separator, noWord, postSpace, nextWord, offset, str) => {
        if (separator.includes('\n') || postSpace.includes('\n')) return match;
        const noStart = offset + prevWord.length + separator.length;
        if (!shouldCommaAfterNo(str, noStart + noWord.length)) return match;

        const nextLower = nextWord.toLowerCase();
        const prevLower = prevWord.replace(/^["']/,'').toLowerCase();

        if (nextLower === 'more' && /^(say|told|telling|tell|tells)$/.test(prevLower)) {
          return match;
        }

        if (!shouldIsolateStandaloneNo(prevWord, nextWord)) return match;

        const hasCommaBefore = separator.includes(',');
        const before = hasCommaBefore
          ? `${prevWord}, ${noWord}`
          : (NO_TRAILING_SKIP_PREV.has(prevLower)
            ? `${prevWord} ${noWord}`
            : `${prevWord}, ${noWord}`);

        if (NO_INTERJECTION_FOLLOWERS.has(nextLower)) {
          return `${before}, ${nextWord}`;
        }

        return `${before} ${nextWord}`;
      }
    );

    text = text.replace(/\b([Nn][Oo])([ \t]+)(?=[Nn][Oo]\b)/g, (_, word) => word + ', ');

    text = text.replace(/(\.\.\.|…)([ \t]+)([Nn][Oo])\b(?!\s*,)/g,
      (match, dots, spaces, noWord, offset, str) => {
        const noStart = offset + dots.length + spaces.length;
        const afterIndex = noStart + noWord.length;
        if (shouldCommaAfterNo(str, afterIndex)) return `${dots}, ${noWord}`;

        let i = afterIndex;
        while (i < str.length && /\s/.test(str[i])) i++;
        while (i < str.length && NO_QUOTE_CHARS.includes(str[i])) i++;
        if (i >= str.length || str[i] === '\n') return `${dots}, ${noWord}`;
        if (/[.!?;:)]/.test(str[i])) return `${dots}, ${noWord}`;

        return match;
      });

    text = text.replace(/(^|\n)(\s*)([Nn][Oo])\b(?!\s*,)/g, (match, boundary, spaces, word, offset, str) => {
      const afterIndex = offset + match.length;
      if (shouldCommaAfterNo(str, afterIndex)) return boundary + spaces + word + ',';
      return match;
    });

    text = text.replace(/(\b[\w'"]+)([ \t]+)([Nn][Oo])(?=(?:\s*[.!?](?:\s|$)|\s*$))/g,
      (_match, prevWord, _spaces, noWord) => `${prevWord}, ${noWord}`);

    return text;
  }

  const SENTENCE_ENDER_FOLLOWING_QUOTES = new Set(["'", '"', '‘', '’', '“', '”']);

  function capitalizeAfterSentenceEnders(text) {
    if (!text) return text;
    const chars = Array.from(text);
    const isSpace = c => c === ' ' || c === '\t' || c === '\n';
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      if (ch !== '?' && ch !== '!') continue;
      let j = i + 1;
      while (j < chars.length && isSpace(chars[j])) j++;
      let k = j;
      while (k < chars.length && chars[k] === '(') {
        k++;
        while (k < chars.length && isSpace(chars[k])) k++;
      }
      while (k < chars.length && SENTENCE_ENDER_FOLLOWING_QUOTES.has(chars[k])) k++;
      if (k < chars.length && chars[k] >= 'a' && chars[k] <= 'z') {
        chars[k] = chars[k].toUpperCase();
      }
    }
    return chars.join('');
  }

  function ensureStandaloneICapitalized(text) {
    if (!text) return text;
    return text.replace(/\bi\b/g, 'I');
  }

  const HYPHEN_CHARS = new Set(['-', '\u2010', '\u2011', '\u2012', '\u2013', '\u2014', '\u2212']);
  const LETTER_RE = /[A-Za-z]/;
  const HYPHENATED_EM_TOKEN = '\uF000';

  function normalizeEmPronouns(text) {
    if (!text) return text;
    return text.replace(/\bem\b/gi, (match, offset, str) => {
      const prevIndex = offset - 1;
      if (prevIndex >= 0) {
        const prevChar = str[prevIndex];
        if (!/\s/.test(prevChar)) return match;

        let lookback = prevIndex;
        while (lookback >= 0 && /\s/.test(str[lookback])) lookback--;
        if (lookback >= 0 && HYPHEN_CHARS.has(str[lookback])) {
          const gap = str.slice(lookback + 1, offset);
          if (/\r|\n/.test(gap)) {
            let beforeHyphen = lookback - 1;
            while (beforeHyphen >= 0 && /\s/.test(str[beforeHyphen])) beforeHyphen--;
            if (beforeHyphen >= 0 && LETTER_RE.test(str[beforeHyphen])) return match;
          }
        }
      }
      return "'em";
    });
  }

  function normalizeStructureTags(text) {
    if (!text) return text;

    return text
      .replace(/(^|\n)\s*intro\s*(?=\n)/gi, (_, boundary) => boundary + "#INTRO")
      .replace(/(^|\n)\s*verse\s*(?=\n)/gi, (_, boundary) => boundary + "#VERSE")
      .replace(/(^|\n)\s*pre[- ]?chorus\s*(?=\n)/gi, (_, boundary) => boundary + "#PRE-CHORUS")
      .replace(/(^|\n)\s*chorus\s*(?=\n)/gi, (_, boundary) => boundary + "#CHORUS")
      .replace(/(^|\n)\s*post[- ]?chorus\s*(?=\n)/gi, (_, boundary) => boundary + "#HOOK")
      .replace(/(^|\n)\s*hook\s*(?=\n)/gi, (_, boundary) => boundary + "#HOOK")
      .replace(/(^|\n)\s*bridge\s*(?=\n)/gi, (_, boundary) => boundary + "#BRIDGE")
      .replace(/(^|\n)\s*(ad[- ]?libs?|spoken)\s*(?=\n)/gi, (_, boundary) => boundary + "#HOOK")
      .replace(/(^|\n)\s*outro\s*(?=\n)/gi, (_, boundary) => boundary + "#OUTRO");
  }

  function normalizeInstrumentalSections(text) {
    if (!text) return text;

    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const trimmed = raw.trim();
      if (!trimmed) continue;
      if (trimmed === '#INSTRUMENTAL') {
        lines[i] = '#INSTRUMENTAL';
        continue;
      }

      let normalized = trimmed.replace(/^[\[(]+/, '').replace(/[\])]+$/, '').trim();
      normalized = normalized.replace(/^[\-–—:]+\s*/, '').replace(/\s*[\-–—:]+$/, '');
      normalized = normalized.replace(/[.,!?;:]+$/g, '').trim();

      if (normalized && INSTRUMENTAL_PHRASE_RE.test(normalized)) {
        lines[i] = '#INSTRUMENTAL';
      }
    }

    while (true) {
      let firstIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() !== '') {
          firstIdx = i;
          break;
        }
      }
      if (firstIdx === -1) break;
      if (lines[firstIdx].trim() === '#INSTRUMENTAL') {
        lines.splice(0, firstIdx + 1);
        continue;
      }
      break;
    }

    while (true) {
      let lastIdx = -1;
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].trim() !== '') {
          lastIdx = i;
          break;
        }
      }
      if (lastIdx === -1) break;
      if (lines[lastIdx].trim() === '#INSTRUMENTAL') {
        lines.splice(lastIdx);
        continue;
      }
      break;
    }

    const result = [];
    for (const raw of lines) {
      const trimmed = raw.trim();
      if (trimmed === '#INSTRUMENTAL') {
        while (result.length && result[result.length - 1].trim() === '') result.pop();
        result.push('#INSTRUMENTAL');
      } else {
        result.push(raw);
      }
    }

    return result.join('\n');
  }

  function enforceStructureTagSpacing(text) {
    if (!text) return text;

    const lines = text.split('\n');
    const result = [];

    for (const raw of lines) {
      const trimmed = raw.trim();
      if (trimmed.startsWith('#') && trimmed !== '#INSTRUMENTAL') {
        while (result.length && result[result.length - 1].trim() === '') result.pop();
        if (result.length) result.push('');
        result.push(trimmed);
      } else {
        result.push(raw);
      }
    }

    return result.join('\n');
  }

  // ---------- Formatter ----------
  function formatLyrics(input, _options = {}) {
    if (!input) return "";
    let x = ("\n" + input.trim() + "\n");
    const preservedStandaloneParens = [];
    const STANDALONE_PAREN_SENTINEL = "__MXM_SP__";

    x = x.replace(/(^|\n)([^\S\n]*\([^\n]*\)[^\S\n]*)(?=\n)/g, (match, boundary, candidate) => {
      const trimmed = candidate.trim();
      if (trimmed.startsWith("(") && trimmed.endsWith(")") && !trimmed.includes("\n")) {
        const placeholder = `${STANDALONE_PAREN_SENTINEL}${preservedStandaloneParens.length}__`;
        preservedStandaloneParens.push(candidate);
        return boundary + placeholder;
      }
      return match;
    });

    const hyphenatedEmTokens = [];

    // Clean + normalize
    x = x
      .replace(/[\u2000-\u200b\u202f\u205f\u2060\u00a0]/gu, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/ {2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[\u2019\u2018\u0060\u00b4]/gu, "'")
      .replace(/[\u2013\u2014]/gu, "-")
      .replace(/[\u0435\u0415]/g, m => (m === "\u0415" ? "E" : "e"))
      .replace(/[\u{1F300}-\u{1FAFF}\u{FE0F}\u2600-\u26FF\u2700-\u27BF\u2669-\u266F]/gu, "");

    // Section tags
    x = x.replace(/\[(.*?)\]/g, (_, raw) => {
      const t = String(raw).toLowerCase().trim();
      if (/^intro/.test(t)) return "#INTRO";
      if (/^verse/.test(t)) return "#VERSE";
      if (/^pre[- ]?chorus/.test(t)) return "#PRE-CHORUS";
      if (/^chorus/.test(t)) return "#CHORUS";
      if (/^bridge/.test(t)) return "#BRIDGE";
      if (/^(hook|refrain|post-chorus|postchorus|drop|break|interlude)/.test(t)) return "#HOOK";
      if (/^outro/.test(t)) return "#OUTRO";
      if (/^instrumental(?:\s+(?:break|bridge|outro|interlude|solo))?/.test(t)) return "#INSTRUMENTAL";
      return "#" + String(raw).toUpperCase().replace(/\d+/g, "").replace(/ +/g, "-");
    });

    x = normalizeStructureTags(x);

    x = x.replace(/([A-Za-z])-(?:[ \t]*)(\r?\n)(\s*)(em\b)/gi, (match, letter, newline, spaces, word) => {
      const token = `${HYPHENATED_EM_TOKEN}${hyphenatedEmTokens.length}${HYPHENATED_EM_TOKEN}`;
      hyphenatedEmTokens.push(word);
      return `${letter}-${newline}${spaces}${token}`;
    });

    // Remove end-line punctuation
    x = x.replace(/[.,;:\-]+(?=[ \t]*\n)/g, "");

    x = normalizeInstrumentalSections(x);

    x = x
      .replace(/#INSTRUMENTAL\s*\n*/g, "#INSTRUMENTAL\n\n")
      .replace(/\n{3,}/g, "\n\n");

    // Contractions
    // --- Contraction normalization block ---
    {
      const contractionLines = x.split('\n');
      for (let i = 0; i < contractionLines.length; i++) {
        let line = contractionLines[i];
        line = line.replace(/\bgunna\b/gi, "gonna");
        line = line.replace(/\bgon\b(?!['\u2019])/gi, "gon'");
        line = line.replace(/'?c(?:uz|os|oz)\b/gi, (match, offset, str) => {
          const prevChar = offset > 0 ? str[offset - 1] : '';
          const nextIndex = offset + match.length;
          const nextChar = nextIndex < str.length ? str[nextIndex] : '';
          if (/\w/.test(prevChar) || /\w/.test(nextChar)) return match;

          const hasLeadingApostrophe = match[0] === "'" || match[0] === "\u2019";
          const core = hasLeadingApostrophe ? match.slice(1) : match;
          const firstChar = core[0] ?? '';
          const isAllUpper = core === core.toUpperCase();
          const isTitleCase = firstChar !== '' && firstChar === firstChar.toUpperCase();
          const isLineStart = offset === 0;

          if (isAllUpper) return "'CAUSE";
          if (isLineStart) return "'Cause";
          if (isTitleCase) return "'Cause";
          return "'cause";
        });
        line = line.replace(/\bcause\b/gi, (match, offset, str) => {
          const prev = offset > 0 ? str[offset - 1] : '';
          if (prev === "'" || prev === "\u2019") return match;
          if (match === match.toUpperCase()) return "'CAUSE";
          if (match[0] === match[0].toUpperCase()) return "'Cause";
          return "'cause";
        });
        line = line.replace(/\b'til\b/gi, "'til");
        line = line.replace(/\bimma\b/gi, "I'ma");
        line = line.replace(/\bim'ma\b/gi, "I'ma");
        line = line.replace(/\bem'(?!\w)/gi, (match, offset, str) => {
          const prev = offset > 0 ? str[offset - 1] : '';
          if (prev === "'" || prev === "\u2019") return match;
          return "'em";
        });
        contractionLines[i] = line;
      }
      x = contractionLines.join('\n');
    }
    // --- End contraction normalization block ---

    x = x
      .replace(/(?<!['\w])ti(?:ll|l)(?:')?(?!\w)/gi, (m, offset, str) => {
        const prev = offset > 0 ? str[offset - 1] : '';
        if (prev === "'" || prev === "\u2019") return m;
        const base = m.replace(/'/g, "");
        if (base === base.toUpperCase()) return "'TIL";
        if (base[0] === base[0].toUpperCase()) return "'Til";
        return "'til";
      })
      .replace(/\bima\b/gi, "I'ma")
      .replace(/\bim\b/gi, "I'm")
      .replace(/\bdont\b/gi, "don't")
      .replace(/\bcant\b/gi, "can't")
      .replace(/\bwont\b/gi, "won't")
      .replace(/\baint\b/gi, "ain't")
      .replace(/\bwoah\b/gi, "whoa");

    x = x.replace(/((?:^|\n)\s*)'til\b/g, (match, boundary, offset, str) => {
      const start = offset + boundary.length;
      const afterStart = start + 4;
      const lineEnd = str.indexOf('\n', afterStart);
      const rest = lineEnd === -1 ? str.slice(afterStart) : str.slice(afterStart, lineEnd);
      const hasLower = /[a-z]/.test(rest);
      const hasUpper = /[A-Z]/.test(rest);
      const replacement = hasUpper && !hasLower ? "'TIL" : "'Til";
      return boundary + replacement;
    });

    x = x.replace(/(-\s+)'til\b/g, (_, prefix) => prefix + "'Til");

    x = normalizeAmPmTimes(x);
    x = normalizeEmPronouns(x);

    if (hyphenatedEmTokens.length) {
      const tokenRe = new RegExp(`${HYPHENATED_EM_TOKEN}(\\d+)${HYPHENATED_EM_TOKEN}`, 'g');
      x = x.replace(tokenRe, (_, idx) => hyphenatedEmTokens[Number(idx)] ?? 'em');
    }

    // Interjections
    const CLOSING_QUOTES = new Set(["'", '"', "’", "”"]);
    const INTERJECTION_STOPPERS = ",!?.-;:)]}";
    const WELL_ALLOWED_PRECEDERS = new Set([
      "oh",
      "ah",
      "yeah",
      "yea",
      "yah",
      "uh",
      "um",
      "huh",
      "hmm",
      "mm",
      "aw",
      "aww",
      "awww",
      "gee",
      "gosh",
      "hey",
      "and",
      "but",
      "so",
      "yet",
      "or",
      "anyway",
      "anyways",
      "well"
    ]);
    const WELL_PRECEDER_WORDS = new Set([
      "a",
      "an",
      "the",
      "this",
      "that",
      "these",
      "those",
      "my",
      "your",
      "his",
      "her",
      "their",
      "our",
      "its",
      "some",
      "any",
      "such",
      "each",
      "every",
      "too",
      "very",
      "so",
      "as",
      "quite",
      "pretty",
      "rather",
      "really",
      "real",
      "feel",
      "feels",
      "felt",
      "feeling",
      "do",
      "does",
      "did",
      "doing",
      "done",
      "to",
      "am",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "being",
      "stay",
      "stays",
      "stayed",
      "staying",
      "keep",
      "keeps",
      "kept",
      "keeping",
      "remain",
      "remains",
      "remained",
      "remaining",
      "seem",
      "seems",
      "seemed",
      "seeming",
      "sound",
      "sounds",
      "sounded",
      "sounding",
      "look",
      "looks",
      "looked",
      "looking",
      "become",
      "becomes",
      "became",
      "becoming",
      "grow",
      "grows",
      "grew",
      "growing",
      "live",
      "lives",
      "lived",
      "living",
      "work",
      "works",
      "worked",
      "working",
      "play",
      "plays",
      "played",
      "playing"
    ]);
    const WELL_CLAUSE_STARTERS = new Set([
      "i",
      "im",
      "id",
      "ill",
      "ive",
      "you",
      "youre",
      "youd",
      "youll",
      "youve",
      "ya",
      "yall",
      "yous",
      "youse",
      "he",
      "hes",
      "hed",
      "hell",
      "she",
      "shes",
      "shed",
      "shell",
      "we",
      "were",
      "wed",
      "well",
      "weve",
      "they",
      "theyre",
      "theyd",
      "theyll",
      "theyve",
      "it",
      "its",
      "itd",
      "itll",
      "this",
      "that",
      "these",
      "those",
      "there",
      "theres",
      "therell",
      "thered",
      "thereve",
      "therere",
      "who",
      "whos",
      "what",
      "whats",
      "where",
      "wheres",
      "when",
      "whens",
      "why",
      "whys",
      "how",
      "hows",
      "the",
      "a",
      "an",
      "another",
      "all",
      "someone",
      "somebody",
      "anyone",
      "anybody",
      "everyone",
      "everybody",
      "nobody",
      "nothing",
      "something",
      "anything",
      "everything",
      "so",
      "then",
      "now",
      "anyway",
      "anyways",
      "anyhow",
      "anyhoo",
      "guess",
      "maybe",
      "perhaps",
      "alright",
      "alrighty",
      "allright",
      "okay",
      "ok",
      "okey",
      "uh",
      "oh",
      "well",
      "right",
      "listen",
      "look",
      "hey",
      "hi",
      "hello",
      "yo",
      "dude",
      "man",
      "girl",
      "boy",
      "baby",
      "honey",
      "buddy",
      "sir",
      "maam",
      "ladies",
      "folks",
      "guys",
      "people",
      "kid",
      "kids",
      "partner",
      "friend",
      "friends",
      "gimme",
      "lemme",
      "dear",
      "cause",
      "because",
      "cuz",
      "cos",
      "coz",
      "if",
      "when",
      "whenever",
      "while",
      "since",
      "once",
      "after",
      "before",
      "for",
      "and",
      "but",
      "or",
      "yet",
      "though",
      "let",
      "lets",
      "gonna",
      "please",
      "cmon",
      "come",
      "should",
      "shoulda",
      "shouldve",
      "shouldnt",
      "could",
      "coulda",
      "couldve",
      "couldnt",
      "would",
      "woulda",
      "wouldve",
      "wouldnt",
      "might",
      "mighta",
      "mightve",
      "mightnt",
      "may",
      "must",
      "mustve",
      "mustnt",
      "shall",
      "shant",
      "can",
      "cant",
      "cannot",
      "won",
      "wont",
      "will",
      "did",
      "didnt",
      "do",
      "dont",
      "does",
      "doesnt",
      "done",
      "doing",
      "ain",
      "aint",
      "is",
      "isnt",
      "are",
      "arent",
      "was",
      "wasnt",
      "were",
      "werent",
      "have",
      "havent",
      "has",
      "hasnt",
      "had",
      "hadnt"
    ]);
    x = x.replace(/\b(oh|ah|yeah|uh)h+\b(?=[\s,!.?\)]|$)/gi, (match, base) => base);
    x = x.replace(/\b(oh|ah|yeah|whoa|ooh|uh|well)\b(?!,)/gi, (m, word, off, str) => {
      const after = str.slice(off + m.length);
      const lower = word.toLowerCase();

      let idx = 0;
      while (idx < after.length && /\s/.test(after[idx])) idx++;
      if (idx >= after.length) return lower === "well" ? m : m + ',';

      if (after[idx] === ',') return m;

      while (idx < after.length && CLOSING_QUOTES.has(after[idx])) {
        idx++;
        while (idx < after.length && /\s/.test(after[idx])) idx++;
        if (idx >= after.length) return m;
        if (after[idx] === ',') return m;
      }

      if (idx >= after.length) return m;

      const next = after[idx];

      if (lower === "well") {
        const before = str.slice(0, off);
        const trimmedBefore = before.replace(/\s+$/, '');
        const prevChar = trimmedBefore.slice(-1);
        const prevWordMatch = trimmedBefore.match(/([A-Za-z'’]+)[^A-Za-z'’]*$/);
        const prevWord = prevWordMatch ? prevWordMatch[1].replace(/^['’]+/, '').toLowerCase() : null;

        if (prevWord && WELL_PRECEDER_WORDS.has(prevWord)) return m;
        if (prevChar && /[A-Za-z0-9]/.test(prevChar) && (!prevWord || !WELL_ALLOWED_PRECEDERS.has(prevWord))) return m;
        if (INTERJECTION_STOPPERS.includes(next)) return m;

        let clauseIdx = idx;
        while (clauseIdx < after.length && '([{'.includes(after[clauseIdx])) {
          clauseIdx++;
          while (clauseIdx < after.length && /\s/.test(after[clauseIdx])) clauseIdx++;
        }

        while (clauseIdx < after.length && CLOSING_QUOTES.has(after[clauseIdx])) {
          clauseIdx++;
          while (clauseIdx < after.length && /\s/.test(after[clauseIdx])) clauseIdx++;
        }

        if (clauseIdx >= after.length) return m;

        const clauseStart = after.slice(clauseIdx);
        const nextWordMatch = clauseStart.match(/^([A-Za-z'’]+)/);
        if (!nextWordMatch) return m;

        let candidate = nextWordMatch[1].toLowerCase().replace(/[’]/g, "'");
        candidate = candidate.replace(/^'+/, '');
        if (!candidate) return m;

        const forms = new Set([candidate]);
        const noApos = candidate.replace(/'/g, '');
        forms.add(noApos);
        const noSuffix = candidate.replace(/(?:'ll|'re|'ve|'d|'m|'s)$/g, '');
        if (noSuffix && noSuffix !== candidate) {
          forms.add(noSuffix);
          forms.add(noSuffix.replace(/'/g, ''));
        }

        for (const form of forms) {
          const normalized = form.replace(/'/g, '');
          if (normalized && WELL_CLAUSE_STARTERS.has(normalized)) return m + ',';
        }

        return m;
      }

      if (INTERJECTION_STOPPERS.includes(next)) return m;
      return m + ',';
    });

    x = x.replace(/\b(oh|ah|yeah|whoa|ooh|uh|well)\b\s*,\s*(?=\))/gi, '$1');

    // Dropped-G
    const dropped = ["nothin","somethin","anythin","comin","goin","playin","lovin","talkin","walkin","feelin","runnin","workin","doin"];
    const reDropped = new RegExp("\\b(" + dropped.join("|") + ")(?!['’])\\b", "gi");
    x = x.replace(reDropped, m => m + "'");

    // Numbers & timing logic
    x = normalizeOClock(x);
    x = applyNumberRules(x);
    x = applyNoCommaRules(x);

    // Normalize "god damn" -> "goddamn" while respecting casing
    x = x.replace(/\bgod\s+damn\b/gi, match => {
      if (match === match.toUpperCase()) return 'GODDAMN';
      if (match[0] === 'G') return 'Goddamn';
      return 'goddamn';
    });

    // Remove stray spaces that appear immediately before punctuation marks
    x = x.replace(/[ \t]+([!?.,;:])/g, '$1');

    // Standalone pronoun fixes
    x = ensureStandaloneICapitalized(x);

    // Ensure "'cause" is capitalized at the start of lines while respecting all-caps lines
    x = x.replace(/(^|\n)(\s*)('?cause)\b/gi, (match, boundary, spaces, token, offset, str) => {
      const tokenEnd = offset + boundary.length + spaces.length + token.length;
      const lineEnd = str.indexOf('\n', tokenEnd);
      const rest = lineEnd === -1 ? str.slice(tokenEnd) : str.slice(tokenEnd, lineEnd);
      const hasLower = /[a-z]/.test(rest);
      const hasUpper = /[A-Z]/.test(rest);
      if ((hasUpper && !hasLower) || token === token.toUpperCase()) {
        return boundary + spaces + "'CAUSE";
      }
      return boundary + spaces + "'Cause";
    });

    // Capitalize first letter of each line (ignoring leading whitespace)
    x = x.replace(/(^|\n)(\s*)(["'“”‘’]?)([a-z])/g, (_, boundary, space, quote, letter) =>
      boundary + space + quote + letter.toUpperCase()
    );

    // BV lowercase (except I)
    x = x.replace(/([a-z])\(/g, "$1 (");
    x = x.replace(/\(([^()]+)\)/g, (m, inner) => {
      let processed = inner.toLowerCase();
      processed = processed.replace(/\b(i)\b/g, "I");
      return "(" + processed + ")";
    });

    // Capitalize first letter when line starts with "("
    x = x.replace(/(^|\n)\(\s*([a-z])/g, (_, a, b) => a + "(" + b.toUpperCase());

    // Capitalize words following question or exclamation marks (after parentheses normalization)
    x = capitalizeAfterSentenceEnders(x);

    x = enforceStructureTagSpacing(x);

    // Smart comma relocation: only move if there's text after ")" (idempotent), otherwise remove
    x = x.replace(/,\s*\(([^)]*?)\)(?=\s*\S)/g, (match, inner, offset, str) => {
      const afterIdx = offset + match.length;
      if (str[afterIdx] === ',') return match;
      return ` (${inner}),`;
    });
    x = x.replace(/,\s*\(([^)]*?)\)\s*$/gm, ' ($1)');     // if line ends after ")", remove comma


    // ---------- Final Sanitation (Parenthetical Safe) ----------

    // ✅ Do NOT create or destroy new lines for parentheses
    // Simply merge accidental breaks that split them apart
    x = x.replace(/ *\n+(?=\([^)]+\))/g, ' ');
    x = x.replace(/(\([^)]+\)) *\n+/g, '$1 ');

    // ✅ Lowercase first word after ")" unless it's I / I'm / I'ma
    x = x.replace(/\)\s+([A-Z][a-z]*)\b/g, (match, word) => {
      const exceptions = ['I', "I'm", "I'ma"];
      return exceptions.includes(word) ? `) ${word}` : `) ${word.toLowerCase()}`;
    });

    x = x
      .replace(/([,;!?])(\S)/g, (match, punct, next, offset, str) => {
        if (/["?!]/.test(next)) return punct + next;
        const following = str[offset + match.length] || '';
        if (
          next === "'" &&
          following &&
          following.toLocaleLowerCase() !== following.toLocaleUpperCase()
        ) {
          return punct + ' ' + next;
        }
        const isLetter = next.toLocaleLowerCase() !== next.toLocaleUpperCase();
        if (isLetter || /\d/.test(next)) return punct + ' ' + next;
        return punct + next;
      })
      .replace(/ +/g, " ")                           // collapse multiple spaces
      .replace(/[ \t]+([,.;!?\)])/g, "$1")           // preserve newlines, remove only spaces before punctuation (except before "(")
      .replace(/([!?])\s+(?=")/g, '$1')               // keep punctuation tight to closing quotes
      .replace(/(?<=\S)"(?=[^\s"!.?,;:)\]])/g, '" ') // ensure space after closing quotes when followed by text
      .replace(/([!?])\s*(?=\()/g, "$1 ")            // ensure space between !/? and following "("
      .replace(/([A-Za-z])\(/g, "$1 (")              // space before (
      .replace(/\)([A-Za-z])/g, ") $1")              // space after )
      .replace(/\( +/g, "(").replace(/ +\)/g, ")")
      .replace(/,{2,}/g, ",")                        // collapse duplicate commas
      .replace(/,(\s*\))/g, "$1");                   // remove commas immediately before a closing parenthesis

    // 1️⃣ Remove trailing commas from line endings entirely
    x = x.replace(/,+\s*$/gm, "");

    // 2️⃣ Ensure a blank line before structure tags when previous stanza ends with yeah/oh/whoa/huh or ")"
    x = x.replace(
      /(\b(?:yeah|oh|whoa|huh)\b|\))[ \t]*\n+(?=#(?:INTRO|VERSE|PRE-CHORUS|CHORUS|BRIDGE|HOOK|OUTRO))/gim,
      '$1\n\n'
    );

    // 3️⃣ Prevent multiple blank lines from stacking between sections
    x = x.replace(/\n{3,}/g, "\n\n");

    // 4️⃣ Remove stray indentation and trailing spaces on each line
    x = x.replace(/^[ \t]+/gm, "");
    x = x.replace(/[ \t]+$/gm, "");

    x = x.trim();

    if (preservedStandaloneParens.length > 0) {
      const restoreRe = new RegExp(`${STANDALONE_PAREN_SENTINEL}(\\d+)__`, 'g');
      x = x.replace(restoreRe, (_, idx) => {
        const original = preservedStandaloneParens[Number(idx)];
        return original === undefined ? '' : original;
      });

      x = x.replace(
        /(\b(?:yeah|oh|whoa|huh)\b|\))[ \t]*\n+(?=#(?:INTRO|VERSE|PRE-CHORUS|CHORUS|BRIDGE|HOOK|OUTRO))/gim,
        '$1\n\n'
      );
    }

    return x;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { formatLyrics };
  }

  if (!hasWindow) return;

  function bindFocusTracker(doc) {
    if (!doc || focusTrackedDocs.has(doc)) return;
    doc.addEventListener("focusin", e => {
      const el = e.target;
      if (el?.isContentEditable || el?.tagName === "TEXTAREA" || el?.getAttribute?.("role") === "textbox")
        currentEditable = el;
    });
    focusTrackedDocs.add(doc);
  }

  // ---------- Editor I/O ----------
  function getEditorText(el){return el.isContentEditable?el.innerText:el.value;}
  function setNativeValue(el,v){
    const ownerDoc=el?.ownerDocument||document;
    const ownerWin=ownerDoc?.defaultView||window;
    const p=Object.getPrototypeOf(el);
    const d=Object.getOwnPropertyDescriptor(p,'value');
    const s=d&&d.set;
    if(s)s.call(el,v);else el.value=v;
    const EventCtor=ownerWin?.Event||Event;
    el.dispatchEvent(new EventCtor('input',{bubbles:true}));
    el.dispatchEvent(new EventCtor('change',{bubbles:true}));
  }
  function replaceInContentEditable(el,t){
    const ownerDoc=el?.ownerDocument||document;
    const ownerWin=ownerDoc?.defaultView||window;
    el.focus();
    try{
      ownerDoc.execCommand('selectAll',false,null);
      ownerDoc.execCommand('insertText',false,t);
    }catch{
      el.innerText=t;
      const InputCtor=ownerWin?.InputEvent
        || (typeof InputEvent!=='undefined'?InputEvent:undefined)
        || ownerWin?.Event
        || Event;
      el.dispatchEvent(new InputCtor('input',{bubbles:true}));
    }
  }
  function writeToEditor(el,t){if(el.isContentEditable&&ALWAYS_AGGRESSIVE){replaceInContentEditable(el,t);setTimeout(()=>replaceInContentEditable(el,t),10);return true;}if(el.isContentEditable){replaceInContentEditable(el,t);return true;}if(el.tagName==='TEXTAREA'||el.tagName==='INPUT'){setNativeValue(el,t);return true;}return false;}

  // ---------- UI ----------
  function resolveUiContext() {
    if (!hasWindow) return { doc: null, win: null };
    try {
      const topWin = window.top;
      if (topWin && topWin.document) return { doc: topWin.document, win: topWin };
    } catch {
      /* ignore cross-origin access errors */
    }
    return { doc: document, win: window };
  }

  const { doc: uiDocument, win: uiWindowCandidate } = resolveUiContext();
  const uiWindow = uiDocument?.defaultView || uiWindowCandidate || window;
  bindFocusTracker(document);
  if (uiDocument && uiDocument !== document) bindFocusTracker(uiDocument);

  const BUTTON_RIGHT_OFFSET = 16;
  const BUTTON_BASE_BOTTOM = 146;
  const BUTTON_GAP_PX = 12;
  const MAX_CONFLICT_RIGHT_PX = 240;
  const REPOSITION_INTERVAL_MS = 250;
  const REPOSITION_ATTEMPTS = 6;
  const RAISE_BY_FACTOR = 1.5;
  let latestButtonBottom = BUTTON_BASE_BOTTOM;

  function computeBottomOffset(el) {
    const doc = el?.ownerDocument;
    const win = doc?.defaultView;
    if (!doc || !win) return BUTTON_BASE_BOTTOM;
    let requiredBottom = BUTTON_BASE_BOTTOM;
    const elements = doc.querySelectorAll('*');
    for (const node of elements) {
      if (!(node instanceof win.HTMLElement) || node === el) continue;
      const style = win.getComputedStyle(node);
      if (style.position !== 'fixed') continue;
      const rect = node.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      const bottom = parseFloat(style.bottom);
      const right = parseFloat(style.right);
      if (!Number.isFinite(bottom) || !Number.isFinite(right)) continue;
      if (right > MAX_CONFLICT_RIGHT_PX) continue;
      const candidate = bottom + rect.height * RAISE_BY_FACTOR + BUTTON_GAP_PX;
      if (candidate > requiredBottom) requiredBottom = candidate;
    }
    return Math.round(requiredBottom);
  }

  function placeButton(el){
    if(!el) return;
    el.style.right=`${BUTTON_RIGHT_OFFSET}px`;
    latestButtonBottom=computeBottomOffset(el);
    el.style.bottom=`${latestButtonBottom}px`;
  }

  function bindShortcutListener(doc){
    if(!doc || shortcutTrackedDocs.has(doc)) return;
    doc.addEventListener('keydown',e=>{if(e.altKey&&!e.ctrlKey&&!e.metaKey&&e.key.toLowerCase()==='m'){e.preventDefault();runFormat();}});
    shortcutTrackedDocs.add(doc);
  }

  function ensureShortcutListeners(){
    bindShortcutListener(document);
    if(uiDocument && uiDocument!==document) bindShortcutListener(uiDocument);
  }

  let floatingButton=null;
  let floatingButtonIntervalId=null;
  let floatingButtonResizeHandler=null;

  function createFloatingButton(){
    if(!uiDocument?.documentElement) return;
    const buttonParent=uiDocument.body||uiDocument.documentElement;
    if(!buttonParent) return;

    let btn=floatingButton||uiDocument.getElementById('mxmFmtBtn');
    if(!btn){
      btn=uiDocument.createElement('button');
      btn.id='mxmFmtBtn';
      btn.type='button';
      btn.textContent='Format MxM';
      btn.setAttribute('aria-label','Format lyrics (Alt+M)');
      Object.assign(btn.style,{padding:'10px 14px',borderRadius:'12px',border:'1px solid #303030',background:'linear-gradient(135deg,#181818,#101010)',color:'#f9f9f9',fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',fontSize:'13px',letterSpacing:'0.3px',cursor:'pointer',position:'fixed',zIndex:2147483647,transition:'transform .18s ease, box-shadow .18s ease'});
      btn.addEventListener('mouseenter',()=>{btn.style.transform='translateY(-2px)';btn.style.boxShadow='0 10px 24px rgba(0,0,0,.32)';});
      btn.addEventListener('mouseleave',()=>{btn.style.transform='';btn.style.boxShadow='0 6px 18px rgba(0,0,0,.28)';});
      btn.addEventListener('focus',()=>{btn.style.boxShadow='0 0 0 3px rgba(255,255,255,.18)';});
      btn.addEventListener('blur',()=>{btn.style.boxShadow='0 6px 18px rgba(0,0,0,.28)';});
    }

    if(!btn.isConnected) buttonParent.appendChild(btn);

    btn.style.boxShadow='0 6px 18px rgba(0,0,0,.28)';
    btn.style.position='fixed';
    btn.style.zIndex='2147483647';
    placeButton(btn);

    const hostWindow=uiWindow||window;
    if(floatingButtonIntervalId){
      hostWindow.clearInterval(floatingButtonIntervalId);
      floatingButtonIntervalId=null;
    }
    let repositionCount=0;
    floatingButtonIntervalId=hostWindow.setInterval(()=>{
      repositionCount++;
      placeButton(btn);
      if(repositionCount>=REPOSITION_ATTEMPTS){
        hostWindow.clearInterval(floatingButtonIntervalId);
        floatingButtonIntervalId=null;
      }
    },REPOSITION_INTERVAL_MS);

    if(floatingButtonResizeHandler){
      hostWindow.removeEventListener('resize',floatingButtonResizeHandler);
    }
    floatingButtonResizeHandler=()=>placeButton(btn);
    hostWindow.addEventListener('resize',floatingButtonResizeHandler);

    btn.onclick=()=>runFormat();
    floatingButton=btn;
    ensureShortcutListeners();
  }

  function removeFloatingButton(){
    const hostWindow=uiWindow||window;
    if(floatingButtonIntervalId){
      hostWindow.clearInterval(floatingButtonIntervalId);
      floatingButtonIntervalId=null;
    }
    if(floatingButtonResizeHandler){
      hostWindow.removeEventListener('resize',floatingButtonResizeHandler);
      floatingButtonResizeHandler=null;
    }
    const btn=floatingButton||uiDocument?.getElementById('mxmFmtBtn');
    if(btn?.isConnected) btn.remove();
    floatingButton=null;
    latestButtonBottom=BUTTON_BASE_BOTTOM;
  }

  function syncFloatingButtonVisibility(){
    if(extensionOptions.showFloatingButton) createFloatingButton();
    else removeFloatingButton();
  }

  function applyExtensionOptions(updates={}){
    if(!updates || typeof updates!=='object') return;
    const prevShow=extensionOptions.showFloatingButton;
    if(Object.prototype.hasOwnProperty.call(updates,'lang') && typeof updates.lang==='string')
      extensionOptions.lang=updates.lang;
    if(Object.prototype.hasOwnProperty.call(updates,'autoLowercase'))
      extensionOptions.autoLowercase=Boolean(updates.autoLowercase);
    if(Object.prototype.hasOwnProperty.call(updates,'fixBackingVocals'))
      extensionOptions.fixBackingVocals=Boolean(updates.fixBackingVocals);
    let showChanged=false;
    if(Object.prototype.hasOwnProperty.call(updates,'showFloatingButton')){
      const nextShow=Boolean(updates.showFloatingButton);
      showChanged=nextShow!==prevShow;
      extensionOptions.showFloatingButton=nextShow;
    }
    if(showChanged) syncFloatingButtonVisibility();
    else if(extensionOptions.showFloatingButton && !floatingButton) createFloatingButton();
  }

  function initializeExtensionOptions(){
    ensureShortcutListeners();
    syncFloatingButtonVisibility();
    const chromeStorage=typeof chrome!=='undefined'?chrome.storage:undefined;
    if(!chromeStorage?.sync) return;

    chromeStorage.sync.get(['mxmLang','mxmLower','mxmBV','mxmButton'],data=>{
      const payload=data||{};
      applyExtensionOptions({
        lang: payload.mxmLang || extensionDefaults.lang,
        autoLowercase: Boolean(payload.mxmLower),
        fixBackingVocals: payload.mxmBV ?? extensionDefaults.fixBackingVocals,
        showFloatingButton: Boolean(payload.mxmButton)
      });
    });

    if(chromeStorage.onChanged?.addListener){
      chromeStorage.onChanged.addListener((changes,area)=>{
        if(area!=='sync') return;
        const updates={};
        if(Object.prototype.hasOwnProperty.call(changes,'mxmLang'))
          updates.lang=changes.mxmLang.newValue || extensionDefaults.lang;
        if(Object.prototype.hasOwnProperty.call(changes,'mxmLower'))
          updates.autoLowercase=Boolean(changes.mxmLower.newValue);
        if(Object.prototype.hasOwnProperty.call(changes,'mxmBV'))
          updates.fixBackingVocals=changes.mxmBV.newValue ?? extensionDefaults.fixBackingVocals;
        if(Object.prototype.hasOwnProperty.call(changes,'mxmButton'))
          updates.showFloatingButton=Boolean(changes.mxmButton.newValue);
        if(Object.keys(updates).length) applyExtensionOptions(updates);
      });
    }
  }

  initializeExtensionOptions();
  function toast(msg){
    if(!uiDocument) return;
    const t=uiDocument.createElement('div');
    const toastBottom=Math.max(latestButtonBottom+48,BUTTON_BASE_BOTTOM+48);
    Object.assign(t.style,{background:'rgba(17,17,17,.95)',color:'#eaeaea',border:'1px solid #333',borderRadius:'10px',padding:'8px 10px',fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',fontSize:'12px',position:'fixed',right:`${BUTTON_RIGHT_OFFSET}px`,bottom:`${toastBottom}px`,zIndex:2147483647,boxShadow:'0 8px 22px rgba(0,0,0,.35)'});
    t.setAttribute('role','status');
    t.setAttribute('aria-live','polite');
    t.textContent=msg;
    uiDocument.documentElement.appendChild(t);
    (uiWindow||window).setTimeout(()=>t.remove(),1800);
  }

  // ---------- Runner ----------
  function runFormat(passedOptions){
    if(passedOptions && typeof passedOptions==='object'){
      const updates={};
      if(Object.prototype.hasOwnProperty.call(passedOptions,'lang') && typeof passedOptions.lang==='string')
        updates.lang=passedOptions.lang;
      if(Object.prototype.hasOwnProperty.call(passedOptions,'autoLowercase'))
        updates.autoLowercase=Boolean(passedOptions.autoLowercase);
      if(Object.prototype.hasOwnProperty.call(passedOptions,'fixBackingVocals'))
        updates.fixBackingVocals=Boolean(passedOptions.fixBackingVocals);
      if(Object.prototype.hasOwnProperty.call(passedOptions,'showFloatingButton'))
        updates.showFloatingButton=Boolean(passedOptions.showFloatingButton);
      if(Object.keys(updates).length) applyExtensionOptions(updates);
    }

    const searchDoc=uiDocument||document;
    const el=currentEditable||findDeepEditable(searchDoc);
    if(!el){alert('Click inside the lyrics field first, then press Alt+M.');return;}
    const before=getEditorText(el);
    const effectiveOptions={...extensionOptions};
    let out=formatLyrics(before,effectiveOptions);
    if(effectiveOptions.autoLowercase) out=out.toLowerCase();
    writeToEditor(el,out);
    toast(`Formatted ✓ (v${SCRIPT_VERSION})`);
  }

  // Listen for popup-triggered Format Lyrics
  window.runFormat = window.runFormat || function(options) {
    const event = new CustomEvent('mxmFormatRequest', { detail: options || null });
    document.dispatchEvent(event);
  };

  document.addEventListener('mxmFormatRequest', (evt) => {
    if (typeof runFormat === 'function') runFormat(evt?.detail);
  });

})(typeof globalThis !== 'undefined' ? globalThis : this);
