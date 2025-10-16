// ==UserScript==
// @name         MxM In-Editor Formatter (EN)
// @namespace    mxm-tools
// @author       Vincas Mangezi
// @version      0.9.6
// @description  EN-only; case-by-case dropped-G (add ’ only); oh/yeah/whoa comma (same-line only); woah→whoa; strip EOL commas; numbers per spec; Alt+M; button BR +1.5×.
// @match        *://*.musixmatch.com/*
// @match        *://studio.musixmatch.com/*
// @match        *://contribute.musixmatch.com/*
// @run-at       document-idle
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/AshtonLG3/Musixmatch-In-Editor-Lyrics-Formatter/main/MxM-Formatter.user.js
// @updateURL    https://raw.githubusercontent.com/AshtonLG3/Musixmatch-In-Editor-Lyrics-Formatter/main/MxM-Formatter.user.js
// ==/UserScript==

(function () {
  const RAISE_BY_FACTOR = 1.5;        // raise button by 1.5× its width (keeps clear of song length)
  const ALWAYS_AGGRESSIVE = true;      // always force-write into contenteditable
  const SETTINGS_KEY = 'mxmFmtSettings.v099';
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
    return /^['’]s\b/.test(after); // '60s
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

  // ---------- main formatter (EN) ----------
  function formatLyrics(input) {
    if (!input) return "";
    let x = ("\n" + input.trim() + "\n");

    // Universal clean
    x = x
      .replace(/[\u2000-\u200b\u202f\u205f\u2060\u00a0]/gu, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/ {2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[\u2019\u2018\u0060\u00b4]/gu, "'")
      .replace(/[\u2013\u2014]/gu, ",")
      .replace(/[\u{1F300}-\u{1FAFF}\u{FE0F}\u2600-\u26FF\u2700-\u27BF\u2669-\u266F]/gu, ""); // emoji/symbols/notes

    // Tags
    x = x.replace(/\[(.*?)\]/g, function (_, raw) {
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
    x = x.replace(/^(#(?:INTRO|VERSE|PRE-CHORUS|CHORUS|BRIDGE|HOOK|OUTRO))\s*\d+\s*$/gmi, "$1")
         .replace(/([^\n])\n(#(?:INTRO|VERSE|PRE-CHORUS|CHORUS|BRIDGE|HOOK|OUTRO)\b)/g, "$1\n\n$2")
         .replace(/\n{2,}(#INSTRUMENTAL)\s*\n+/gmi, "\n$1\n")
         .replace(/([^\n])\n+(#INSTRUMENTAL)\b/gmi, "$1\n$2");

    // Punctuation + contractions
    x = x
      .replace(/[\u201c\u201d\u00ab\u00bb\u201e]/gu, '"')
      // Strip end-of-line punctuation EXCEPT ? !
      .replace(/[.,;:\u2013\u2014-]+(?=[ \t]*\n)/g, "")
      .replace(/!{2,}/g, "!").replace(/\?{2,}/g, "?")
      .replace(/(^|[^'’])\b(?:cause|cos)\b/gi, "$1'cause")
      .replace(/(^|[^'’])\b(?:till)\b/gi, "$1'til")
      .replace(/\b(?:imma|i['’]?mma|ima)\b/gi, "I'ma")
      .replace(/\bim\b/gi, "I'm")
      .replace(/\bdont\b/gi, "don't")
      .replace(/\bcant\b/gi, "can't")
      .replace(/\bwont\b/gi, "won't")
      .replace(/\baint\b/gi, "ain't")
      .replace(/\bi(?=\s|['"),.!?:;\]]|$)/g, "I")
      .replace(/\u0415/gu, "E").replace(/\u0435/gu, "e");

    // --- Interjections + "na" runs (distinct rules) ---
    // Spelling fix
    x = x.replace(/\bwoah\b/gi, "whoa");

    // Interjection commas (same line only): oh / yeah / whoa / ooh
    x = x.replace(/\b(oh|yeah|whoa|ooh)\b/gi, function (m, _w, offset, str) {
      const after = str.slice(offset + m.length);
      const nl = after.indexOf("\n");
      const seg = nl === -1 ? after : after.slice(0, nl);
      if (/^\s*-\s*/.test(seg)) return m;      // hyphenated (whoa-oh) → leave
      if (/^\s*[,!?.;:]/.test(seg)) return m;  // already punctuated → leave
      if (/^\s*$/.test(seg)) return m;         // end of line → NO comma
      if (/^\s*[A-Za-z"'\(]/.test(seg)) return m + ","; // word/quote/paren next → add comma
      return m;
    });

    // "na" runs: any sequence of 4+ "na" on the same line → "na-na-na-na"; extras → ", na"
    x = x.replace(/((?:\bna\b(?:[ \t]+|-\s*)?){4,})/gi, function (run) {
      const count = (run.match(/\bna\b/gi) || []).length;
      const suffixSpace = (run.match(/\s+$/) || [""])[0];
      let out = "na-na-na-na";
      if (count > 4) out += ", " + Array(count - 4).fill("na").join(", ");
      return out + suffixSpace;
    });

    // Dropped-G (by case only): add apostrophe when user already dropped G
    (function () {
      const droppedInList = [
        "nothin","somethin","anythin","everythin","nuthin","mornin","evenin",
        "comin","becomin","lovin","rollin","rockin","talkin","walkin","havin","goin","doin",
        "leanin","feelin","lookin","runnin","gettin","trippin","workin","flexin",
        "drinkin","smokin","bangin","kickin","breathin","swervin","singin","dancin",
        "cryin","tryin","watchin","listenin","writin","hittin","sittin","ridin",
        "drivin","closin","openin","turnin","burnin","learnin","earnin","shinin",
        "movin","provin","shootin","textin","postin","hatin","winnin","losin",
        "chillin","fallin","risin","flyin","playin"
      ];
      const reDropped = new RegExp("\\b(" + droppedInList.join("|") + ")(?!['’])\\b", "gi");
      x = x.replace(reDropped, (m) => m + "'");
    })();

    // Numbers
    x = applyNumberRules(x);

    // Parens spacing + capitalize first visible char of each line
    x = x.replace(/([^\s])\(/g, "$1 (")
         .replace(/\( +/g, "(")
         .replace(/ +\)/g, ")")
         .replace(/(\))[^\s\)\]\}\.,!?\-]/g, "$1 ")
         .replace(/(^|\n)(\(?["']?)([a-z])/g, (_, a, b, c) => a + b + c.toUpperCase());

    // Backing vocals in parentheses: lowercase first letter unless proper noun
    x = x.replace(/\(([^()]+)\)/g, function (m, inner) {
      const firstAlphaIdx = inner.search(/[A-Za-z]/);
      if (firstAlphaIdx === -1) return m;

      const leading = inner.slice(0, firstAlphaIdx);
      const rest = inner.slice(firstAlphaIdx);

      // Keep proper nouns / title case / months & days / ALL-CAPS & initialisms
      if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/.test(rest)) return m; // "New York City"
      if (/^(January|February|March|April|May|June|July|August|September|October|November|December|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/.test(rest)) return m;
      if (/^([A-Z]{2,}\b|(?:[A-Z]\.){2,}[A-Z]?)/.test(rest)) return m; // USA, U.K., L.A.

      const lowered = rest.replace(/^([A-Za-z])/, (c) => c.toLowerCase());
      return "(" + leading + lowered + ")";
    });

    // Final whitespace tidy
    x = x.replace(/[ \t]+\n/g, "\n").trim();
    return x;
  }

  // ---------- metrics (for toast & optional panel) ----------
  function computeMetrics(text) {
    const lines = text.split(/\n/);
    let over70 = 0, stanzaTooLongAt = [], numIssues = [], curLen = 0;
    for (let i = 0; i < lines.length; i++) {
      const L = lines[i], isTag = /^#(INTRO|VERSE|PRE-CHORUS|CHORUS|BRIDGE|HOOK|OUTRO|INSTRUMENTAL)\b/i.test(L.trim()), isBlank = L.trim() === "";
      if (!isTag && L.length > 70) over70++;
      if (!isTag && !isBlank) curLen++; else { if (curLen > 10) stanzaTooLongAt.push({ line: i, size: curLen }); curLen = 0; }
      const reNum = /\b(0|1|2|3|4|5|6|7|8|9|10)\b/g; let m;
      while ((m = reNum.exec(L)) !== null) {
        const start = m.index, end = start + m[0].length, ctx = L.slice(Math.max(0, start - 6), Math.min(L.length, end + 6));
        const timeAround = /\b\d{1,2}:\d{2}\b/i.test(L) ||
                           /\b(?:a|p)\.?m\.?\b/i.test(L.slice(end, end + 6)) ||
                           /\b(?:a|p)\.?m\.?\b/i.test(L.slice(Math.max(0, start - 6), end));
        const oclock = /\bo'?clock\b/i.test(L.slice(end, end + 10));
        const datey = /(?:\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/.test(L) || /\b(19|20)\d{2}\b/.test(L) || /[\/-]/.test(ctx);
        if (!(timeAround || oclock || datey)) numIssues.push({ line: i + 1, col: start + 1, value: m[0], sample: L.trim() });
      }
    }
    if (curLen > 10) stanzaTooLongAt.push({ line: lines.length, size: curLen });
    return { over70, stanzaTooLongAt, numIssues };
  }

  // ---------- editor plumbing ----------
  function deepestActiveEditable(startWin) {
    let doc = startWin.document, el = doc.activeElement;
    while (el && el.tagName === 'IFRAME') {
      try { if (!el.contentDocument) break; doc = el.contentDocument; el = doc.activeElement; }
      catch { break; }
    }
    if (isEditable(el)) return el;
    const cand = Array.from(doc.querySelectorAll('[contenteditable="true"], textarea, input[type="text"], [role="textbox"]'))
      .filter(isVisible).sort((a,b)=> area(b)-area(a))[0];
    return cand || null;
  }
  const isEditable = el => el && (el.isContentEditable || el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !['button','submit','checkbox','radio'].includes(el.type)));
  const isVisible = el => !!(el.offsetWidth || el.offsetHeight) && getComputedStyle(el).visibility !== 'hidden';
  const area = el => (el.offsetWidth||0)*(el.offsetHeight||0);

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
  function writeToEditor(el, text) {
    if (el.isContentEditable && ALWAYS_AGGRESSIVE) {
      replaceInContentEditable(el, text);
      setTimeout(()=> replaceInContentEditable(el, text), 10);
      return true;
    }
    if (el.isContentEditable) { replaceInContentEditable(el, text); return true; }
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') { setNativeValue(el, text); return true; }
    return false;
  }
  function getEditorText(el) {
    const t = el.isContentEditable ? el.innerText : el.value;
    return (t || "").replace(/\r\n/g, "\n");
  }

  // ---------- UI (button bottom-right, raised 1.5×) ----------
  if (window.top === window) {
    const btn = document.createElement('button');
    btn.id = 'mxmFmtBtn';
    Object.assign(btn.style, baseBtn());
    btn.textContent = 'Format MxM';
    document.documentElement.appendChild(btn);
    placeButton(btn);
    btn.onclick = runFormat;

    // Hotkey: Alt+M (avoid Chrome Ctrl+Shift+M conflict)
    document.addEventListener('keydown', (e) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'm') {
        e.preventDefault(); runFormat();
      }
    });
    window.addEventListener('resize', () => placeButton(btn));
    setTimeout(() => placeButton(btn), 0);

    const panel = buildPanel();
    if (settings.showPanel) document.documentElement.appendChild(panel);
  }

  function baseBtn(){
    return {
      padding:'10px 12px', borderRadius:'12px', border:'1px solid #3a3a3a',
      background:'#111', color:'#fff', fontFamily:'system-ui', cursor:'pointer',
      boxShadow:'0 6px 20px rgba(0,0,0,.25)', position:'fixed', zIndex:2147483647
    };
  }
  function placeButton(el) {
    const off = 16;
    el.style.left = el.style.top = el.style.right = el.style.bottom = 'auto';
    el.style.right = off + 'px';
    const w = el.offsetWidth || 120;
    const raise = Math.round(w * RAISE_BY_FACTOR);
    el.style.bottom = (off + raise) + 'px';
  }
  function placeToast(t) {
    const off = 16;
    t.style.position = 'fixed';
    t.style.zIndex = 2147483647;
    t.style.right = off + 'px';
    const btn = document.getElementById('mxmFmtBtn');
    const btnBottom = btn ? parseInt(btn.style.bottom || '16', 10) : 16;
    const btnH = btn ? btn.offsetHeight : 40;
    t.style.bottom = (btnBottom + btnH + 8) + 'px';
  }
  function toast(msg) {
    const t = document.createElement('div');
    Object.assign(t.style, {
      background:'rgba(17,17,17,.95)', color:'#eaeaea', border:'1px solid #333',
      borderRadius:'10px', padding:'8px 10px', fontFamily:'system-ui', fontSize:'12px'
    });
    t.textContent = msg;
    document.documentElement.appendChild(t);
    placeToast(t);
    setTimeout(()=> t.remove(), 1800);
  }

  // ---------- Runner ----------
  function runFormat() {
    const el = deepestActiveEditable(window.top);
    if (!el) { alert('No editor focused—click in the lyrics field first.'); return; }
    const before = getEditorText(el);
    const out = formatLyrics(before);
    writeToEditor(el, out);

    const { over70, stanzaTooLongAt, numIssues } = computeMetrics(out);
    toast(`Formatted ✓  L70:${over70}  V10:${stanzaTooLongAt.length}  #nums:${numIssues.length}`);
  }

  // ---------- Settings & Panel ----------
  function loadSettings() {
    try { return { ...defaults, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}) }; }
    catch { return { ...defaults }; }
  }
  function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }
  function buildPanel() {
    const wrap = document.createElement('div');
    Object.assign(wrap.style, {
      position:'fixed', bottom:'16px', left:'16px', zIndex:2147483647, minWidth:'220px', maxWidth:'40vw',
      background:'rgba(17,17,17,.95)', color:'#eaeaea', border:'1px solid #333', borderRadius:'12px', padding:'10px 12px',
      fontFamily:'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize:'12px', lineHeight:1.35
    });
    wrap.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <strong>MxM Checks</strong>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
          <input id="mxmPanelToggle" type="checkbox" ${settings.showPanel ? 'checked' : ''}/> <span>Show</span>
        </label>
      </div>
      <div id="mxmStats" style="margin-top:6px;">
        <div>L70 (lines > 70): <b>–</b></div>
        <div>V10 (stanzas > 10 lines): <b>–</b></div>
        <div>Numbers (0–10 numerals): <b>–</b></div>
      </div>
    `;
    wrap.querySelector('#mxmPanelToggle').addEventListener('change', (e)=>{
      settings.showPanel = e.target.checked; saveSettings(settings);
      wrap.style.display = settings.showPanel ? 'block' : 'none';
    });
    return wrap;
  }

})();
