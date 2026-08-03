const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  '@': path.resolve(__dirname, 'src'),
};

// Ensure .wasm is only in assetExts (not sourceExts) so Metro can resolve it as a binary asset
// This is required for expo-sqlite web support (wa-sqlite.wasm)
const sourceExts = config.resolver.sourceExts || [];
config.resolver.sourceExts = sourceExts.filter((ext) => ext !== 'wasm');

const assetExts = config.resolver.assetExts || [];
if (!assetExts.includes('wasm')) {
  config.resolver.assetExts = [...assetExts, 'wasm'];
}

// Watch the src directory
config.watchFolders = [path.resolve(__dirname, 'src')];

module.exports = config;
