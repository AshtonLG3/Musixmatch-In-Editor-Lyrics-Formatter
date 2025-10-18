// ==UserScript==
// @name         MxM In-Editor Formatter (EN)
// @namespace    mxm-tools
// @version      1.0.1
// @description  EN-only; fixes comma spacing, uppercase after !/?, preserve case after (, 'cuz → 'cause; maintains all prior rules (dropped-G, interjections, na runs, lowercase BVs, etc.)
// @author       Vincas Mangezi
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

  function applyNumberRules(text) {
    const NUM_WORDS_0_10 = ["zero","one","two","three","four","five","six","seven","eight","nine","ten"];
    const WORD_TO_NUM_11_19 = { eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19 };
    const WORD_TO_TENS = { twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90 };
    const WORD_TO_ONES = { one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9 };
    function isTimeContext(line, _s, e) { return (/:\d{2}/.test(line.slice(e))); }
    function isDateContext(line) { return (/\b(19|20)\d{2}\b/.test(line)); }
    return text.split('\n').map(line => {
      line = line.replace(/\b(0|1|2|3|4|5|6|7|8|9|10)\b/g, (m) =>
        isTimeContext(line, 0, 0) || isDateContext(line) ? m : NUM_WORDS_0_10[m]);
      line = line.replace(/\b(eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)\b/gi,
        (w) => WORD_TO_NUM_11_19[w.toLowerCase()] || w);
      line = line.replace(/\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)([-\s](one|two|three|four|five|six|seven|eight|nine))?\b/gi,
        (_, t, __, o) => String(WORD_TO_TENS[t.toLowerCase()] + (o ? WORD_TO_ONES[o.toLowerCase()] : 0)));
      return line;
    }).join('\n');
  }

  function formatLyrics(input) {
    if (!input) return "";
    let x = ("\n" + input.trim() + "\n");

    // cleanup + punctuation normalization
    x = x.replace(/[\u2000-\u200b\u202f\u205f\u2060\u00a0]/gu, " ")
         .replace(/[ \t]+\n/g, "\n").replace(/ {2,}/g, " ").replace(/\n{3,}/g, "\n\n")
         .replace(/[\u2019\u2018\u0060\u00b4]/gu, "'").replace(/[\u2013\u2014]/gu, ",")
         .replace(/[\u{1F300}-\u{1FAFF}\u{FE0F}\u2600-\u26FF\u2700-\u27BF\u2669-\u266F]/gu, "");

    // cause variants
    x = x.replace(/\b(cuz|cos|cause)\b/gi, "'cause");

    // comma spacing
    x = x.replace(/\s+,/g, ",").replace(/,([^\s])/g, ", $1");

    // uppercase after ! or ?
    x = x.replace(/([!?])\s*([a-z])/g, (_, p, q) => p + " " + q.toUpperCase());

    // capitalize when line starts with '('
    x = x.replace(/(^|\n)\(\s*([a-z])/g, (_, a, b) => a + "(" + b.toUpperCase());

    // interjection comma rules
    x = x.replace(/\bwoah\b/gi, "whoa");
    x = x.replace(/\b(oh|yeah|whoa|ooh)\b/gi, (m, _w, offset, str) => {
      const after = str.slice(offset + m.length);
      const nl = after.indexOf("\n");
      const seg = nl === -1 ? after : after.slice(0, nl);
      if (/^\s*-\s*/.test(seg) || /^\s*[,!?.;:]/.test(seg) || /^\s*$/.test(seg)) return m;
      if (/^\s*[A-Za-z"'\(]/.test(seg)) return m + ",";
      return m;
    });

    // "na" runs
    x = x.replace(/((?:\bna\b(?:[ \t]+|-\s*)?){4,})/gi, run => {
      const count = (run.match(/\bna\b/gi) || []).length;
      const suffix = (run.match(/\s+$/) || [""])[0];
      return count > 4 ? "na-na-na-na, " + Array(count - 4).fill("na").join(", ") + suffix : "na-na-na-na" + suffix;
    });

    // dropped G
    const dropped = ["nothin","somethin","anythin","everythin","mornin","evenin","comin","lovin","rollin","rockin","talkin","walkin","havin","goin","doin","feelin","lookin","runnin","gettin","workin","singin","dancin","tryin","watchin","listenin","writin","hittin","sittin","ridin","drivin","closin","burnin","movin","playin"];
    x = x.replace(new RegExp("\\b(" + dropped.join("|") + ")(?!['’])\\b", "gi"), m => m + "'");

    // numbers
    x = applyNumberRules(x);

    // parentheses spacing + lowercase BVs
    x = x.replace(/([^\s])\(/g, "$1 (").replace(/\( +/g, "(").replace(/ +\)/g, ")");
    x = x.replace(/\(([^()]+)\)/g, (m, inner) => {
      const firstAlpha = inner.search(/[A-Za-z]/);
      if (firstAlpha === -1) return m;
      const pre = inner.slice(0, firstAlpha);
      let rest = inner.slice(firstAlpha);
      rest = rest.replace(/^(Oh|Ooh|Yeah|Whoa)(\b|[,!?.;:])/, (_, w, b) => w.toLowerCase() + (b || ""));
      if (/^I(?=(\s|['’]))/.test(rest)) return "(" + pre + rest + ")";
      rest = rest.replace(/^([A-Za-z])/, c => c.toLowerCase());
      return "(" + pre + rest + ")";
    });

    return x.replace(/[ \t]+\n/g, "\n").trim();
  }

  function deepestActiveEditable(w) {
    let d = w.document, e = d.activeElement;
    while (e && e.tagName === 'IFRAME') { try { if (!e.contentDocument) break; d = e.contentDocument; e = d.activeElement; } catch { break; } }
    if (isEditable(e)) return e;
    return Array.from(d.querySelectorAll('[contenteditable="true"], textarea')).find(isVisible) || null;
  }
  const isEditable = el => el && (el.isContentEditable || el.tagName === 'TEXTAREA');
  const isVisible = el => (el.offsetWidth || el.offsetHeight) && getComputedStyle(el).visibility !== 'hidden';

  function replaceInContentEditable(el, text) {
    el.focus();
    try { document.execCommand('selectAll', false, null); document.execCommand('insertText', false, text); }
    catch { el.innerText = text; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
  }

  function writeToEditor(el, text) {
    if (el.isContentEditable && ALWAYS_AGGRESSIVE) {
      replaceInContentEditable(el, text);
      setTimeout(() => replaceInContentEditable(el, text), 10);
      return true;
    }
    return false;
  }

  function getEditorText(el) {
    return (el.isContentEditable ? el.innerText : el.value || "").replace(/\r\n/g, "\n");
  }

  if (window.top === window) {
    const btn = document.createElement('button');
    btn.id = 'mxmFmtBtn';
    Object.assign(btn.style, { padding:'10px 12px', borderRadius:'12px', border:'1px solid #3a3a3a', background:'#111', color:'#fff', fontFamily:'system-ui', cursor:'pointer', boxShadow:'0 6px 20px rgba(0,0,0,.25)', position:'fixed', zIndex:2147483647 });
    btn.textContent = 'Format MxM';
    document.documentElement.appendChild(btn);
    placeButton(btn);
    btn.onclick = runFormat;
    document.addEventListener('keydown', (e) => { if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'm') { e.preventDefault(); runFormat(); } });
  }

  function placeButton(el) {
    const off = 16; const w = el.offsetWidth || 120; const raise = Math.round(w * RAISE_BY_FACTOR);
    el.style.right = off + 'px'; el.style.bottom = (off + raise) + 'px';
  }

  function toast(msg) {
    const t = document.createElement('div');
    Object.assign(t.style, { background:'rgba(17,17,17,.95)', color:'#eaeaea', border:'1px solid #333', borderRadius:'10px', padding:'8px 10px', fontFamily:'system-ui', fontSize:'12px', position:'fixed', zIndex:2147483647 });
    const btn = document.getElementById('mxmFmtBtn'); const btnBottom = btn ? parseInt(btn.style.bottom || '16', 10) : 16; const btnH = btn ? btn.offsetHeight : 40;
    t.style.right = '16px'; t.style.bottom = (btnBottom + btnH + 8) + 'px'; t.textContent = msg; document.documentElement.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  }

  function runFormat() {
    const el = deepestActiveEditable(window.top);
    if (!el) return alert('Click in the lyrics field first.');
    const before = getEditorText(el);
    const out = formatLyrics(before);
    writeToEditor(el, out);
    toast('Formatted ✓');
  }

  function loadSettings() {
    try { return { ...defaults, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}) }; }
    catch { return { ...defaults }; }
  }

})();
