// .eslintrc.js
module.exports = {
  env: {
    browser: true,         // Enables 'window', 'document', etc.
    node: true,            // Enables 'require', 'module', etc.
    webextensions: true,   // Enables 'chrome' and browser extension APIs
    es2021: true           // Modern JS features
  },
  globals: {
    runFormat: "readonly", // Fixes 'runFormat' undefined error in popup.js
  },
  rules: {
    // Allow underscores for unused arguments
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    // Disable unnecessary escape warnings (we use regex heavily)
    "no-useless-escape": "off",
    // Ignore misleading character class warnings (not relevant here)
    "no-misleading-character-class": "off",
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
};
