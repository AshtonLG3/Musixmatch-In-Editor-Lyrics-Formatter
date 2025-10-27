// eslint.config.js
import globals from "globals";

export default [
  {
    files: ["**/*.js"],

    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        chrome: "readonly",
        browser: "readonly",
        runFormat: "readonly",
      },
    },

    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-useless-escape": "off",
      "no-misleading-character-class": "off",
      "no-undef": "off",
    },
  },
];
