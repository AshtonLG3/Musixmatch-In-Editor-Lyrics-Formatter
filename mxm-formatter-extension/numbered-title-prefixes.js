(function (root) {
  const prefixes = Object.freeze([
    "BBC",
    "SABC",
    "Angry Birds",
    "Highway",
    "Far Cry",
    "Borderlands",
    "Resident Evil",
  ]);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = prefixes;
  }

  if (root && !root.MXM_NUMBERED_TITLE_PREFIXES) {
    root.MXM_NUMBERED_TITLE_PREFIXES = prefixes;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
