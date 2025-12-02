import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { Link } from "expo-router";
import * as Speech from "expo-speech";
import { useEffect, useState } from "react";
import { Dimensions, Text, TouchableOpacity, View } from "react-native";

const { width: screenWidth } = Dimensions.get("window");

export default function Index() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState("");
  const [facing, setFacing] = useState<CameraType>("back");
  const [scanningAnimation, setScanningAnimation] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [hasSpokenWelcome, setHasSpokenWelcome] = useState(false);

  // Debug permission state
  console.log("Permission:", permission);
  useEffect(() => {
    console.log("Checking TTS conditions:", {
      permissionGranted: permission?.granted,
      hasSpokenWelcome: hasSpokenWelcome,
    });

    if (permission?.granted && !hasSpokenWelcome) {
      console.log("Attempting to speak welcome message...");

      setTimeout(() => {
        Speech.speak(
          "Selamat datang di Sistem Pendeteksi Uang. Silakan memindai uang dengan mengklik dua kali pada layar.",
          {
            language: "id-ID",
            pitch: 1.0,
            rate: 0.9,
            onStart: () => {
              console.log("TTS started successfully");
            },
            onDone: () => {
              console.log("TTS finished");
            },
            onError: (error) => {
              console.log("TTS error:", error);
            },
          }
        );
        setHasSpokenWelcome(true);
      }, 2000); // Increase delay to 2 seconds
    }
  }, [permission?.granted, hasSpokenWelcome]);

  // Auto request permission saat app dibuka
  useEffect(() => {
    if (permission && !permission.granted) {
      console.log("Requesting permission...");
      requestPermission().then((result) => {
        console.log("Permission result:", result);
      });
    }
  }, [permission, requestPermission]);

  // Suara welcome saat kamera siap
  // useEffect(() => {
  //   if (permission?.granted && !hasSpokenWelcome) {
  //     setTimeout(() => {
  //       Speech.speak(
  //         "Selamat datang di SIMPENPAH. Silakan memindai uang dengan mengklik dua kali pada layar.",
  //         {
  //           language: "id-ID",
  //           pitch: 1.0,
  //           rate: 0.9,
  //         }
  //       );
  //       setHasSpokenWelcome(true);
  //     }, 1000); // Delay 1 detik setelah kamera ready
  //   }
  // }, [permission?.granted, hasSpokenWelcome]);

  const handleDoubleTap = () => {
    console.log("Double tap detected - scan function will be added later");
    // Nanti di sini bisa tambahkan fungsi scan
  };

  // Debug loading state
  if (!permission) {
    console.log("No permission object yet");
    return (
      <View className="flex-1 bg-blue-600 justify-center items-center">
        <Text className="text-white text-lg">Memuat kamera...</Text>
      </View>
    );
  }

  // Debug permission denied state
  if (!permission.granted) {
    console.log("Permission not granted, status:", permission);
    return (
      <View className="flex-1 bg-blue-600 justify-center items-center px-6">
        <View className="bg-white rounded-xl p-6">
          <Text className="text-gray-800 text-lg font-semibold mb-4 text-center">
            Izin Kamera Diperlukan
          </Text>
          <Text className="text-gray-600 text-center mb-6">
            SIMPENPAH memerlukan akses kamera untuk mendeteksi uang
          </Text>
          <TouchableOpacity
            onPress={() => {
              console.log("Manual permission request");
              requestPermission();
            }}
            className="bg-blue-600 py-3 px-6 rounded-lg"
          >
            <Text className="text-white text-center font-semibold">
              Berikan Izin Kamera
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Camera should show here
  console.log("Camera should be showing now");

  return (
    <TouchableOpacity
      className="flex-1"
      onPress={handleDoubleTap}
      activeOpacity={1}
      accessible={true}
      accessibilityLabel="Area pemindaian kamera SIMPENPAH"
      accessibilityHint="Ketuk dua kali di mana saja pada layar untuk memulai pemindaian uang"
    >
      {/* <StatusBar
        barStyle="light-content"
        backgroundColor="#1e40af"
        translucent
      /> */}

      {/* Full-screen Camera View */}
      <CameraView className="flex-1" facing={facing} style={{ flex: 1 }} />

      {/* Blurred Header */}
      <View
        className="absolute top-0 left-0 right-0 pt-12 pb-6 px-6"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.3)",
          backdropFilter: "blur(10px)",
        }}
      >
        <View className="flex-row items-center justify-center">
          <View className="flex-1 justify-center items-center">
            <Text
              className="text-white text-3xl font-black tracking-wide"
              accessible={true}
              accessibilityLabel="SIMPENPAH"
            >
              Arahkan Kamera ke Uang
            </Text>
            <Text
              className="text-white text-sm font-medium opacity-90"
              accessible={true}
              accessibilityLabel="Sistem Pendeteksi Nilai Rupiah"
            >
              Sistem Pendeteksi Nilai Rupiah
            </Text>

            <Link href="/result">Lihat Hasil</Link>
          </View>
        </View>
      </View>

      {/* Scan Frame - Corner Brackets Only */}
      <View className="absolute inset-0 justify-center items-center pointer-events-none">
        <View className="w-80 h-80 relative">
          {/* Corner brackets - top left */}
          <View className="absolute -top-2 -left-2 w-14 h-14 border-l-4 border-t-4 border-blue-400 rounded-tl-2xl" />

          {/* Corner brackets - top right */}
          <View className="absolute -top-2 -right-2 w-14 h-14 border-r-4 border-t-4 border-blue-400 rounded-tr-2xl" />

          {/* Corner brackets - bottom left */}
          <View className="absolute -bottom-2 -left-2 w-14 h-14 border-l-4 border-b-4 border-blue-400 rounded-bl-2xl" />

          {/* Corner brackets - bottom right */}
          <View className="absolute -bottom-2 -right-2 w-14 h-14 border-r-4 border-b-4 border-blue-400 rounded-br-2xl" />

          {/* Center scanning line */}
          <View className="absolute inset-0 justify-center">
            <View className="w-full h-1 bg-blue-400 rounded-full shadow-lg opacity-80" />
          </View>
        </View>
      </View>

      {/* Blurred Footer */}
      <View
        className="absolute bottom-0 left-0 right-0 px-8 py-8"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.3)",
          backdropFilter: "blur(10px)",
        }}
      >
        <View className="items-center">
          <View className=" bg-opacity-10 backdrop-blur-md rounded-2xl px-6 py-4 mb-4">
            <Text
              className="text-white text-xl font-bold text-center mb-2"
              accessible={true}
              accessibilityLabel="Petunjuk: Ketuk dua kali di mana saja untuk memindai"
            >
              Ketuk 2× untuk memindai
            </Text>
            <Text
              className="text-white text-sm text-center opacity-80 font-medium"
              accessible={true}
              accessibilityLabel="Aplikasi bantuan khusus tunanetra untuk mengenali nilai mata uang rupiah"
            >
              Bantuan tunanetra identifikasi uang rupiah
            </Text>
          </View>

          {/* Elegant scan indicator */}
          <View className="flex-row items-center space-x-2">
            <View className="w-3 h-3 bg-blue-400 rounded-full opacity-60" />
            <View className="w-3 h-3 bg-blue-300 rounded-full opacity-40" />
            <View className="w-3 h-3 bg-blue-200 rounded-full opacity-20" />
          </View>
        </View>
      </View>

      {/* Status Display - Floating */}
      {scanResult && (
        <View className="absolute top-32 left-6 right-6">
          <View
            className="bg-white bg-opacity-95 backdrop-blur-md rounded-2xl px-6 py-4 shadow-2xl"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(15px)",
            }}
          >
            <Text
              className="text-center font-bold text-blue-600 text-lg"
              accessible={true}
              accessibilityLabel={scanResult}
            >
              {scanResult}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}
