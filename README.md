<div align="center">
  <img src="banner.png" width="100%" alt="Musixmatch In-Editor Formatter Banner">
  
  <br>

  <img src="https://img.shields.io/badge/version-1.1.85-0e4f7a?style=for-the-badge&logo=tampermonkey&logoColor=white" alt="Version">
  <img src="https://img.shields.io/badge/downloads-98-d4af37?style=for-the-badge&logoColor=black" alt="Downloads">
  <img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FAshtonLG3%2FMusixmatch-In-Editor-Lyrics-Formatter%2Fmain%2FMxM-Formatter.meta.js&query=%24.version&label=Latest&color=0e4f7a&style=for-the-badge" alt="Auto Version">

  <br><br>

  <p align="center">
    <b>Turbo-charge your Musixmatch Studio workflow.</b><br>
    The formatter cleans, normalises, and standardises English lyrics to comply with community guidelines in one keystroke.
  </p>

  <a href="https://github.com/AshtonLG3/Musixmatch-In-Editor-Lyrics-Formatter/raw/main/MxM-Formatter.user.js">
    <img src="https://img.shields.io/badge/INSTALL_SCRIPT-d4af37?style=for-the-badge&logo=tampermonkey&logoColor=black" height="45">
  </a>
</div>

---

## Features
* ✅ Instantly formats lyrics inside **Musixmatch Studio** (including the beta environment)
* ✅ Harmonises capitalisation, punctuation, spacing, and section tags
* ✅ Normalises dialogue, interjections, and bracketed sections
* ✅ Handles backing vocal grouping and common contraction edge-cases
* ✅ Converts numbers intelligently while respecting dates and timestamps
* ✅ Offers both a floating **Format MxM** button and the **Alt + M** keyboard shortcut

## Installation

> **One-click setup:** [Install Tampermonkey *and* the formatter in one step](https://www.tampermonkey.net/?ext=dhdg&downloadURL=https://raw.githubusercontent.com/AshtonLG3/Musixmatch-In-Editor-Lyrics-Formatter/main/MxM-Formatter.user.js). The Tampermonkey site will guide you through adding the extension (if needed) and then import the userscript automatically.

1.  **Install a userscript manager** (choose one):
    * [Tampermonkey](https://tampermonkey.net/)
    * [Violentmonkey](https://violentmonkey.github.io/)
2.  **Install the formatter script:**
    * 👉 [Click here to install or update](https://github.com/AshtonLG3/Musixmatch-In-Editor-Lyrics-Formatter/raw/main/MxM-Formatter.user.js)
3.  Tampermonkey/Violentmonkey will track new releases automatically using the accompanying `.meta.js` manifest.

> **Updating:** when a new release is published, the userscript manager prompts you to accept the update. No manual download is required.

---

## Usage
* Open any lyric sheet in Musixmatch Studio.
* Click inside the editable lyrics area once.
* Either press **Alt + M** *or* click the floating **Format MxM** button in the bottom-right corner.
* A toast confirmation (e.g. `Formatted ✓ (v1.1.85)`) appears once the text has been cleaned.

If nothing happens, make sure the lyrics textarea still has focus. The formatter will display an alert if it cannot find an active editor field.

---

## What gets formatted?
The script exposes a `formatLyrics` function that performs dozens of targeted clean-up rules, including:

* **Whitespace and punctuation** – trims trailing spaces, collapses blank lines, and removes stray punctuation at line endings.
* **Section tags** – transforms `[Verse 1]`-style markers into canonical `#VERSE`, `#CHORUS`, `#BRIDGE`, etc.
* **Contractions & slang** – standardises entries such as `cuz → 'cause`, `imma → I'ma`, and fixes mixed-case `'til` usage.
* **Interjections & dialogue** – inserts missing commas after `Oh`, `Yeah`, `Whoa`, etc. when they introduce a line.
* **Parentheses** – ensures appropriate spacing around opening and closing brackets.
* **Number treatment** – converts numerals `0–10` to words unless the line contains times, dates, or decades. When the optional *aggressive numbers* flag is enabled (stored in `localStorage` under `mxmFmtSettings.v105`), words from eleven to ninety-nine will flip to numerals instead.

These transformations are safe to re-run—executing the formatter multiple times will not mangle already corrected text.

---

## Troubleshooting
* **The button covers interface elements** – drag the browser window wider or zoom out slightly. The button automatically anchors 32 px from the bottom-right corner and should stay clear of Studio controls.
* **No toast appears** – ensure you have focus inside a Musixmatch lyric field. The script only acts on the active editable element.
* **Conflicting shortcuts** – if another tool uses Alt + M, rely on the floating button instead. Shortcut customisation is planned for a future update.

---

## Development
* The userscript is written in vanilla JavaScript and exports `formatLyrics` for use in Node-based tests or other tooling.
* Version information lives in both `MxM-Formatter.user.js` and `MxM-Formatter.meta.js`. Update them together before releasing.
* After editing the script, run your preferred lint/tests (for example `node` scripts) and bump the `@version` header prior to publishing a new release.

---

## Authors
* **Richard Mangezi Muketa**

---

## License
Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International.

You are free to share and adapt the formatter with appropriate attribution, but commercial use is prohibited and derivative works must remain under the same license. Read the full text at [https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode](https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode).
