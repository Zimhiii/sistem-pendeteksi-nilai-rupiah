import { useRupiahAPI } from "@/hooks/useRupiah";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import {
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Index = () => {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState("");
  const [tapCount, setTapCount] = useState(0);
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [hasSpokenWelcome, setHasSpokenWelcome] = useState(false);
  const [scanningPulse, setScanningPulse] = useState(false);

  // ✅ FORCE CAMERA RENDER STATE
  const [forceCameraRender, setForceCameraRender] = useState(false);

  // ✅ DEBUG STATE
  const [debugInfo, setDebugInfo] = useState({
    permissionStatus: null as string | null,
    permissionGranted: false,
    apiReady: true, // FastAPI is always "ready" (no loading like ONNX)
    platform: Platform.OS,
    initComplete: false,
    cameraRendered: false,
  });

  const cameraRef = useRef<CameraView>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ NEW: FastAPI Hook instead of ONNX
  const {
    predict,
    isLoading: apiLoading,
    error: apiError,
    API_URL,
  } = useRupiahAPI();

  // ✅ FORCE CAMERA RENDER when permission granted
  useEffect(() => {
    if (permission?.granted) {
      console.log("🎯 Permission granted, forcing camera render...");
      setForceCameraRender(true);

      // Update debug info
      setDebugInfo((prev) => ({
        ...prev,
        cameraRendered: true,
        permissionGranted: true,
        permissionStatus: permission.status,
      }));
    } else {
      setForceCameraRender(false);
      setDebugInfo((prev) => ({
        ...prev,
        cameraRendered: false,
        permissionGranted: false,
        permissionStatus: permission?.status || null,
      }));
    }
  }, [permission?.granted, permission?.status]);

  // ✅ INITIALIZATION
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log("🚀 Initializing SIMPENPAH app with FastAPI backend...");
        console.log("📱 Platform:", Platform.OS);
        console.log("🌐 API URL:", API_URL);
        console.log("🔍 Initial permission:", permission);

        // ✅ AUTO REQUEST PERMISSION
        if (!permission) {
          console.log("⏳ Permission object null, waiting...");
          return;
        }

        if (!permission.granted) {
          console.log("📷 Requesting camera permission...");
          const result = await requestPermission();
          console.log("✅ Permission result:", result);
        } else {
          console.log("✅ Camera permission already granted");
        }

        // ✅ UPDATE DEBUG INFO
        setDebugInfo((prev) => ({
          ...prev,
          permissionStatus: permission.status,
          permissionGranted: permission.granted,
          apiReady: true, // FastAPI doesn't need loading
          initComplete: true,
        }));

        // ✅ WELCOME TTS (simplified - no model loading wait)
        if (permission.granted && !hasSpokenWelcome) {
          console.log("🔊 Speaking welcome message...");
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
      } catch (error) {
        console.error("❌ Initialization error:", error);
      }
    };

    initializeApp();
  }, [permission, hasSpokenWelcome]);

  // ✅ DEBUG: Monitor state changes
  useEffect(() => {
    console.log("🔍 State Update:", {
      permission: permission?.status,
      granted: permission?.granted,
      apiLoading,
      apiError,
      forceCameraRender,
    });

    setDebugInfo((prev) => ({
      ...prev,
      permissionStatus: permission?.status || null,
      permissionGranted: permission?.granted || false,
      apiReady: !apiLoading && !apiError, // API ready if not loading and no error
    }));
  }, [permission, apiLoading, apiError, forceCameraRender]);

  // ✅ MANUAL PERMISSION REQUEST (untuk debugging)
  const handleManualPermission = async () => {
    try {
      console.log("🎯 Manual permission request...");
      const result = await requestPermission();
      console.log("📷 Manual permission result:", result);
    } catch (error) {
      console.error("❌ Manual permission error:", error);
    }
  };

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

    setTapCount((prev) => {
      const newCount = prev + 1;

      if (tapTimer.current) {
        clearTimeout(tapTimer.current);
      }

      tapTimer.current = setTimeout(() => {
        if (newCount >= 2) {
          startScanning();
        }
        setTapCount(0);
      }, 300);

      return newCount;
    });

    Vibration.vibrate(50);
  };

  // ✅ UPDATED startScanning dengan FastAPI backend
  // ✅ ENHANCED startScanning untuk accessibility tunanetra
  // ✅ UPDATED startScanning - Langsung navigate tanpa putar hasil di index
  const startScanning = async () => {
    if (!permission?.granted) {
      Speech.speak(
        "Akses kamera belum diizinkan. Silakan berikan izin terlebih dahulu.",
        { language: "id-ID" }
      );
      return;
    }

    if (apiError) {
      Speech.speak(
        "Server backend tidak dapat diakses. Periksa koneksi internet dan server.",
        { language: "id-ID" }
      );
      return;
    }

    setIsScanning(true);
    setScanResult("Memindai uang...");

    // ✅ TTS - Simple instruction saja
    Speech.speak(
      "Memulai pemindaian uang. Pastikan uang berada di area tengah layar.",
      {
        language: "id-ID",
        pitch: 1.0,
        rate: 0.8,
      }
    );

    Vibration.vibrate([200, 100, 200]);

    setTimeout(async () => {
      if (cameraRef.current) {
        try {
          // ✅ STEP 1: Capture photo
          setScanResult("Mengambil foto...");
          Speech.speak("Mengambil foto", { language: "id-ID", rate: 1.2 });
          Vibration.vibrate(100);

          const photo = await cameraRef.current.takePictureAsync({
            base64: false,
            quality: 0.9,
            skipProcessing: false,
          });

          if (!photo || !photo.uri) {
            throw new Error("Gagal mengambil foto");
          }

          console.log("📸 Photo captured:", {
            uri: photo.uri,
            width: photo.width,
            height: photo.height,
          });

          // ✅ STEP 2: Process image
          setScanResult("Memproses gambar...");
          Speech.speak("Memproses gambar", { language: "id-ID", rate: 1.2 });
          Vibration.vibrate([50, 50, 50]);

          const { manipulateAsync, SaveFormat } =
            await import("expo-image-manipulator");

          const processedImage = await manipulateAsync(
            photo.uri,
            [{ resize: { width: 224, height: 224 } }],
            { compress: 0.8, format: SaveFormat.JPEG }
          );

          console.log("✅ Image resized to 224x224:", processedImage.uri);

          // ✅ STEP 3: Upload to API
          setScanResult("Mengunggah ke server...");
          Speech.speak("Mengirim ke server", { language: "id-ID", rate: 1.2 });
          Vibration.vibrate([100, 100]);

          const hasilPrediksi = await predict(processedImage.uri);
          console.log("🎯 FastAPI response:", hasilPrediksi);

          if (!hasilPrediksi.success) {
            throw new Error("Server gagal memproses gambar");
          }

          // ✅ SUCCESS - Langsung navigate, biarkan result page yang handle TTS
          setScanResult("Berhasil! Menuju hasil...");

          // ✅ Simple success feedback, detail TTS nanti di result page
          Speech.speak("Pemindaian berhasil", {
            language: "id-ID",
            rate: 1.0,
          });

          Vibration.vibrate([200, 100, 200]);

          // ✅ NAVIGATE IMMEDIATELY - No delay needed
          router.push({
            pathname: "/result",
            params: {
              success: "true",
              label: hasilPrediksi.label,
              amount: hasilPrediksi.value.toString(),
              accuracy: hasilPrediksi.confidence.toString(),
            },
          });
        } catch (error) {
          console.error("❌ Scanning error:", error);
          setScanResult("Gagal memindai uang");

          // ✅ SIMPLE ERROR handling - biarkan user coba lagi
          let errorMessage =
            "Pemindaian gagal. Silakan coba lagi dengan mengetuk dua kali di layar.";

          if (error instanceof Error) {
            if (error.message.includes("Server responded")) {
              errorMessage =
                "Server mengalami masalah. Tunggu sebentar dan coba lagi.";
            } else if (
              error.message.includes("fetch") ||
              error.message.includes("Network")
            ) {
              errorMessage =
                "Tidak dapat terhubung ke server. Periksa koneksi internet.";
            } else if (error.message.includes("foto")) {
              errorMessage =
                "Gagal mengambil foto. Pastikan kamera tidak tertutup.";
            }
          }

          Speech.speak(errorMessage, {
            language: "id-ID",
            pitch: 0.9,
            rate: 0.8,
          });

          Vibration.vibrate([500, 200, 500]);

          // ✅ Clear result setelah beberapa detik
          setTimeout(() => {
            setScanResult("");
          }, 3000);
        }
      }

      setIsScanning(false);
      setScanningPulse(false);
    }, 1000);
  };

  // ✅ DETERMINE WHAT TO RENDER
  const shouldShowCamera = !!(permission?.granted && forceCameraRender);
  const shouldShowPermissionRequest = !shouldShowCamera;

  console.log("🎬 Render decision:", {
    permissionGranted: permission?.granted,
    forceCameraRender,
    shouldShowCamera,
    shouldShowPermissionRequest,
  });

  return (
    <SafeAreaView className="flex-1 bg-blue-900">
      <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />

      {/* ✅ DEBUG PANEL (uncomment untuk debugging) */}
      {__DEV__ && (
        <View className="absolute top-16 left-2 right-2 bg-black/90 rounded p-2 z-50">
          <Text className="text-white text-xs font-bold">🔍 DEBUG INFO:</Text>
          <Text className="text-white text-xs">
            Platform: {debugInfo.platform}
          </Text>
          <Text className="text-white text-xs">
            Permission Status: {debugInfo.permissionStatus || "null"}
          </Text>
          <Text className="text-white text-xs">
            Permission Granted: {debugInfo.permissionGranted.toString()}
          </Text>
          <Text className="text-white text-xs">
            Force Camera Render: {forceCameraRender.toString()}
          </Text>
          <Text className="text-white text-xs">
            Should Show Camera: {shouldShowCamera.toString()}
          </Text>
          <Text className="text-white text-xs">API URL: {API_URL}</Text>
          <Text className="text-white text-xs">
            API Loading: {apiLoading.toString()}
          </Text>
          <Text className="text-white text-xs">
            API Error: {apiError || "None"}
          </Text>

          {!permission?.granted && (
            <TouchableOpacity
              className="bg-red-600 rounded px-2 py-1 mt-1"
              onPress={handleManualPermission}
            >
              <Text className="text-white text-xs">🔓 Grant Permission</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            className="bg-green-600 rounded px-2 py-1 mt-1"
            onPress={() => {
              console.log("🔧 Forcing camera render toggle...");
              setForceCameraRender((prev) => !prev);
            }}
          >
            <Text className="text-white text-xs">
              🎬 Toggle Camera: {forceCameraRender ? "ON" : "OFF"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        className="flex-1"
        onPress={handleScreenTap}
        activeOpacity={1}
        accessible={true}
        accessibilityLabel="Layar pemindaian SIMPENPAH"
        accessibilityHint="Ketuk dua kali di mana saja untuk memulai pemindaian uang"
      >
        {/* ✅ SIMPLIFIED CAMERA RENDERING dengan forced state */}
        {shouldShowCamera ? (
          <View className="flex-1">
            <CameraView
              ref={cameraRef}
              className="flex-1"
              facing={facing}
              onCameraReady={() => {
                console.log("📷 Camera ready and visible!");
              }}
              style={{ flex: 1 }} // ✅ Add explicit style
            />
          </View>
        ) : (
          // ✅ PERMISSION REQUEST UI
          <View className="flex-1 bg-gray-900 justify-center items-center">
            <View className="bg-white/95 rounded-3xl p-8 mx-6 items-center">
              <View className="bg-blue-600 rounded-full p-4 mb-4">
                <Text className="text-white text-4xl">📷</Text>
              </View>

              <Text className="text-gray-900 text-xl font-bold text-center mb-2">
                Camera Permission Required
              </Text>

              <Text className="text-gray-600 text-base text-center mb-6">
                SIMPENPAH needs camera access to scan and identify rupiah
                banknotes
              </Text>

              <TouchableOpacity
                className="bg-blue-600 rounded-xl py-4 px-8 mb-4"
                onPress={handleManualPermission}
              >
                <Text className="text-white text-lg font-bold">
                  Grant Camera Permission
                </Text>
              </TouchableOpacity>

              <View className="bg-gray-100 rounded-lg p-3 w-full">
                <Text className="text-gray-600 text-sm text-center">
                  Status: {permission?.status || "Checking..."}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ✅ OVERLAY - Only show if camera available */}
        {shouldShowCamera && (
          <View className="absolute inset-0 pointer-events-none">
            {/* Header */}
            <View className="bg-blue-900/95 pt-16 pb-6 px-6">
              <View className="flex-row items-center justify-center">
                <View className="bg-white rounded-full p-3 mr-4">
                  <Text className="text-blue-600 text-3xl">💰</Text>
                </View>
                <View>
                  <Text className="text-white text-3xl font-bold">
                    SIMPENPAH
                  </Text>
                  <Text className="text-blue-200 text-sm font-medium">
                    Sistem Pendeteksi Nilai Rupiah
                  </Text>
                </View>
              </View>

              {/* ✅ UPDATED Status FastAPI Backend */}
              <View className="mt-4 items-center">
                <View
                  className={`px-4 py-2 rounded-full ${
                    apiLoading
                      ? "bg-yellow-500"
                      : apiError
                        ? "bg-red-500"
                        : "bg-green-500"
                  }`}
                >
                  <Text className="text-white text-xs font-bold">
                    {apiLoading
                      ? "⏳ MENGIRIM KE SERVER"
                      : apiError
                        ? "✗ SERVER ERROR"
                        : "✓ SERVER SIAP"}
                  </Text>
                </View>

                {/* ✅ API Error Info */}
                {apiError && (
                  <View className="mt-2 bg-red-900/80 rounded px-3 py-1">
                    <Text className="text-red-200 text-xs text-center">
                      {apiError.length > 50
                        ? apiError.substring(0, 50) + "..."
                        : apiError}
                    </Text>
                  </View>
                )}

                {/* ✅ API URL Info untuk debugging */}
                {__DEV__ && (
                  <View className="mt-2 bg-gray-800/80 rounded px-3 py-1">
                    <Text className="text-gray-300 text-xs text-center">
                      API: {API_URL}
                    </Text>
                  </View>
                )}
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

                {/* ✅ UPDATED Ready Indicator dengan FastAPI status */}
                <View className="mt-3 flex-row items-center justify-center">
                  <View
                    className={`w-3 h-3 rounded-full mr-2 ${
                      !apiError && shouldShowCamera
                        ? "bg-green-400"
                        : "bg-red-400"
                    }`}
                  />
                  <Text className="text-blue-100 text-xs">
                    {!apiError && shouldShowCamera
                      ? apiLoading
                        ? "MENGIRIM KE SERVER..."
                        : "SIAP MEMINDAI (FASTAPI READY)"
                      : shouldShowCamera
                        ? "SERVER ERROR"
                        : "MENUNGGU IZIN KAMERA"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default Index;
