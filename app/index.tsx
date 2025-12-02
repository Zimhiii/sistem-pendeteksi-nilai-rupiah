import useRupiahModel from "@/hooks/RupiahModels";
import { praprosesGambar } from "@/utils/imageProcessing";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  StatusBar,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";

export default function Index() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState("");
  const [tapCount, setTapCount] = useState(0);
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [hasSpokenWelcome, setHasSpokenWelcome] = useState(false);
  const [scanningPulse, setScanningPulse] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const tapTimer = useRef<number | null>(null);

  // Model ML hook
  const { modelState, predict, isLoading } = useRupiahModel();

  // Auto-grant camera permission dan welcome message
  useEffect(() => {
    const initializeApp = async () => {
      // Auto request permission
      if (!permission?.granted) {
        await requestPermission();
      }

      // Welcome TTS setelah permission granted dan model ready
      if (permission?.granted && !hasSpokenWelcome && modelState.isReady) {
        setTimeout(() => {
          Speech.speak(
            "Selamat datang di SIMPENPAH, Sistem Pendeteksi Nilai Rupiah. Ketuk dua kali di layar untuk memindai uang.",
            {
              language: "id-ID",
              pitch: 1.0,
              rate: 0.8,
            }
          );
          setHasSpokenWelcome(true);
        }, 1000);
      }
    };

    initializeApp();
  }, [permission?.granted, hasSpokenWelcome, modelState.isReady]);

  // Scanning pulse animation
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isScanning) {
      interval = setInterval(() => {
        setScanningPulse((prev) => !prev);
      }, 600);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isScanning]);

  // Double-tap detection
  const handleScreenTap = () => {
    if (isScanning) return;

    setTapCount((prev) => prev + 1);
    Vibration.vibrate(50);

    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
    }

    tapTimer.current = setTimeout(() => {
      if (tapCount === 1) {
        // Double tap detected
        startScanning();
      }
      setTapCount(0);
    }, 300);
  };

  const startScanning = async () => {
    if (!modelState.isReady) {
      Speech.speak("Model AI belum siap. Mohon tunggu sebentar.", {
        language: "id-ID",
      });
      return;
    }

    setIsScanning(true);
    setScanResult("Memindai uang...");

    Speech.speak(
      "Memulai pemindaian uang. Pastikan uang berada di dalam area pemindaian.",
      {
        language: "id-ID",
        pitch: 1.0,
        rate: 0.9,
      }
    );

    Vibration.vibrate([100, 50, 100]);

    setTimeout(async () => {
      if (cameraRef.current) {
        try {
          setScanResult("Mengambil foto...");

          const photo = await cameraRef.current.takePictureAsync({
            base64: true,
            quality: 0.8,
          });

          if (!photo || !photo.base64) {
            throw new Error("Gagal mengambil foto");
          }

          setScanResult("Memproses gambar...");
          await praprosesGambar(photo.base64);

          setScanResult("Menganalisis dengan AI...");
          const hasilPrediksi = await predict(photo.base64);

          setScanResult(`Terdeteksi: ${hasilPrediksi.label}`);

          // Success announcement
          Speech.speak(
            `Pemindaian berhasil. Nilai uang yang terdeteksi adalah ${hasilPrediksi.label} dengan akurasi ${hasilPrediksi.confidence} persen`,
            {
              language: "id-ID",
              pitch: 1.0,
              rate: 0.8,
            }
          );

          // Navigate to result
          router.push({
            pathname: "/result",
            params: {
              success: "true",
              amount: hasilPrediksi.value.toString(),
              accuracy: hasilPrediksi.confidence.toString(),
              label: hasilPrediksi.label,
            },
          });

          Vibration.vibrate([200, 100, 200, 100, 200]);
        } catch (error) {
          console.error("Scanning error:", error);
          setScanResult("Gagal memindai uang");

          Speech.speak(
            "Pemindaian gagal. Silakan coba lagi dengan menekan dua kali di layar.",
            {
              language: "id-ID",
              pitch: 1.0,
              rate: 1.0,
            }
          );

          Vibration.vibrate([500, 200, 500]);

          setTimeout(() => {
            setScanResult("");
          }, 4000);
        }
      }

      setIsScanning(false);
      setScanningPulse(false);
    }, 800);
  };

  return (
    <SafeAreaView className="flex-1 bg-blue-900">
      <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />

      <TouchableOpacity
        className="flex-1"
        onPress={handleScreenTap}
        activeOpacity={1}
        accessible={true}
        accessibilityLabel="Layar pemindaian SIMPENPAH"
        accessibilityHint="Ketuk dua kali di mana saja untuk memulai pemindaian uang"
      >
        {/* Camera View */}
        {permission?.granted && (
          <CameraView ref={cameraRef} className="flex-1" facing={facing} />
        )}

        {/* Professional Overlay */}
        <View className="absolute inset-0 pointer-events-none">
          {/* Header */}
          <View className="bg-blue-900/95 pt-16 pb-6 px-6">
            <View className="flex-row items-center justify-center">
              <View className="bg-white rounded-full p-3 mr-4">
                <Text className="text-blue-600 text-3xl">💰</Text>
              </View>
              <View>
                <Text className="text-white text-3xl font-bold">SIMPENPAH</Text>
                <Text className="text-blue-200 text-sm font-medium">
                  Sistem Pendeteksi Nilai Rupiah
                </Text>
              </View>
            </View>

            {/* Status Model */}
            <View className="mt-4 items-center">
              <View
                className={`px-4 py-2 rounded-full ${
                  isLoading
                    ? "bg-yellow-500"
                    : modelState.isReady
                      ? "bg-green-500"
                      : "bg-red-500"
                }`}
              >
                <Text className="text-white text-xs font-bold">
                  {isLoading
                    ? "⏳ MEMUAT MODEL"
                    : modelState.isReady
                      ? "✓ MODEL SIAP"
                      : "✗ MODEL ERROR"}
                </Text>
              </View>
            </View>
          </View>

          {/* Scanning Area */}
          <View className="flex-1 justify-center items-center px-8">
            {/* Scanning Frame */}
            <View className="relative">
              <View
                className={`w-80 h-56 border-4 rounded-3xl relative ${
                  isScanning
                    ? scanningPulse
                      ? "border-blue-300"
                      : "border-blue-500"
                    : "border-white/80"
                }`}
                style={{ borderStyle: "dashed" }}
              >
                {/* Corner Indicators */}
                <View className="absolute -top-3 -left-3 w-10 h-10 border-l-4 border-t-4 border-blue-400 rounded-tl-xl" />
                <View className="absolute -top-3 -right-3 w-10 h-10 border-r-4 border-t-4 border-blue-400 rounded-tr-xl" />
                <View className="absolute -bottom-3 -left-3 w-10 h-10 border-l-4 border-b-4 border-blue-400 rounded-bl-xl" />
                <View className="absolute -bottom-3 -right-3 w-10 h-10 border-r-4 border-b-4 border-blue-400 rounded-br-xl" />

                {/* Instructions */}
                <View className="flex-1 justify-center items-center p-6">
                  <View className="bg-black/20 rounded-2xl p-4">
                    <Text className="text-white text-xl font-bold text-center mb-3">
                      📄 Letakkan uang di sini
                    </Text>
                    <Text className="text-blue-100 text-base text-center font-medium">
                      Ketuk 2× layar untuk memindai
                    </Text>
                  </View>
                </View>

                {/* Scanning Animation */}
                {isScanning && (
                  <View
                    className={`absolute inset-0 rounded-3xl ${
                      scanningPulse ? "bg-blue-400/40" : "bg-blue-500/20"
                    }`}
                  />
                )}
              </View>

              {/* Scanning Line */}
              {isScanning && (
                <View className="absolute inset-0 justify-center items-center">
                  <View
                    className={`w-72 h-1 rounded-full shadow-lg ${
                      scanningPulse ? "bg-blue-300" : "bg-blue-500"
                    }`}
                  />
                </View>
              )}
            </View>

            {/* Status Display */}
            {scanResult && (
              <View className="mt-8 bg-white/96 rounded-2xl px-8 py-6 mx-4 shadow-xl">
                <View className="flex-row items-center justify-center">
                  {isScanning && (
                    <View className="mr-4">
                      <View className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </View>
                  )}
                  <Text
                    className={`text-center font-bold text-lg ${
                      isScanning ? "text-blue-600" : "text-green-700"
                    }`}
                  >
                    {scanResult}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Footer */}
          <View className="bg-blue-900/95 px-6 py-6">
            <View className="bg-blue-800/60 rounded-2xl p-6">
              <Text className="text-white text-center text-xl font-bold mb-3">
                👆 Ketuk 2× untuk Memindai
              </Text>
              <Text className="text-blue-200 text-sm text-center font-medium">
                Aplikasi aksesibilitas untuk identifikasi mata uang rupiah
              </Text>

              {/* Ready Indicator */}
              <View className="mt-3 flex-row items-center justify-center">
                <View
                  className={`w-3 h-3 rounded-full mr-2 ${
                    modelState.isReady ? "bg-green-400" : "bg-red-400"
                  }`}
                />
                <Text className="text-blue-100 text-xs">
                  {modelState.isReady ? "SIAP MEMINDAI" : "MENUNGGU MODEL"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
