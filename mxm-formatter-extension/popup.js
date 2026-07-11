const langSel = document.getElementById('lang');
const lowerChk = document.getElementById('autoLower');
const bvChk = document.getElementById('fixBV');
const btnChk = document.getElementById('showButton');
const themeSel = document.getElementById('theme');
const formatBtn = document.getElementById('formatBtn');
const versionLabel = document.getElementById('versionLabel');

function normalizeTheme(value) {
  return value === 'light' ? 'light' : 'dark';
}

function applyTheme(value) {
  const theme = normalizeTheme(value);
  document.body.dataset.theme = theme;
  themeSel.value = theme;
}

if (versionLabel) {
  const version = chrome.runtime.getManifest()?.version || '';
  versionLabel.textContent = version ? `v${version}` : '';
}

chrome.storage.sync.get(['mxmLang', 'mxmLower', 'mxmBV', 'mxmButton', 'mxmTheme'], (data) => {
  langSel.value = data.mxmLang || 'EN';
  lowerChk.checked = data.mxmLower || false;
  bvChk.checked = data.mxmBV ?? true;
  btnChk.checked = data.mxmButton ?? true;
  applyTheme(data.mxmTheme || 'dark');
});

function saveSettings() {
  const theme = normalizeTheme(themeSel.value);
  chrome.storage.sync.set({
    mxmLang: langSel.value,
    mxmLower: lowerChk.checked,
    mxmBV: bvChk.checked,
    mxmButton: btnChk.checked,
    mxmTheme: theme
  });
  applyTheme(theme);
}

langSel.onchange = lowerChk.onchange = bvChk.onchange = btnChk.onchange = themeSel.onchange = saveSettings;

formatBtn.onclick = () => {
  saveSettings();
  const options = {
    lang: langSel.value,
    autoLowercase: lowerChk.checked,
    fixBackingVocals: bvChk.checked,
    showFloatingButton: btnChk.checked
  };

  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const [tab] = tabs || [];
    if (!tab?.id) return;
    chrome.scripting.executeScript({
      target: {tabId: tab.id},
      func: (opts) => {
        if (typeof runFormat === 'function') runFormat(opts);
        else alert('Formatter not loaded yet on this page.');
      },
      args: [options]
    });
  });
};
