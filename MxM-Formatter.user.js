// ==UserScript==
// @name         MxM In-Editor Formatter (EN)
// @namespace    mxm-tools
// @version      1.1.18
// @description  Musixmatch Studio-only formatter with improved BV, punctuation, and comma relocation fixes
// @author       Vincas Stepankevičius & Richard Mangezi Muketa
// @match        https://curators.musixmatch.com/*
// @match        https://curators-beta.musixmatch.com/*
// @run-at       document-idle
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/AshtonLG3/Musixmatch-In-Editor-Lyrics-Formatter/main/MxM-Formatter.user.js
// @updateURL    https://raw.githubusercontent.com/AshtonLG3/Musixmatch-In-Editor-Lyrics-Formatter/main/MxM-Formatter.meta.js
// ==/UserScript==

(function (global) {
  const hasWindow = typeof window !== 'undefined' && typeof document !== 'undefined';
  const root = hasWindow ? window : global;
  const SCRIPT_VERSION = '1.1.18';
  const ALWAYS_AGGRESSIVE = true;
  const SETTINGS_KEY = 'mxmFmtSettings.v105';
  const defaults = { showPanel: true, aggressiveNumbers: true };

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
  function numerals0to10ToWords(line) {
    const re = /\b(0|1|2|3|4|5|6|7|8|9|10)\b/g;
    let out = "", last = 0, m;
    while ((m = re.exec(line)) !== null) {
      const s = m.index, e = s + m[0].length, num = parseInt(m[0], 10);
      if (isTimeContext(line, s, e) || isDateContext(line, s, e) || isDecadeNumeric(line, s, e))
        out += line.slice(last, e);
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
    const re = /\b(?:(\d{1,2})|(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve))(\s*o\s*clock)\b/gi;
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
        else if (word[0] === word[0].toUpperCase()) normalizedWord = baseWord[0].toUpperCase() + baseWord.slice(1);
        else normalizedWord = baseWord;
      } else {
        normalizedWord = baseWord;
      }
      const tailLetters = tail.replace(/[^A-Za-z]/g, '');
      const isAllCaps = tailLetters && tailLetters === tailLetters.toUpperCase();
      if (!word && isAllCaps) normalizedWord = normalizedWord.toUpperCase();
      const clockPart = isAllCaps ? " O'CLOCK" : " o'clock";
      return normalizedWord + clockPart;
    });
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

    text = text.replace(/,([ \t]+)([Nn][Oo])\b(?!\s*,)([ \t]+)([A-Za-z']+)/g,
      (match, preSpaces, noWord, postSpaces, nextWord, offset, str) => {
        const noStart = offset + 1 + preSpaces.length;
        if (!shouldCommaAfterNo(str, noStart + noWord.length)) return match;
        return `, ${noWord}, ${nextWord}`;
      });

    text = text.replace(/(\b[\w'"]+)([ \t]+)([Nn][Oo])\b(?!\s*,)([ \t]+)([A-Za-z']+)/g,
      (match, prevWord, preSpaces, noWord, postSpaces, nextWord, offset, str) => {
        const noStart = offset + prevWord.length + preSpaces.length;
        if (!shouldCommaAfterNo(str, noStart + noWord.length)) return match;
        const prevLower = prevWord.toLowerCase();
        const before = NO_TRAILING_SKIP_PREV.has(prevLower)
          ? `${prevWord} ${noWord}`
          : `${prevWord}, ${noWord}`;
        return `${before}, ${nextWord}`;
      });

    text = text.replace(/(\b[\w'"]+)([ \t]+)([Nn][Oo])(?=(?:\s*[.!?](?:\s|$)|\s*$))/g,
      (_match, prevWord, _spaces, noWord) => `${prevWord}, ${noWord}`);

    return text;
  }

  const LOOSE_EM_PREV_BLOCKERS = new Set([
    "i","im","i'm","i'd","i'll","i've","imma"
  ]);

  const LOOSE_EM_QUESTION_WORDS = new Set([
    "who","what","when","where","why","how"
  ]);

  const LOOSE_EM_NEXT_BLOCKERS = new Set([
    "i","im","i'm","i'd","i'll","i've","imma","we"
  ]);

  function findPreviousWord(str, index) {
    let i = index - 1;
    while (i >= 0 && /\s/.test(str[i])) i--;
    while (i >= 0 && !/[A-Za-z']/.test(str[i])) {
      if (str[i] === '\n') return null;
      i--;
    }
    if (i < 0) return null;
    let end = i + 1;
    while (i >= 0 && /[A-Za-z']/.test(str[i])) i--;
    const word = str.slice(i + 1, end);
    return word ? { word, start: i + 1, end } : null;
  }

  function findNextWord(str, index) {
    let i = index;
    while (i < str.length && /\s/.test(str[i])) i++;
    while (i < str.length && !/[A-Za-z']/.test(str[i])) {
      if (str[i] === '\n') return null;
      i++;
    }
    if (i >= str.length) return null;
    const start = i;
    while (i < str.length && /[A-Za-z']/.test(str[i])) i++;
    const word = str.slice(start, i);
    return word ? { word, start, end: i } : null;
  }

  function shouldConvertLooseVariant(str, start, wordLower, length) {
    const prevChar = start > 0 ? str[start - 1] : '';
    if (prevChar === "'" || prevChar === "`" || prevChar === "’") return false;
    const prev = findPreviousWord(str, start);
    if (!prev) return false;
    const prevLower = prev.word.toLowerCase();
    if (LOOSE_EM_PREV_BLOCKERS.has(prevLower)) return false;
    if (wordLower === 'am') {
      if (LOOSE_EM_QUESTION_WORDS.has(prevLower)) return false;
      const next = findNextWord(str, start + length);
      if (next && LOOSE_EM_NEXT_BLOCKERS.has(next.word.toLowerCase())) return false;
    }
    return true;
  }

  function shouldConvertThem(str, start, length) {
    const prev = findPreviousWord(str, start);
    return Boolean(prev);
  }

  function standardEmForCase(original) {
    const bare = original.replace(/^[’'`]/, '');
    if (!bare) return "'em";
    if (bare === bare.toUpperCase()) return "'EM";
    if (bare[0] === bare[0].toUpperCase()) return "'Em";
    return "'em";
  }

  function normalizeEmPronouns(text) {
    if (!text) return text;

    text = text.replace(/(^|[^A-Za-z0-9_])([’'`]?em)\b/gi, (match, boundary, word) =>
      boundary + standardEmForCase(word)
    );

    text = text.replace(/\b(them|um|m|am)\b/gi, (match, word, offset, str) => {
      const lower = word.toLowerCase();
      if (lower === 'them') {
        if (!shouldConvertThem(str, offset, match.length)) return match;
        return standardEmForCase(match);
      }
      if (!shouldConvertLooseVariant(str, offset, lower, match.length)) return match;
      return standardEmForCase(match);
    });

    return text;
  }

  // ---------- Formatter ----------
  function formatLyrics(input) {
    if (!input) return "";
    let x = ("\n" + input.trim() + "\n");

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
      return "#" + String(raw).toUpperCase().replace(/\d+/g, "").replace(/ +/g, "-");
    });

    // Remove end-line punctuation
    x = x.replace(/[.,;:\-]+(?=[ \t]*\n)/g, "");

    // Contractions
    x = x
      .replace(/\bcuz\b/gi, "'cause")
      .replace(/\bcos\b/gi, "'cause")
      .replace(/(?<!['\w])ti(?:ll|l)(?:')?(?!\w)/gi, (m, offset, str) => {
        const prev = offset > 0 ? str[offset - 1] : '';
        if (prev === "'" || prev === "\u2019") return m;
        const base = m.replace(/'/g, "");
        if (base === base.toUpperCase()) return "'TIL";
        if (base[0] === base[0].toUpperCase()) return "'Til";
        return "'til";
      })
      .replace(/\bimma\b/gi, "I'ma")
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

    x = normalizeEmPronouns(x);

    // Interjections
    const CLOSING_QUOTES = new Set(["'", '"', "’", "”"]);
    const INTERJECTION_STOPPERS = ",!?.-;:)]}";
    x = x.replace(/\b(oh|ah|yeah)h+\b(?=[\s,!.?]|$)/gi, (match, base) => base);
    x = x.replace(/\b(oh|ah|yeah|whoa|ooh)\b/gi, (m, _, off, str) => {
      const after = str.slice(off + m.length);
      if (/^\s*$/.test(after)) return m + ',';

      let idx = 0;
      while (idx < after.length && /\s/.test(after[idx])) idx++;
      if (idx >= after.length) return m + ',';

      if (after[idx] === ',') return m;

      while (idx < after.length && CLOSING_QUOTES.has(after[idx])) {
        idx++;
        while (idx < after.length && /\s/.test(after[idx])) idx++;
        if (idx >= after.length) return m;
        if (after[idx] === ',') return m;
      }

      const next = after[idx];
      if (INTERJECTION_STOPPERS.includes(next)) return m;
      return m + ',';
    });

    x = x.replace(/\b(oh|ah|yeah|whoa|ooh)\b\s*,\s*(?=\))/gi, '$1');

    // Dropped-G
    const dropped = ["nothin","somethin","anythin","comin","goin","playin","lovin","talkin","walkin","feelin","runnin","workin","doin"];
    const reDropped = new RegExp("\\b(" + dropped.join("|") + ")(?!['’])\\b", "gi");
    x = x.replace(reDropped, m => m + "'");

    // Numbers
    x = applyNumberRules(x);
    x = normalizeOClock(x);

    x = applyNoCommaRules(x);

    // Capitalize after ? or !
    x = x.replace(/([!?])\s*([a-z])/g, (_, a, b) => a + " " + b.toUpperCase());

    // Capitalize first letter of each line (ignoring leading whitespace)
    x = x.replace(/(^|\n)(\s*)([a-z])/g, (_, boundary, space, letter) => boundary + space + letter.toUpperCase());

    // BV lowercase (except I)
    x = x.replace(/([a-z])\(/g, "$1 (");
    x = x.replace(/\(([^()]+)\)/g, (m, inner) => {
      let processed = inner.toLowerCase();
      processed = processed.replace(/\b(i)\b/g, "I");
      return "(" + processed + ")";
    });

    // Capitalize first letter when line starts with "("
    x = x.replace(/(^|\n)\(\s*([a-z])/g, (_, a, b) => a + "(" + b.toUpperCase());

    // Smart comma relocation: only move if there's text after ")", otherwise remove
    x = x.replace(/,\s*\(([^)]*?)\)(?=\s*\S)/g, ' ($1),'); // if content follows, move comma after ")"
    x = x.replace(/,\s*\(([^)]*?)\)\s*$/gm, ' ($1)');     // if line ends after ")", remove comma
    x = x.replace(/,\s*$/gm, (match, offset, str) => {
      const lineStart = str.lastIndexOf('\n', offset);
      const start = lineStart === -1 ? 0 : lineStart + 1;
      const line = str.slice(start, offset).trim();
      if (/^(?:oh|ah|yeah|whoa|ooh)$/i.test(line)) return match;
      return '';
    });


    // ---------- Final Sanitation ----------
    x = x
      .replace(/([,;!?])([^\s])/g, "$1 $2")          // space after punctuation when a non-space follows
      .replace(/ +/g, " ")                           // collapse multiple spaces
      .replace(/[ \t]+([,.;!?\)])/g, "$1")           // preserve newlines, remove only spaces before punctuation (except before "(")
      .replace(/([!?])\s*(?=\()/g, "$1 ")            // ensure space between !/? and following "("
      .replace(/([A-Za-z])\(/g, "$1 (")              // space before (
      .replace(/\)([A-Za-z])/g, ") $1")              // space after )
      .replace(/\( +/g, "(").replace(/ +\)/g, ")")
      .replace(/,(\s*\))/g, "$1")                   // remove commas immediately before a closing parenthesis
      .replace(/[ \t]+\n/g, "\n")
      .trim();

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

  if(uiDocument?.documentElement){
    const buttonParent=uiDocument.body||uiDocument.documentElement;
    if(buttonParent){
      let btn=uiDocument.getElementById('mxmFmtBtn');
      const isNew=!btn;
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
        buttonParent.appendChild(btn);
      }else if(!btn.isConnected){
        buttonParent.appendChild(btn);
      }
      btn.style.boxShadow='0 6px 18px rgba(0,0,0,.28)';
      btn.style.position='fixed';
      btn.style.zIndex='2147483647';
      placeButton(btn);
      if(isNew){
        let repositionCount=0;
        const intervalId=(uiWindow||window).setInterval(()=>{
          repositionCount++;
          placeButton(btn);
          if(repositionCount>=REPOSITION_ATTEMPTS)(uiWindow||window).clearInterval(intervalId);
        },REPOSITION_INTERVAL_MS);
        (uiWindow||window).addEventListener('resize',()=>placeButton(btn));
      }
      btn.onclick=runFormat;
      bindShortcutListener(document);
      if(uiDocument!==document) bindShortcutListener(uiDocument);
    }
  }
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
  function runFormat(){
    const searchDoc=uiDocument||document;
    const el=currentEditable||findDeepEditable(searchDoc);
    if(!el){alert('Click inside the lyrics field first, then press Alt+M.');return;}
    const before=getEditorText(el);
    const out=formatLyrics(before);
    writeToEditor(el,out);
    toast(`Formatted ✓ (v${SCRIPT_VERSION})`);
  }

})(typeof globalThis !== 'undefined' ? globalThis : this);
