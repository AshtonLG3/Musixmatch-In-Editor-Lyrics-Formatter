# 🎵 Musixmatch In-Editor Lyrics Formatter (EN)

> A powerful userscript for Musixmatch editors and curators that instantly cleans, formats, and standardizes English lyrics to meet community style guidelines.  
> Format an entire song with a single keystroke or click!

---

### 🚀 Features

- ✅ Auto-formats lyrics directly in **Musixmatch Studio**
- ✅ Enforces capitalization, punctuation, and stylistic rules
- ✅ Auto-handles tags (`#VERSE`, `#CHORUS`, etc.)
- ✅ Smart comma and spacing normalization
- ✅ Backing vocal grouping logic
- ✅ Version sync automation between `.user.js` and `.meta.js`

---

### 🧠 How It Works

This userscript injects into:
https://curators.musixmatch.com/*
https://curators-beta.musixmatch.com/*

It standardizes all lyrics to Musixmatch guidelines as you edit.  
Headers are synchronized automatically across both script files when committing updates.

---

### 🛠 Installation

1. Install a userscript manager:  
   - [Tampermonkey](https://tampermonkey.net/) or  
   - [Violentmonkey](https://violentmonkey.github.io/)

2. Click below to install or update automatically:  
   👉 [**Install Formatter Script**](https://github.com/AshtonLG3/Musixmatch-In-Editor-Lyrics-Formatter/raw/main/MxM-Formatter.user.js)

3. Tampermonkey will automatically check for updates using the `.meta.js` manifest.

---

### 🧩 Developer Automation

Each commit automatically:
- 🧾 Syncs version headers between `.meta.js` and `.user.js`
- 🏷 Tags the commit (e.g., `v1.1.6`)
- 🚀 Publishes a GitHub Release with the commit message as the changelog
- 📦 Optionally attaches `.user.js` as a downloadable release asset (next step below 👇)

---

### 🧑‍💻 Authors

- **Vincas Stepankevičius**
- **Richard Mangezi Muketa**

---

### 🪪 License

MIT License — Free to use, modify, and share.
