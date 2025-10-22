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
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: () => {
        if (typeof runFormat === 'function') runFormat();
        else alert('Formatter not loaded yet on this page.');
      }
    });
  });
};
