import { gambarKeTensor, GambarTerproses } from "@/utils/imageProcessing";
import { InferenceSession, Tensor } from "onnxruntime-react-native";
import { useCallback, useEffect, useState } from "react";

// Interface untuk hasil prediksi
export interface HasilPrediksi {
  label: string;
  value: number;
  confidence: number;
  probabilitas: number[];
}

// Interface untuk status model
export interface StatusModel {
  isReady: boolean;
  error: string | null;
  isLoading: boolean;
  modelInfo?: {
    inputNames: readonly string[];
    outputNames: readonly string[];
    inputShape: number[];
  };
}

// Interface untuk hook
export interface UseRupiahModelHook {
  modelState: StatusModel;
  predict: (gambarBase64: string) => Promise<HasilPrediksi>;
  isLoading: boolean;
}

// Peta label untuk 7 kelas mata uang rupiah
const LABEL_RUPIAH = {
  0: { label: "Seribu Rupiah", value: 1000 },
  1: { label: "Dua Ribu Rupiah", value: 2000 },
  2: { label: "Lima Ribu Rupiah", value: 5000 },
  3: { label: "Sepuluh Ribu Rupiah", value: 10000 },
  4: { label: "Dua Puluh Ribu Rupiah", value: 20000 },
  5: { label: "Lima Puluh Ribu Rupiah", value: 50000 },
  6: { label: "Seratus Ribu Rupiah", value: 100000 },
} as const;

/**
 * Hook kustom untuk menjalankan model ONNX deteksi mata uang rupiah
 * Menggunakan onnxruntime-react-native untuk inferensi MobileNetV2
 */
const useRupiahModel = (): UseRupiahModelHook => {
  // State untuk menyimpan session ONNX
  const [session, setSession] = useState<InferenceSession | null>(null);

  // State untuk status model
  const [modelState, setModelState] = useState<StatusModel>({
    isReady: false,
    error: null,
    isLoading: true,
  });

  /**
   * Fungsi untuk menerapkan Softmax pada logits
   * Mengkonversi nilai mentah menjadi probabilitas (0-1)
   */
  const applySoftmax = useCallback((logits: Float32Array): number[] => {
    // Cari nilai maksimum untuk stabilitas numerik
    let maxLogit = logits[0];
    for (let i = 1; i < logits.length; i++) {
      if (logits[i] > maxLogit) {
        maxLogit = logits[i];
      }
    }

    // Hitung eksponen dari (logit - max) untuk menghindari overflow
    const eksponen = new Array(logits.length);
    let jumlahEksponen = 0;

    for (let i = 0; i < logits.length; i++) {
      eksponen[i] = Math.exp(logits[i] - maxLogit);
      jumlahEksponen += eksponen[i];
    }

    // Normalisasi untuk mendapatkan probabilitas
    const probabilitas = new Array(logits.length);
    for (let i = 0; i < logits.length; i++) {
      probabilitas[i] = eksponen[i] / jumlahEksponen;
    }

    return probabilitas;
  }, []);

  /**
   * Fungsi untuk mencari indeks dengan nilai tertinggi (Argmax)
   */
  const findArgmax = useCallback((array: number[]): number => {
    let indeksMaksimum = 0;
    let nilaiMaksimum = array[0];

    for (let i = 1; i < array.length; i++) {
      if (array[i] > nilaiMaksimum) {
        nilaiMaksimum = array[i];
        indeksMaksimum = i;
      }
    }

    return indeksMaksimum;
  }, []);

  /**
   * Memuat model ONNX dari assets saat hook dipasang
   */
  useEffect(() => {
    const muatModelONNX = async () => {
      try {
        console.log("Memulai pemuatan model ONNX...");
        setModelState((prev) => ({ ...prev, isLoading: true, error: null }));

        // Memuat model dari assets menggunakan InferenceSession
        const sessionBaru = await InferenceSession.create(
          require("../assets/rupiah_model.onnx")
        );

        console.log("Model ONNX berhasil dimuat");

        // Simpan informasi model untuk debugging
        const infoModel = {
          inputNames: sessionBaru.inputNames,
          outputNames: sessionBaru.outputNames,
          inputShape: [1, 3, 224, 224], // Bentuk input MobileNetV2
        };

        setSession(sessionBaru);
        setModelState({
          isReady: true,
          error: null,
          isLoading: false,
          modelInfo: infoModel,
        });

        console.log("Info model:", infoModel);
      } catch (error) {
        console.error("Gagal memuat model ONNX:", error);
        setModelState({
          isReady: false,
          error: `Gagal memuat model: ${error}`,
          isLoading: false,
        });
      }
    };

    muatModelONNX();

    // Cleanup function untuk membersihkan session saat unmount
    return () => {
      if (session) {
        session.release?.();
        console.log("Session ONNX telah dibersihkan");
      }
    };
  }, []);

  /**
   * Fungsi prediksi utama
   * Memproses gambar base64 dan mengembalikan hasil deteksi mata uang
   */
  const predict = useCallback(
    async (gambarBase64: string): Promise<HasilPrediksi> => {
      // Validasi apakah model sudah siap
      if (!session || !modelState.isReady) {
        throw new Error("Model belum siap. Tunggu hingga pemuatan selesai.");
      }

      try {
        console.log("Memulai prediksi mata uang...");

        // Konversi gambar base64 ke tensor menggunakan helper function
        const gambarTerproses: GambarTerproses =
          await gambarKeTensor(gambarBase64);

        // Buat tensor ONNX dari Float32Array
        const tensorInput = new Tensor(
          "float32",
          gambarTerproses.tensor,
          [1, 3, 224, 224]
        );

        // Dapatkan nama input dari model (biasanya 'input' atau gunakan yang pertama)
        const namaInput = session.inputNames[0] || "input";

        // Jalankan inferensi dengan session.run()
        console.log("Menjalankan inferensi model...");
        const hasilInferensi = await session.run({
          [namaInput]: tensorInput,
        });

        // Ambil output logits (nilai mentah sebelum softmax)
        const namaOutput = session.outputNames[0];
        const outputTensor = hasilInferensi[namaOutput];
        const logits = outputTensor.data as Float32Array;

        console.log("Logits mentah:", Array.from(logits));

        // Terapkan Softmax untuk mendapatkan probabilitas
        const probabilitas = applySoftmax(logits);
        console.log("Probabilitas setelah softmax:", probabilitas);

        // Cari indeks dengan probabilitas tertinggi (Argmax)
        const indeksTertinggi = findArgmax(probabilitas);
        const konfidenseTertinggi = probabilitas[indeksTertinggi];

        // Ambil label dan nilai dari peta
        const hasilDeteksi =
          LABEL_RUPIAH[indeksTertinggi as keyof typeof LABEL_RUPIAH];

        if (!hasilDeteksi) {
          throw new Error(`Indeks tidak valid: ${indeksTertinggi}`);
        }

        console.log(
          `Terdeteksi: ${hasilDeteksi.label} dengan konfiden ${(konfidenseTertinggi * 100).toFixed(1)}%`
        );

        return {
          label: hasilDeteksi.label,
          value: hasilDeteksi.value,
          confidence: Math.round(konfidenseTertinggi * 100), // Konversi ke persentase
          probabilitas: probabilitas,
        };
      } catch (error) {
        console.error("Error saat prediksi:", error);
        throw new Error(`Prediksi gagal: ${error}`);
      }
    },
    [session, modelState.isReady, applySoftmax, findArgmax]
  );

  return {
    modelState,
    predict,
    isLoading: modelState.isLoading,
  };
};

export default useRupiahModel;
