// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Build-time Node scripts use Node globals such as `Buffer`.
    files: ["scripts/**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: { Buffer: "readonly", console: "readonly", process: "readonly", __dirname: "readonly" },
    },
  },
]);
