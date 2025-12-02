import Icon from "@/components/icon";
import { useRouter } from "expo-router";
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
  const [hasSpoken, setHasSpoken] = useState(false);

  // Double tap and long press detection
  const [tapCount, setTapCount] = useState(0);
  const tapTimer = useRef<number | null>(null);
  const longPressTimer = useRef<number | null>(null);

  // Animations
  const fadeInAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Dummy data nominal uang
  const detectedMoney = {
    nominal: "Lima Puluh Ribu Rupiah",
    value: 50000,
    confidence: 95,
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
    ]).start();

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
  }, [fadeInAnim, slideUpAnim, scaleAnim, pulseAnim]);

  // TTS saat halaman dibuka
  useEffect(() => {
    if (!hasSpoken) {
      setTimeout(() => {
        Speech.speak(
          `Hasil deteksi: ${detectedMoney.nominal}. Tingkat akurasi ${detectedMoney.confidence} persen. Ketuk dua kali untuk scan lagi, tahan lama untuk ulangi hasil.`,
          {
            language: "id-ID",
            pitch: 1.0,
            rate: 0.8,
          }
        );
        setHasSpoken(true);
      }, 1200);
    }
  }, [hasSpoken]);

  const handleRepeatResult = () => {
    Speech.speak(
      `${detectedMoney.nominal}. Nilai ${detectedMoney.value.toLocaleString("id-ID")} rupiah. Tingkat akurasi ${detectedMoney.confidence} persen.`,
      {
        language: "id-ID",
        pitch: 1.0,
        rate: 0.8,
      }
    );
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
      <View
        className="flex-1"
        style={{
          backgroundColor: "#000033",
          backgroundImage: "linear-gradient(180deg, #000033 0%, #000000 100%)",
        }}
      >
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
            <View className="w-16 h-1 bg-blue-400 rounded-full mb-4" />
            <Text className="text-blue-200 text-lg font-bold">
              HASIL DETEKSI
            </Text>
          </View>
        </Animated.View>

        {/* Success Indicator */}
        <Animated.View
          className="items-center mb-12"
          style={{
            opacity: fadeInAnim,
            transform: [{ scale: scaleAnim }, { scale: pulseAnim }],
          }}
        >
          <View className="w-28 h-28 bg-gradient-to-br from-green-400 to-green-600 rounded-full items-center justify-center shadow-2xl mb-6">
            {/* <Check color="black" size={40} />
             */}
            {/* <Icon name="Check" color="black" size={40} /> */}
            <Icon name="Check" color="black" size={40} />
          </View>
          <View className="bg-green-500 bg-opacity-90 backdrop-blur-sm rounded-full px-8 py-3">
            <Text className="text-white font-black text-base tracking-wide">
              BERHASIL TERDETEKSI
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
          {/* Nominal Section */}
          <View className="mb-8">
            <Text className="text-blue-200 text-sm font-semibold uppercase tracking-widest text-center mb-4">
              Nominal Terdeteksi
            </Text>
            <View className="bg-white bg-opacity-5 backdrop-blur-sm border border-white border-opacity-10 rounded-3xl p-8">
              <Text
                className="text-white text-3xl font-black text-center mb-3 leading-tight"
                accessible={true}
                accessibilityLabel={detectedMoney.nominal}
              >
                {detectedMoney.nominal}
              </Text>
              <View className="w-full h-px bg-blue-400 opacity-30 mb-3" />
              <Text
                className="text-blue-300 text-4xl font-black text-center"
                accessible={true}
                accessibilityLabel={`Rp ${detectedMoney.value.toLocaleString("id-ID")}`}
              >
                Rp {detectedMoney.value.toLocaleString("id-ID")}
              </Text>
            </View>
          </View>

          {/* Accuracy Section */}
          <View className="mb-8">
            <Text className="text-blue-200 text-sm font-semibold uppercase tracking-widest text-center mb-4">
              Tingkat Akurasi
            </Text>
            <View className="bg-white bg-opacity-5 backdrop-blur-sm border border-white border-opacity-10 rounded-3xl p-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-white font-bold text-xl">
                  Akurasi Deteksi
                </Text>
                <Text className="text-blue-300 font-black text-3xl">
                  {detectedMoney.confidence}%
                </Text>
              </View>

              <View className="bg-white bg-opacity-10 rounded-full h-4 mb-4 overflow-hidden">
                <Animated.View
                  className="bg-gradient-to-r from-blue-400 to-green-400 rounded-full h-4"
                  style={{
                    width: `${detectedMoney.confidence}%`,
                  }}
                />
              </View>

              <Text className="text-blue-200 text-center font-semibold">
                Sangat Akurat
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Footer Instructions */}
        <Animated.View className="px-6 pb-8" style={{ opacity: fadeInAnim }}>
          {/* Status */}
          <View className="flex-row items-center justify-center mb-6">
            <View className="w-3 h-3 bg-green-400 rounded-full mr-3" />
            <Text className="text-green-400 text-base font-bold tracking-wide">
              DETEKSI SELESAI
            </Text>
          </View>

          {/* Instructions */}
          <View className="bg-white bg-opacity-5 backdrop-blur-sm border border-white border-opacity-10 rounded-2xl p-6">
            <Text className="text-white text-lg font-bold text-center mb-3">
              Instruksi Penggunaan
            </Text>
            <View className="flex-row justify-center items-center space-x-8">
              <View className="items-center flex-1">
                <Text className="text-blue-300 text-sm font-bold mb-1">
                  KETUK 2×
                </Text>
                <Text className="text-blue-200 text-xs text-center">
                  Scan Lagi
                </Text>
              </View>
              <View className="w-px h-8 bg-white opacity-20" />
              <View className="items-center flex-1">
                <Text className="text-blue-300 text-sm font-bold mb-1">
                  TAHAN LAMA
                </Text>
                <Text className="text-blue-200 text-xs text-center">
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
