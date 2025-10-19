// ==UserScript==
// @name         MxM In-Editor Formatter (EN)
// @namespace    mxm-tools
// @version      1.1.2
// @description  Musixmatch Studio-only formatter with improved BV, punctuation, and comma relocation fixes
// @author       Vincas Stepankevičius & Richard Mangezi Muketa
// @match        https://curators.musixmatch.com/*
// @match        https://curators-beta.musixmatch.com/*
// @run-at       document-idle
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/AshtonLG3/Musixmatch-In-Editor-Lyrics-Formatter/main/MxM-Formatter.user.js
// @updateURL    https://raw.githubusercontent.com/AshtonLG3/Musixmatch-In-Editor-Lyrics-Formatter/main/MxM-Formatter.user.js
// ==/UserScript==

(function (global) {
  const hasWindow = typeof window !== 'undefined' && typeof document !== 'undefined';
  const root = hasWindow ? window : global;
  const RAISE_BY_FACTOR = 1.5;
  const ALWAYS_AGGRESSIVE = true;
  const SETTINGS_KEY = 'mxmFmtSettings.v105';
  const defaults = { showPanel: true, aggressiveNumbers: false };

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
      (w, raw) => String(WORD_TO_NUM_11_19[raw.toLowerCase()]));
    line = line.replace(/\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[-\s]+(one|two|three|four|five|six|seven|eight|nine)|(one|two|three|four|five|six|seven|eight|nine))?\b/gi,
      (_, tensRaw, onesWithSep, onesBare) => {
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
      const numCount = (lines[i].match(/\b\d+\b/g) || []).length;
      const useNumerals = numCount >= 3 || /\b(19|20)\d{2}\b|['’]\d0s|\d{1,2}:\d{2}\s*(?:a\.m\.|p\.m\.)/i.test(lines[i]);
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
<<<<<<< ours
      (/[\u0435\u0415]/g, m => m === "\u0415" ? "E" : "e")
=======
      .replace(/[\u0435\u0415]/g, m => m === "\u0415" ? "E" : "e")
>>>>>>> theirs
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
      .replace(/\btill\b/gi, m => {
        if (m === m.toUpperCase()) return "'TIL";
        if (m[0] === m[0].toUpperCase()) return "'Til";
        return "'til";
      })
      .replace(/\bimma\b/gi, "I'ma")
      .replace(/\bima\b/gi, "I'ma")
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

    // Interjections
    const CLOSING_QUOTES = new Set(["'", '"', "’", "”"]);
    const INTERJECTION_STOPPERS = ",!?.-;:)]}";
    x = x.replace(/\b(oh|yeah|whoa|ooh)\b/gi, (m, _, off, str) => {
      const after = str.slice(off + m.length);
      if (/^\s*$/.test(after)) return m;

      let idx = 0;
      while (idx < after.length && /\s/.test(after[idx])) idx++;
      if (idx >= after.length) return m;

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

    x = x.replace(/\b(oh|yeah|whoa|ooh)\b\s*,\s*(?=\))/gi, '$1');

    // Dropped-G
    const dropped = ["nothin","somethin","anythin","comin","goin","playin","lovin","talkin","walkin","feelin","runnin","workin","doin"];
    const reDropped = new RegExp("\\b(" + dropped.join("|") + ")(?!['’])\\b", "gi");
    x = x.replace(reDropped, m => m + "'");

    // Numbers
    x = applyNumberRules(x);

    // Capitalize after ? or !
    x = x.replace(/([!?])\s*([a-z])/g, (_, a, b) => a + " " + b.toUpperCase());

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
    x = x.replace(/,\s*$/gm, "");


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

  window.addEventListener("focusin", e => {
    const el = e.target;
    if (el.isContentEditable || el.tagName === "TEXTAREA" || el.getAttribute("role") === "textbox")
      currentEditable = el;
  });

  // ---------- Editor I/O ----------
  function getEditorText(el){return el.isContentEditable?el.innerText:el.value;}
  function setNativeValue(el,v){const p=Object.getPrototypeOf(el);const d=Object.getOwnPropertyDescriptor(p,'value');const s=d&&d.set;if(s)s.call(el,v);else el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
  function replaceInContentEditable(el,t){el.focus();try{document.execCommand('selectAll',false,null);document.execCommand('insertText',false,t);}catch{el.innerText=t;el.dispatchEvent(new InputEvent('input',{bubbles:true}));}}
  function writeToEditor(el,t){if(el.isContentEditable&&ALWAYS_AGGRESSIVE){replaceInContentEditable(el,t);setTimeout(()=>replaceInContentEditable(el,t),10);return true;}if(el.isContentEditable){replaceInContentEditable(el,t);return true;}if(el.tagName==='TEXTAREA'||el.tagName==='INPUT'){setNativeValue(el,t);return true;}return false;}

  // ---------- UI ----------
  if(window.top===window){
    const btn=document.createElement('button');
    btn.id='mxmFmtBtn';
    Object.assign(btn.style,{padding:'10px 12px',borderRadius:'12px',border:'1px solid #3a3a3a',background:'#111',color:'#fff',fontFamily:'system-ui',cursor:'pointer',boxShadow:'0 6px 20px rgba(0,0,0,.25)',position:'fixed',zIndex:2147483647});
    btn.textContent='Format MxM';
    document.documentElement.appendChild(btn);
    placeButton(btn);
    btn.onclick=runFormat;
    document.addEventListener('keydown',e=>{if(e.altKey&&!e.ctrlKey&&!e.metaKey&&e.key.toLowerCase()==='m'){e.preventDefault();runFormat();}});
  }
  function placeButton(el){const off=16,w=el.offsetWidth||120;const raise=Math.round(w*RAISE_BY_FACTOR);el.style.right=off+'px';el.style.bottom=(off+raise)+'px';}
  function toast(msg){const t=document.createElement('div');Object.assign(t.style,{background:'rgba(17,17,17,.95)',color:'#eaeaea',border:'1px solid #333',borderRadius:'10px',padding:'8px 10px',fontFamily:'system-ui',fontSize:'12px',position:'fixed',right:'16px',bottom:'80px',zIndex:2147483647});t.textContent=msg;document.documentElement.appendChild(t);setTimeout(()=>t.remove(),1800);}

  // ---------- Runner ----------
  function runFormat(){
    const el=currentEditable||findDeepEditable(window.top.document);
    if(!el){alert('Click inside the lyrics field first, then press Alt+M.');return;}
    const before=getEditorText(el);
    const out=formatLyrics(before);
    writeToEditor(el,out);
    toast("Formatted ✓ (v1.1.2)");
  }

})(typeof globalThis !== 'undefined' ? globalThis : this); 
