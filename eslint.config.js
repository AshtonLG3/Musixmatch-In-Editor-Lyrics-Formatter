import globals from "globals";

export default [
  {
    files: ["**/*.js"], // Apply to all JavaScript files

    languageOptions: {
      ecmaVersion: 2021, // Modern JS features
      sourceType: "module", // For ES modules
      globals: {
        ...globals.browser, // Replaces env.browser
        ...globals.node, // Replaces env.node
        chrome: "readonly", // Chrome Extension APIs
        browser: "readonly", // Firefox Extension APIs
        runFormat: "readonly", // Custom global for popup.js
      },
    },

    rules: {
      // Ignore unused vars starting with _
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],

      // Allow regex with extra escapes (intentional)
      "no-useless-escape": "off",

      // Disable misleading character class check
      "no-misleading-character-class": "off",

      // Optional: soften undefined globals (since we define them manually)
      "no-undef": "off",
    },
  },
];
