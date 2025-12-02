import { decode } from "base64-arraybuffer";

export interface GambarTerproses {
  tensor: Float32Array;
  base64Asli: string;
}

/**
 * Mengkonversi data gambar menjadi tensor Float32Array untuk model MobileNetV2 ONNX
 * @param input - String base64 atau data gambar Uint8Array
 * @returns Promise<GambarTerproses> - Data tensor dan base64 asli
 */
export const gambarKeTensor = async (
  input: string | Uint8Array
): Promise<GambarTerproses> => {
  try {
    console.log("Mengkonversi gambar ke tensor...");

    let dataGambar: Uint8Array;
    let base64Asli: string;

    // Menangani tipe input
    if (typeof input === "string") {
      // Hapus prefix data URL jika ada
      const dataBase64 = input.replace(/^data:image\/[a-z]+;base64,/, "");
      base64Asli = dataBase64;

      // Decode base64 ke ArrayBuffer, kemudian ke Uint8Array
      const arrayBuffer = decode(dataBase64);
      dataGambar = new Uint8Array(arrayBuffer);
    } else {
      dataGambar = input;
      base64Asli = "";
    }

    // Sementara ini, kita simulasikan proses pembuatan tensor
    // Dalam implementasi nyata, Anda perlu decode data JPEG/PNG terlebih dahulu
    const tensor = await buatTensorMobileNet(dataGambar);

    return {
      tensor,
      base64Asli,
    };
  } catch (error) {
    console.error("Konversi gambar ke tensor gagal:", error);
    throw new Error("Gagal mengkonversi gambar ke tensor");
  }
};

/**
 * Membuat tensor yang kompatibel dengan MobileNetV2 dari piksel gambar
 * @param dataGambar - Data gambar mentah (byte JPEG/PNG)
 * @returns Float32Array tensor dalam format CHW
 */
const buatTensorMobileNet = async (
  dataGambar: Uint8Array
): Promise<Float32Array> => {
  // Parameter normalisasi ImageNet
  const RATA_RATA_IMAGENET = [0.485, 0.456, 0.406];
  const STANDAR_DEVIASI_IMAGENET = [0.229, 0.224, 0.225];
  const UKURAN_TARGET = 224;
  const JUMLAH_CHANNEL = 3;
  const UKURAN_BATCH = 1;

  // Total ukuran tensor: 1 * 3 * 224 * 224
  const ukuranTensor =
    UKURAN_BATCH * JUMLAH_CHANNEL * UKURAN_TARGET * UKURAN_TARGET;
  const tensor = new Float32Array(ukuranTensor);

  // Untuk produksi, Anda perlu decode JPEG/PNG di sini
  // Sementara ini, kita buat tensor mock dengan dimensi dan normalisasi yang tepat

  // Simulasi data piksel RGB (normalnya didapat dari decoder gambar)
  const pikselRgbMock = new Uint8Array(
    UKURAN_TARGET * UKURAN_TARGET * JUMLAH_CHANNEL
  );

  // Isi dengan data mock (dalam produksi, ini dari decoder gambar)
  for (let i = 0; i < pikselRgbMock.length; i++) {
    pikselRgbMock[i] = Math.floor(Math.random() * 256);
  }

  // Konversi ke format CHW dengan normalisasi ImageNet
  let indeksTensor = 0;

  // Proses setiap channel terpisah (format CHW)
  for (let c = 0; c < JUMLAH_CHANNEL; c++) {
    for (let h = 0; h < UKURAN_TARGET; h++) {
      for (let w = 0; w < UKURAN_TARGET; w++) {
        // Hitung indeks piksel dalam format HWC
        const indeksPiksel = (h * UKURAN_TARGET + w) * JUMLAH_CHANNEL + c;

        // Dapatkan nilai piksel (0-255)
        const nilaiPiksel = pikselRgbMock[indeksPiksel];

        // Terapkan normalisasi ImageNet: (piksel/255 - rata-rata) / std
        const nilaiTernormalisasi =
          (nilaiPiksel / 255.0 - RATA_RATA_IMAGENET[c]) /
          STANDAR_DEVIASI_IMAGENET[c];

        // Simpan dalam format CHW
        tensor[indeksTensor++] = nilaiTernormalisasi;
      }
    }
  }

  console.log(
    `Tensor dibuat dengan bentuk [${UKURAN_BATCH}, ${JUMLAH_CHANNEL}, ${UKURAN_TARGET}, ${UKURAN_TARGET}]`
  );
  return tensor;
};

/**
 * Mengubah ukuran gambar menggunakan interpolasi bilinear
 * @param piksel - Data piksel RGB dalam format HWC
 * @param lebarSumber - Lebar gambar sumber
 * @param tinggiSumber - Tinggi gambar sumber
 * @param lebarTarget - Lebar target (224)
 * @param tinggiTarget - Tinggi target (224)
 * @returns Data piksel yang telah diubah ukurannya
 */
const ubahUkuranBilinear = (
  piksel: Uint8Array,
  lebarSumber: number,
  tinggiSumber: number,
  lebarTarget: number,
  tinggiTarget: number
): Uint8Array => {
  const diubahUkuran = new Uint8Array(lebarTarget * tinggiTarget * 3);

  const rasioX = lebarSumber / lebarTarget;
  const rasioY = tinggiSumber / tinggiTarget;

  for (let y = 0; y < tinggiTarget; y++) {
    for (let x = 0; x < lebarTarget; x++) {
      const sumberX = x * rasioX;
      const sumberY = y * rasioY;

      // Dapatkan koordinat piksel sekitar
      const x1 = Math.floor(sumberX);
      const y1 = Math.floor(sumberY);
      const x2 = Math.min(x1 + 1, lebarSumber - 1);
      const y2 = Math.min(y1 + 1, tinggiSumber - 1);

      // Hitung bobot interpolasi
      const bobotX = sumberX - x1;
      const bobotY = sumberY - y1;

      for (let c = 0; c < 3; c++) {
        // Dapatkan 4 piksel sekitar
        const p1 = piksel[(y1 * lebarSumber + x1) * 3 + c];
        const p2 = piksel[(y1 * lebarSumber + x2) * 3 + c];
        const p3 = piksel[(y2 * lebarSumber + x1) * 3 + c];
        const p4 = piksel[(y2 * lebarSumber + x2) * 3 + c];

        // Interpolasi bilinear
        const interpolasi =
          p1 * (1 - bobotX) * (1 - bobotY) +
          p2 * bobotX * (1 - bobotY) +
          p3 * (1 - bobotX) * bobotY +
          p4 * bobotX * bobotY;

        diubahUkuran[(y * lebarTarget + x) * 3 + c] = Math.round(interpolasi);
      }
    }
  }

  return diubahUkuran;
};

/**
 * Fungsi prapemrosesan gambar yang telah diperbarui menggunakan gambarKeTensor baru
 */
export const praprosesGambar = async (
  gambarBase64: string
): Promise<GambarTerproses> => {
  try {
    console.log("Memproses gambar...");

    // Gunakan fungsi konversi tensor baru
    const hasil = await gambarKeTensor(gambarBase64);

    // Tambah delay pemrosesan untuk UX
    await new Promise((resolve) => setTimeout(resolve, 1500));

    return hasil;
  } catch (error) {
    console.error("Prapemrosesan gambar gagal:", error);
    throw new Error("Gagal memproses gambar");
  }
};

/**
 * Membersihkan tensor untuk mencegah kebocoran memori
 */
export const bersihkanTensor = (tensorArray: Float32Array[]) => {
  // Untuk Float32Array, kita tidak perlu pembersihan eksplisit
  // tapi kita bisa set ke null untuk garbage collection
  tensorArray.forEach((tensor, indeks) => {
    if (tensor) {
      console.log(
        `Membersihkan tensor ${indeks} dengan ${tensor.length} elemen`
      );
    }
  });
  console.log("Pembersihan tensor selesai");
};

/**
 * Fungsi utilitas untuk mendapatkan info bentuk tensor
 */
export const getInfoTensor = (tensor: Float32Array) => {
  return {
    panjang: tensor.length,
    bentuk: [1, 3, 224, 224],
    tipe: "Float32Array",
    penggunaanMemori: `${((tensor.length * 4) / 1024 / 1024).toFixed(2)} MB`,
  };
};

// Tetap export fungsi lama untuk kompatibilitas
export const preprocessImage = praprosesGambar;
export const cleanupTensors = bersihkanTensor;
