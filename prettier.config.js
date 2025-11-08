/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
  trailingComma: 'all',
  tabWidth: 2,
  printWidth: 100,
  semi: true,
  singleQuote: true,
  bracketSpacing: true,
  quoteProps: 'consistent',
  overrides: [
    {
      files: ['*.html'],
      options: {
        parser: 'html',
        bracketSameLine: false,
        singleQuote: false,
        singleAttributePerLine: false,
      },
    },
  ],
};

export default config;
