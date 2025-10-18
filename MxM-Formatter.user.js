// ==UserScript==
// @name         MxM In-Editor Formatter (EN)
// @namespace    mxm-tools
// @version      1.0.1
// @description  EN-only; fixed comma spacing; uppercase after !/?; maintain capitalization at line-start parentheses; case-by-case dropped-G (add ’ only); oh/yeah/whoa/ooh comma (same-line only); "na" runs grouped; backing-vocals lowercase; woah→whoa; strip end-line punctuation (except ?!); numbers per spec; Alt+M; button BR +1.5×.
// @match        *://*.musixmatch.com/*
// @match        *://studio.musixmatch.com/*
// @match        *://contribute.musixmatch.com/*
// @run-at       document-idle
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/AshtonLG3/Musixmatch-In-Editor-Lyrics-Formatter/main/MxM-Formatter.user.js
// @updateURL    https://raw.githubusercontent.com/AshtonLG3/Musixmatch-In-Editor-Lyrics-Formatter/main/MxM-Formatter.user.js
// ==/UserScript==

(function () {
  const RAISE_BY_FACTOR = 1.5;
  const ALWAYS_AGGRESSIVE = true;
  const SETTINGS_KEY = 'mxmFmtSettings.v101';
  const defaults = { showPanel: true };
  const settings = loadSettings();

  // ---------- number helpers ----------
  const NUM_WORDS_0_10 = ["zero","one","two","three","four","five","six","seven","eight","nine","ten"];
  const WORD_TO_NUM_11_19 = { eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19 };
  const WORD_TO_TENS = { twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90 };
  const WORD_TO_ONES = { one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9 };

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
  function numerals0to10ToWords(line) {
    const re = /\b(0|1|2|3|4|5|6|7|8|9|10)\b/g;
    let out = "", last = 0, m;
    while ((m = re.exec(line)) !== null) {
      const s = m.index, e = s + m[0].length, num = parseInt(m[0], 10);
      if (isTimeContext(line, s, e) || isDateContext(line, s, e) || isDecadeNumeric(line, s, e)) out += line.slice(last, e);
      else out += line.slice(last, s) + NUM_WORDS_0_10[num];
      last = e;
    }
    out += line.slice(last);
    return out;
  }
  function words11to99ToNumerals(line) {
    line = line.replace(/\b(eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)\b/gi,
      function (w, raw) {
        const start = arguments[arguments.length - 2], end = start + w.length;
        if (isTimeContext(line, start, end) || isDateContext(line, start, end)) return w;
        if (/^\s*o'?clock\b/i.test(line.slice(end))) return w;
        return String(WORD_TO_NUM_11_19[raw.toLowerCase()]);
      }
    );
    line = line.replace(/\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[-\s](one|two|three|four|five|six|seven|eight|nine))?\b/gi,
      function (w, tensRaw, onesRaw) {
        const start = arguments[arguments.length - 2], end = start + w.length;
        if (isTimeContext(line, start, end) || isDateContext(line, start, end)) return w;
        if (/^\s*o'?clock\b/i.test(line.slice(end))) return w;
        let n = WORD_TO_TENS[tensRaw.toLowerCase()];
        if (onesRaw) n += WORD_TO_ONES[onesRaw.toLowerCase()];
        return String(n);
      }
    );
    return line;
  }
  function applyNumberRules(text) {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      let L = numerals0to10ToWords(lines[i]);
      L = words11to99ToNumerals(L);
      lines[i] = L;
    }
    return lines.join('\n');
  }

  // ---------- main formatter ----------
  function formatLyrics(input) {
    if (!input) return "";
    let x = ("\n" + input.trim() + "\n");

    // Cleaning & punctuation
    x = x.replace(/[\u2000-\u200b\u202f\u205f\u2060\u00a0]/gu, " ")
         .replace(/[ \t]+\n/g, "\n")
         .replace(/ {2,}/g, " ")
         .replace(/\n{3,}/g, "\n\n")
         .replace(/[\u2019\u2018\u0060\u00b4]/gu, "'")
         .replace(/[\u2013\u2014]/gu, ",")
         .replace(/[\u{1F300}-\u{1FAFF}\u{FE0F}\u2600-\u26FF\u2700-\u27BF\u2669-\u266F]/gu, "");

    // Tags normalization
    x = x.replace(/\[(.*?)\]/g, (_, raw) => {
      const t = raw.toLowerCase().trim();
      if (/^intro/.test(t)) return "#INTRO";
      if (/^verse/.test(t)) return "#VERSE";
      if (/^pre[- ]?chorus/.test(t)) return "#PRE-CHORUS";
      if (/^chorus/.test(t)) return "#CHORUS";
      if (/^bridge/.test(t)) return "#BRIDGE";
      if (/^(hook|refrain|post-chorus|drop|break|interlude)/.test(t)) return "#HOOK";
      if (/^outro/.test(t)) return "#OUTRO";
      return "#" + raw.toUpperCase().replace(/\d+/g, "").replace(/ +/g, "-");
    });

    // Fix spaces around commas (home ,I'm → home, I'm)
    x = x.replace(/ *,(?=\S)/g, ", ").replace(/ , /g, ", ");

    // Basic contractions and 'cause rules
    x = x.replace(/\b(cuz|cos|cause)\b/gi, "'cause")
         .replace(/\b(till)\b/gi, "'til")
         .replace(/\b(imma|ima|i['’]?mma)\b/gi, "I'ma")
         .replace(/\bim\b/gi, "I'm")
         .replace(/\bdont\b/gi, "don't")
         .replace(/\bcant\b/gi, "can't")
         .replace(/\bwont\b/gi, "won't")
         .replace(/\baint\b/gi, "ain't");

    // Capitalize after ! and ?
    x = x.replace(/([!?])\s*([a-z])/g, (_, p1, p2) => p1 + " " + p2.toUpperCase());

    // Ensure line-start '(' keeps capitalization
    x = x.replace(/(^|\n)\(([a-z])/g, (_, a, b) => a + "(" + b.toUpperCase());

    // Interjection commas
    x = x.replace(/\b(oh|yeah|whoa|ooh)\b/gi, (m, w, offset, str) => {
      const after = str.slice(offset + m.length);
      const nl = after.indexOf("\n");
      const seg = nl === -1 ? after : after.slice(0, nl);
      if (/^\s*-\s*/.test(seg)) return m;
      if (/^\s*[,!?.;:]/.test(seg)) return m;
      if (/^\s*$/.test(seg)) return m;
      if (/^\s*[A-Za-z"'\(]/.test(seg)) return m + ",";
      return m;
    });

    // na-na-na-na grouping
    x = x.replace(/((?:\bna\b(?:[ \t]+|-\s*)?){4,})/gi, (run) => {
      const count = (run.match(/\bna\b/gi) || []).length;
      let out = "na-na-na-na";
      if (count > 4) out += ", " + Array(count - 4).fill("na").join(", ");
      return out;
    });

    // Dropped G
    const dropped = ["playin","nothin","somethin","comin","goin","doin","runnin","walkin","talkin","feelin","lovin"];
    const re = new RegExp("\\b(" + dropped.join("|") + ")(?!['’])\\b", "gi");
    x = x.replace(re, (m) => m + "'");

    // Apply number conversions
    x = applyNumberRules(x);

    // Backing vocals
    x = x.replace(/\(([^()]+)\)/g, (m, inner) => {
      if (/^I(?=(\s|['’]))/.test(inner.trim())) return "(" + inner + ")";
      return "(" + inner.charAt(0).toLowerCase() + inner.slice(1) + ")";
    });

    // Trim spaces and line breaks
    x = x.replace(/[ \t]+\n/g, "\n").trim();
    return x;
  }

  // ---------- helper functions ----------
  function deepestActiveEditable(win) {
    let doc = win.document, el = doc.activeElement;
    while (el && el.tagName === 'IFRAME') {
      try { if (!el.contentDocument) break; doc = el.contentDocument; el = doc.activeElement; }
      catch { break; }
    }
    return el && (el.isContentEditable || el.tagName === 'TEXTAREA') ? el : null;
  }
  function setNativeValue(el, value) {
    const proto = Object.getPrototypeOf(el);
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    const setter = desc && desc.set;
    if (setter) setter.call(el, value); else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function replaceInContentEditable(el, text) {
    el.focus();
    try { document.execCommand('selectAll', false, null); document.execCommand('insertText', false, text); }
    catch { el.innerText = text; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
  }

  // ---------- button ----------
  if (window.top === window) {
    const btn = document.createElement('button');
    btn.textContent = 'Format MxM';
    Object.assign(btn.style, {
      padding:'10px 12px', borderRadius:'12px', border:'1px solid #3a3a3a',
      background:'#111', color:'#fff', position:'fixed',
      bottom:Math.round(16 + 1.5 * 120)+'px', right:'16px',
      zIndex:999999, cursor:'pointer'
    });
    btn.onclick = runFormat;
    document.body.appendChild(btn);

    document.addEventListener('keydown', e=>{
      if(e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase()==='m'){
        e.preventDefault(); runFormat();
      }
    });
  }

  function runFormat() {
    const el = deepestActiveEditable(window.top);
    if (!el) { alert('Click in the lyrics field first.'); return; }
    const before = el.innerText || el.value;
    const out = formatLyrics(before);
    if (el.isContentEditable) replaceInContentEditable(el, out);
    else setNativeValue(el, out);
    toast('Formatted ✓');
  }

  function toast(msg) {
    const t = document.createElement('div');
    Object.assign(t.style, {
      position:'fixed', bottom:'140px', right:'16px',
      background:'rgba(17,17,17,.95)', color:'#fff',
      border:'1px solid #333', borderRadius:'10px',
      padding:'6px 10px', fontFamily:'system-ui', fontSize:'12px', zIndex:999999
    });
    t.textContent = msg; document.body.appendChild(t);
    setTimeout(()=>t.remove(), 1500);
  }

  function loadSettings() {
    try { return { ...defaults, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}) }; }
    catch { return { ...defaults }; }
  }

})();
