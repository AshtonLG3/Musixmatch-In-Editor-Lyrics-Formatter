import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        chrome: "readonly",
        module: "writable",
        require: "readonly",
        __dirname: "readonly",
      },
      env: {
        node: true,
        browser: true,
      },
    },
    rules: {
      "no-useless-escape": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];
