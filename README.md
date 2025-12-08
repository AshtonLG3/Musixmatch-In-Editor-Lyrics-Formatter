<div align="center" dir="auto">
  <a target="_blank" rel="noopener noreferrer" href="https://github.com/AshtonLG3/Musixmatch-In-Editor-Lyrics-Formatter/blob/main/img/banner.png">
    <img src="https://github.com/AshtonLG3/Musixmatch-In-Editor-Lyrics-Formatter/raw/main/img/banner.png" width="100%" alt="Musixmatch In-Editor Formatter Banner" style="max-width: 100%;">
  </a>
  <br>

  <a target="_blank" rel="noopener noreferrer nofollow" href="https://github.com/AshtonLG3/Musixmatch-In-Editor-Lyrics-Formatter/blob/main/package.json">
    <img src="https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/AshtonLG3/Musixmatch-In-Editor-Lyrics-Formatter/main/package.json&query=$.version&label=Version&style=for-the-badge&logo=tampermonkey&logoColor=white&color=0e4f7a" alt="Version 1.1.86">
  </a>

  <a target="_blank" rel="noopener noreferrer nofollow" href="#">
    <img src="https://img.shields.io/badge/downloads-98-d4af37?style=for-the-badge&logoColor=black" alt="Downloads" style="max-width: 100%;">
  </a>

  <a target="_blank" rel="noopener noreferrer nofollow" href="https://github.com/AshtonLG3/Musixmatch-In-Editor-Lyrics-Formatter/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-CC_BY--NC--SA_4.0-d4af37?style=for-the-badge&logo=creative-commons&logoColor=black" alt="License: CC BY-NC-SA 4.0">
  </a>

  <p dir="auto"><br><br></p>
  <p align="center" dir="auto">
    <b>Turbo-charge your Musixmatch Studio workflow.</b><br>
    The formatter cleans, normalises, and standardises English lyrics to comply with community guidelines in one keystroke.
  </p>
  <a href="https://github.com/AshtonLG3/Musixmatch-In-Editor-Lyrics-Formatter/raw/main/MxM-Formatter.user.js">
    <img src="https://img.shields.io/badge/INSTALL_SCRIPT-d4af37?style=for-the-badge&logo=tampermonkey&logoColor=black" height="45" style="max-width: 100%; height: auto; max-height: 45px;">
  </a>
</div>

## Overview

This userscript automates the formatting steps curators repeat inside Musixmatch Studio. It runs directly on `curators.musixmatch.com` and `curators-beta.musixmatch.com`, tidying up lyrics, enforcing consistent casing and punctuation, and preventing common mistakes before you submit edits.

## Key features

- **One-keystroke formatting**: Press `Alt` + `M` or use the floating "Format" button to normalise the active lyrics textarea.
- **Backing vocal safety**: Recognises standalone parenthetical backing vocal lines so they keep their original casing instead of being lower‑cased.
- **Rhythmic counts & times**: Spells out rhythm counts (e.g., `1 2 3 4` → `One Two Three Four`) and normalises time and o'clock expressions.
- **Language-aware rules**: Includes per-language tagging and casing helpers for English, Russian, Spanish, Portuguese, French, Italian, and Greek.

## Installation

1. Install a userscript manager such as [Tampermonkey](https://www.tampermonkey.net/).
2. Click the **Install Script** badge above or [download the userscript directly](https://github.com/AshtonLG3/Musixmatch-In-Editor-Lyrics-Formatter/raw/main/MxM-Formatter.user.js).
3. Approve the installation in your userscript manager.

## Usage

1. Open a lyrics editing page in Musixmatch Studio (`mode=edit`).
2. Place your cursor inside the lyrics textarea.
3. Press `Alt` + `M` to format the lyrics or click the floating **Format** button.
4. Review the formatted text; use the revert control in the floating toolbar to undo if needed.

## Development

- The formatter logic lives in [`MxM-Formatter.user.js`](./MxM-Formatter.user.js), which exports a reusable `formatLyrics` function.
- Version consistency between the userscript header, metadata file, and internal constant is enforced by the test suite.

### Running tests

Run the automated checks to validate version alignment and key formatting behaviours:

```bash
npm test
```

## License

This project is licensed under the [CC BY-NC-SA 4.0](./LICENSE).
