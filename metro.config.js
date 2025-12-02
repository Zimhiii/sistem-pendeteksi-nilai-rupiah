const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// --- TAMBAHKAN BARIS INI ---
// Memberi tahu Metro Bundler bahwa file .onnx adalah aset (seperti gambar/font)
// dan bukan kode program yang harus dibaca.
config.resolver.assetExts.push("onnx");
// ---------------------------

module.exports = withNativeWind(config, { input: "./global.css" });
