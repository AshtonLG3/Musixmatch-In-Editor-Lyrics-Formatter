# 🎵 Musixmatch In-Editor Lyrics Formatter

> Turbo-charge your Musixmatch Studio workflow with one keystroke. The formatter cleans, normalises, and standardises English lyrics so they comply with the community guidelines before you hit **Submit**.

![Floating “Format MxM” button inside Musixmatch Studio](img/formatter-ui.png)

---

## Table of contents
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [What gets formatted?](#what-gets-formatted)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Authors](#authors)
- [License](#license)

---

## Features
- ✅ Instantly formats lyrics inside **Musixmatch Studio** (including the beta environment)
- ✅ Harmonises capitalisation, punctuation, spacing, and section tags
- ✅ Normalises dialogue, interjections, and bracketed sections
- ✅ Handles backing vocal grouping and common contraction edge-cases
- ✅ Converts numbers intelligently while respecting dates and timestamps
- ✅ Offers both a floating **Format MxM** button and the **Alt&nbsp;+&nbsp;M** keyboard shortcut

---

## Installation
1. **Install a userscript manager** (choose one):
   - [Tampermonkey](https://tampermonkey.net/)
   - [Violentmonkey](https://violentmonkey.github.io/)
2. **Install the formatter script:**
   - 👉 [Click here to install or update](https://github.com/AshtonLG3/Musixmatch-In-Editor-Lyrics-Formatter/raw/main/MxM-Formatter.user.js)
3. Tampermonkey/Violentmonkey will track new releases automatically using the accompanying `.meta.js` manifest.

> **Updating:** when a new release is published, the userscript manager prompts you to accept the update. No manual download is required.

---

## Usage
- Open any lyric sheet in Musixmatch Studio.
- Click inside the editable lyrics area once.
- Either press **Alt&nbsp;+&nbsp;M** *or* click the floating **Format MxM** button in the bottom-right corner.
- A toast confirmation (e.g. `Formatted ✓ (v1.1.6)`) appears once the text has been cleaned.

If nothing happens, make sure the lyrics textarea still has focus. The formatter will display an alert if it cannot find an active editor field.

---

## What gets formatted?
The script exposes a `formatLyrics` function that performs dozens of targeted clean-up rules, including:

- **Whitespace and punctuation** – trims trailing spaces, collapses blank lines, and removes stray punctuation at line endings.
- **Section tags** – transforms `[Verse 1]`-style markers into canonical `#VERSE`, `#CHORUS`, `#BRIDGE`, etc.
- **Contractions & slang** – standardises entries such as `cuz → 'cause`, `imma → I'ma`, and fixes mixed-case `'til` usage.
- **Interjections & dialogue** – inserts missing commas after `Oh`, `Yeah`, `Whoa`, etc. when they introduce a line.
- **Parentheses** – ensures appropriate spacing around opening and closing brackets.
- **Number treatment** – converts numerals `0–10` to words unless the line contains times, dates, or decades. When the optional *aggressive numbers* flag is enabled (stored in `localStorage` under `mxmFmtSettings.v105`), words from eleven to ninety-nine will flip to numerals instead.

These transformations are safe to re-run—executing the formatter multiple times will not mangle already corrected text.

---

## Troubleshooting
- **The button covers interface elements** – drag the browser window wider or zoom out slightly. The button automatically anchors 32&nbsp;px from the bottom-right corner and should stay clear of Studio controls.
- **No toast appears** – ensure you have focus inside a Musixmatch lyric field. The script only acts on the active editable element.
- **Conflicting shortcuts** – if another tool uses Alt&nbsp;+&nbsp;M, rely on the floating button instead. Shortcut customisation is planned for a future update.

---

## Development
- The userscript is written in vanilla JavaScript and exports `formatLyrics` for use in Node-based tests or other tooling.
- Version information lives in both `MxM-Formatter.user.js` and `MxM-Formatter.meta.js`. Update them together before releasing.
- After editing the script, run your preferred lint/tests (for example `node` scripts) and bump the `@version` header prior to publishing a new release.

---

## Authors
- **Vincas Stepankevičius**
- **Richard Mangezi Muketa**

---

## License
Released under the MIT License — free to use, modify, and share.
