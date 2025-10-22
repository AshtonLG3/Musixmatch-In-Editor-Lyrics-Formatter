const langSel = document.getElementById('lang');
const lowerChk = document.getElementById('autoLower');
const bvChk = document.getElementById('fixBV');
const btnChk = document.getElementById('showButton');
const formatBtn = document.getElementById('formatBtn');

chrome.storage.sync.get(['mxmLang', 'mxmLower', 'mxmBV', 'mxmButton'], (data) => {
  langSel.value = data.mxmLang || 'EN';
  lowerChk.checked = data.mxmLower || false;
  bvChk.checked = data.mxmBV ?? true;
  btnChk.checked = data.mxmButton || false;
});

function saveSettings() {
  chrome.storage.sync.set({
    mxmLang: langSel.value,
    mxmLower: lowerChk.checked,
    mxmBV: bvChk.checked,
    mxmButton: btnChk.checked
  });
}

langSel.onchange = lowerChk.onchange = bvChk.onchange = btnChk.onchange = saveSettings;

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
