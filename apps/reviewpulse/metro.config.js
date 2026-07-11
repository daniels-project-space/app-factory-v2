const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Force zustand to use CJS (react-native condition) instead of ESM on web.
// Zustand's ESM files contain `import.meta.env` which is invalid in classic
// scripts and causes "Cannot use 'import.meta' outside a module" in Chromium,
// preventing the app from loading entirely.
const defaultResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
    // Use the react-native (CJS) entrypoint regardless of platform
    const result = defaultResolver
      ? defaultResolver(context, moduleName, platform)
      : context.resolveRequest(context, moduleName, platform);
    // If Metro resolved to an ESM file (.mjs), redirect to the CJS equivalent
    if (result && result.filePath && result.filePath.endsWith('.mjs')) {
      const cjsPath = result.filePath.replace('/esm/', '/').replace('.mjs', '.js');
      const fs = require('fs');
      if (fs.existsSync(cjsPath)) {
        return { ...result, filePath: cjsPath };
      }
    }
    return result;
  }
  if (defaultResolver) return defaultResolver(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
