(function (root) {
  const prefixes = Object.freeze({
    caseInsensitive: Object.freeze([
      "BBC",
      "SABC",
      "ZBC Radio",
      "Angry Birds",
      "Highway",
      "Route",
      "Interstate",
      "Channel",
      "Far Cry",
      "Borderlands",
      "Resident Evil",
    ]),
    caseSensitive: Object.freeze([
      "Golf",
    ]),
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = prefixes;
  }

  if (root && !root.MXM_NUMBERED_TITLE_PREFIXES) {
    root.MXM_NUMBERED_TITLE_PREFIXES = prefixes;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
