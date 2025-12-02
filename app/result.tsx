// import FloatingShapesBackground from "@/components/FloatingShapesBackground";
import FloatingShapesBackground from "@/components/FloatingShapesBackground";
import Icon from "@/components/icon";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Speech from "expo-speech";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";

const { width: screenWidth } = Dimensions.get("window");

const Result = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [hasSpoken, setHasSpoken] = useState(false);

  // Double tap and long press detection
  const [tapCount, setTapCount] = useState(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animations
  const fadeInAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const confettiAnims = useRef(
    Array.from({ length: 20 }, () => ({
      translateY: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
    }))
  ).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Parse params or use dummy data
  const detectedMoney = {
    success: params.success === "true",
    nominal: params.label || "Lima Puluh Ribu Rupiah",
    value: parseInt(params.amount as string) || 50000,
    confidence: parseInt(params.accuracy as string) || 95,
  };

  // Confetti animation
  const startConfetti = () => {
    confettiAnims.forEach((anim, index) => {
      const randomX = Math.random() * screenWidth;
      const randomDelay = Math.random() * 1000;

      setTimeout(() => {
        Animated.parallel([
          Animated.timing(anim.translateY, {
            toValue: 600,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(anim.rotate, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(2000),
            Animated.timing(anim.opacity, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      }, randomDelay);
    });
  };

  // Animations
  useEffect(() => {
    // Sequential animations
    Animated.parallel([
      Animated.timing(fadeInAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Start confetti after main animations
      if (detectedMoney.success) {
        startConfetti();
      }
    });

    // Animate progress bar
    setTimeout(() => {
      Animated.timing(progressAnim, {
        toValue: detectedMoney.confidence / 100,
        duration: 1500,
        useNativeDriver: false,
      }).start();
    }, 800);

    // Continuous pulse for success indicator
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  }, []);

  // TTS saat halaman dibuka
  useEffect(() => {
    if (!hasSpoken) {
      setTimeout(() => {
        const message = detectedMoney.success
          ? `Hasil deteksi: ${detectedMoney.nominal}. Tingkat akurasi ${detectedMoney.confidence} persen. Ketuk dua kali untuk scan lagi, tahan lama untuk ulangi hasil.`
          : `Gagal mendeteksi uang. Silakan coba lagi dengan pencahayaan yang lebih baik.`;

        Speech.speak(message, {
          language: "id-ID",
          pitch: 1.0,
          rate: 0.8,
        });
        setHasSpoken(true);
      }, 1200);
    }
  }, [hasSpoken]);

  const handleRepeatResult = () => {
    Vibration.vibrate(100);
    const message = detectedMoney.success
      ? `${detectedMoney.nominal}. Nilai ${detectedMoney.value.toLocaleString("id-ID")} rupiah. Tingkat akurasi ${detectedMoney.confidence} persen.`
      : "Deteksi gagal. Silakan coba scan ulang.";

    Speech.speak(message, {
      language: "id-ID",
      pitch: 1.0,
      rate: 0.8,
    });
  };

  const handleBackToScan = () => {
    Speech.speak("Kembali ke pemindaian", {
      language: "id-ID",
      pitch: 1.0,
      rate: 1.0,
    });
    router.back();
  };

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      Vibration.vibrate(200);
      handleRepeatResult();
    }, 800);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    setTapCount((prevCount) => prevCount + 1);

    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
    }

    tapTimer.current = setTimeout(() => {
      if (tapCount === 1) {
        Vibration.vibrate(50);
        handleBackToScan();
      }
      setTapCount(0);
    }, 300);
  };

  return (
    <TouchableOpacity
      className="flex-1"
      onPressIn={handleTouchStart}
      onPressOut={handleTouchEnd}
      activeOpacity={1}
      accessible={true}
      accessibilityLabel="Hasil deteksi uang"
      accessibilityHint="Ketuk dua kali untuk scan lagi, tahan lama untuk ulangi hasil"
    >
      <View className="flex-1">
        <FloatingShapesBackground />

        {/* Confetti Layer */}
        {detectedMoney.success && (
          <View className="absolute inset-0 pointer-events-none">
            {confettiAnims.map((anim, index) => (
              <Animated.View
                key={index}
                className={`absolute w-3 h-3 ${
                  index % 3 === 0
                    ? "bg-yellow-400"
                    : index % 3 === 1
                      ? "bg-green-400"
                      : "bg-blue-400"
                } rounded-sm`}
                style={{
                  left: ((index * screenWidth) / 20) % screenWidth,
                  top: -20,
                  transform: [
                    { translateY: anim.translateY },
                    {
                      rotate: anim.rotate.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", "360deg"],
                      }),
                    },
                  ],
                  opacity: anim.opacity,
                }}
              />
            ))}
          </View>
        )}

        {/* Header with Brand */}
        <Animated.View
          className="pt-16 pb-8 px-6"
          style={{
            opacity: fadeInAnim,
            transform: [{ translateY: slideUpAnim }],
          }}
        >
          <View className="items-center">
            <Text className="text-white text-4xl font-black tracking-wider mb-2">
              SIMPENPAH
            </Text>
            <View className="w-16 h-1 bg-blue-300 rounded-full mb-4" />
            <Text className="text-blue-100 text-lg font-bold">
              {detectedMoney.success ? "HASIL DETEKSI" : "DETEKSI GAGAL"}
            </Text>
          </View>
        </Animated.View>

        {/* Success/Failure Indicator */}
        <Animated.View
          className="items-center mb-12"
          style={{
            opacity: fadeInAnim,
            transform: [{ scale: scaleAnim }, { scale: pulseAnim }],
          }}
        >
          <View
            className={`w-28 h-28 rounded-full items-center justify-center shadow-2xl mb-6 ${
              detectedMoney.success
                ? "bg-gradient-to-br from-green-400 to-green-600"
                : "bg-gradient-to-br from-red-400 to-red-600"
            }`}
          >
            <Icon
              name={detectedMoney.success ? "Check" : "X"}
              color="white"
              size={48}
            />
          </View>
          <View
            className={`bg-opacity-90 backdrop-blur-sm rounded-full px-8 py-3 ${
              detectedMoney.success ? "bg-green-500" : "bg-red-500"
            }`}
          >
            <Text className="text-white font-black text-base tracking-wide">
              {detectedMoney.success
                ? "BERHASIL TERDETEKSI"
                : "GAGAL TERDETEKSI"}
            </Text>
          </View>
        </Animated.View>

        {/* Main Content */}
        <Animated.View
          className="flex-1 px-6"
          style={{
            opacity: fadeInAnim,
            transform: [{ translateY: slideUpAnim }],
          }}
        >
          {detectedMoney.success ? (
            <>
              {/* Nominal Section */}
              <View className="mb-8">
                <Text className="text-blue-100 text-sm font-semibold uppercase tracking-widest text-center mb-4">
                  Nominal Terdeteksi
                </Text>
                <View className="bg-white bg-opacity-10 backdrop-blur-sm border border-white border-opacity-20 rounded-3xl p-8">
                  <Text
                    className="text-white text-3xl font-black text-center mb-3 leading-tight"
                    accessible={true}
                    accessibilityLabel={
                      Array.isArray(detectedMoney.nominal)
                        ? detectedMoney.nominal.join(" ")
                        : detectedMoney.nominal
                    }
                  >
                    {detectedMoney.nominal}
                  </Text>
                  <View className="w-full h-px bg-blue-300 opacity-50 mb-3" />
                  <Text
                    className="text-blue-200 text-4xl font-black text-center"
                    accessible={true}
                    accessibilityLabel={`Rp ${detectedMoney.value.toLocaleString("id-ID")}`}
                  >
                    Rp {detectedMoney.value.toLocaleString("id-ID")}
                  </Text>
                </View>
              </View>

              {/* Accuracy Section */}
              <View className="mb-8">
                <Text className="text-blue-100 text-sm font-semibold uppercase tracking-widest text-center mb-4">
                  Tingkat Akurasi
                </Text>
                <View className="bg-white bg-opacity-10 backdrop-blur-sm border border-white border-opacity-20 rounded-3xl p-6">
                  <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-white font-bold text-xl">
                      Akurasi Deteksi
                    </Text>
                    <Text className="text-blue-200 font-black text-3xl">
                      {detectedMoney.confidence}%
                    </Text>
                  </View>

                  <View className="bg-white bg-opacity-20 rounded-full h-4 mb-4 overflow-hidden">
                    <Animated.View
                      className="rounded-full h-4"
                      style={{
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0%", "100%"],
                        }),
                        backgroundColor: "#60a5fa",
                      }}
                    />
                  </View>

                  <Text className="text-blue-100 text-center font-semibold">
                    {detectedMoney.confidence >= 90
                      ? "Sangat Akurat"
                      : detectedMoney.confidence >= 80
                        ? "Akurat"
                        : "Cukup Akurat"}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            /* Failure Message */
            <View className="mb-8">
              <View className="bg-white bg-opacity-10 backdrop-blur-sm border border-white border-opacity-20 rounded-3xl p-8">
                <Text className="text-white text-2xl font-bold text-center mb-4">
                  Uang Tidak Terdeteksi
                </Text>
                <Text className="text-blue-200 text-center text-base leading-6">
                  Pastikan uang dalam kondisi baik, pencahayaan cukup, dan
                  kamera fokus pada uang kertas.
                </Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Footer Instructions */}
        <Animated.View className="px-6 pb-8" style={{ opacity: fadeInAnim }}>
          {/* Status */}
          <View className="flex-row items-center justify-center mb-2 ">
            <View
              className={`w-3 h-3 rounded-full mr-3 ${
                detectedMoney.success ? "bg-green-400" : "bg-red-400"
              }`}
            />
            <Text
              className={`text-base font-bold tracking-wide ${
                detectedMoney.success ? "text-green-300" : "text-red-300"
              }`}
            >
              {detectedMoney.success ? "DETEKSI SELESAI" : "DETEKSI GAGAL"}
            </Text>
          </View>

          {/* Instructions */}
          <View className="bg-white bg-opacity-10 backdrop-blur-sm border border-white border-opacity-20 rounded-2xl p-6">
            <Text className="text-white text-lg font-bold text-center mb-3">
              Instruksi Penggunaan
            </Text>
            <View className="flex-row justify-center items-center space-x-8">
              <View className="items-center flex-1">
                <Text className="text-blue-200 text-sm font-bold mb-1">
                  KETUK 2×
                </Text>
                <Text className="text-blue-100 text-xs text-center">
                  Scan Lagi
                </Text>
              </View>
              <View className="w-px h-8 bg-white opacity-30" />
              <View className="items-center flex-1">
                <Text className="text-blue-200 text-sm font-bold mb-1">
                  TAHAN LAMA
                </Text>
                <Text className="text-blue-100 text-xs text-center">
                  Ulangi Hasil
                </Text>
              </View>
            </View>
          </View>

          {/* Tech Info */}
          <Text className="text-white text-xs text-center opacity-60 font-medium mt-4">
            Menggunakan teknologi Machine Learning
          </Text>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
};

export default Result;
