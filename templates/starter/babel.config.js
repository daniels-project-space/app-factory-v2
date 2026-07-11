module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // zustand v5 ships ESM that references `import.meta`; Metro's web
          // bundle is a classic script, so transform it away at build time.
          unstable_transformImportMeta: true,
        },
      ],
    ],
  };
};
