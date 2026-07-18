import sharp from "sharp";

// Elan fotolarının emalı:
//  1) EXIF TAMAMİLƏ silinir — telefonla çəkilmiş şəkildə ev sahibinin
//     GPS koordinatı olur. "Dəqiq ünvan rezervasiyadan sonra" vədini
//     pozmamaq üçün bu məcburidir. (sharp susmaya görə metadata daşımır.)
//  2) Ölçü məhdudlaşdırılır — 5 MB-lıq şəkil hər baxışda yüklənməsin.
//  3) Su nişanı ŞƏKLİN ÖZÜNƏ yandırılır — CSS örtüyündən fərqli olaraq,
//     şəkli endirən/oğurlayan da nişanı görür (bina.az məntiqi).

const MAX_DIM = 1600;
const QUALITY = 82;

export type ImageFormat = "jpeg" | "png" | "webp";

const HEART_PATH =
  "M12 21s-7.5-4.7-9.6-9A5.5 5.5 0 0 1 12 5.7a5.5 5.5 0 0 1 9.6 6.3c-2.1 4.3-9.6 9-9.6 9z";

/**
 * Şəklin ölçüsünə uyğun su nişanı SVG-si (sağ alt künc).
 * Kölgə ayrıca kopya ilə çəkilir — `paint-order` bütün SVG mühərriklərində
 * dəstəklənmir, ona görə ona güvənmirik.
 */
function watermarkSvg(width: number, height: number): Buffer {
  const pad = Math.max(10, Math.round(Math.min(width, height) * 0.035));
  const fontSize = Math.max(13, Math.round(width * 0.036));
  const heart = Math.round(fontSize * 0.72);
  const gap = Math.round(fontSize * 0.28);

  const baseline = height - pad;
  const heartX = width - pad - heart;
  const heartY = baseline - heart * 0.92;
  const textX = heartX - gap;
  const scale = heart / 24;

  const font =
    "Inter, 'Segoe UI', 'DejaVu Sans', 'Liberation Sans', Arial, sans-serif";

  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <g opacity="0.78">
        <text x="${textX + 1}" y="${baseline + 1}" text-anchor="end"
              font-family="${font}" font-size="${fontSize}" font-weight="800"
              fill="rgba(0,0,0,0.45)">gecələ</text>
        <g transform="translate(${heartX + 1}, ${heartY + 1}) scale(${scale})">
          <path d="${HEART_PATH}" fill="rgba(0,0,0,0.45)"/>
        </g>
        <text x="${textX}" y="${baseline}" text-anchor="end"
              font-family="${font}" font-size="${fontSize}" font-weight="800"
              fill="rgba(255,255,255,0.92)">gecələ</text>
        <g transform="translate(${heartX}, ${heartY}) scale(${scale})">
          <path d="${HEART_PATH}" fill="rgba(255,255,255,0.92)"/>
        </g>
      </g>
    </svg>`
  );
}

/**
 * Yüklənən şəkli emal edir. Su nişanı hər hansı səbəbdən qoyula bilməsə
 * (məsələn şrift yoxdursa), yükləmə SINMIR — ən azı EXIF-siz, ölçüsü
 * uyğunlaşdırılmış şəkil qaytarılır. Nişan bəzəkdir, yükləmə isə funksiya.
 */
export async function processListingImage(
  input: Buffer,
  format: ImageFormat
): Promise<Buffer> {
  // ⚠️ Əvvəlcə ölçü dəyişikliyini BUFFER-ə yazırıq.
  // Səbəb: pipeline üzərində `.metadata()` GİRİŞ şəklinin ölçüsünü qaytarır,
  // resize-dan sonrakını yox. Ona görə su nişanı SVG-si şəkildən böyük çıxıb
  // composite-i sındırırdı ("Image to composite must have same dimensions").
  // `resolveWithObject` bizə FAKTİKİ çıxış ölçüsünü verir.
  // .rotate() EXIF orientasiyasını piksellərə tətbiq edir; toBuffer metadata atır.
  const { data, info } = await sharp(input, { failOn: "none" })
    .rotate()
    .resize({
      width: MAX_DIM,
      height: MAX_DIM,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toBuffer({ resolveWithObject: true });

  let pipeline = sharp(data);
  if (info.width > 0 && info.height > 0) {
    try {
      pipeline = sharp(data).composite([
        { input: watermarkSvg(info.width, info.height), top: 0, left: 0 },
      ]);
    } catch {
      pipeline = sharp(data); // nişan alınmadı — şəkil yenə saxlanılır
    }
  }

  if (format === "png") return pipeline.png({ compressionLevel: 8 }).toBuffer();
  if (format === "webp") return pipeline.webp({ quality: QUALITY }).toBuffer();
  return pipeline.jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
}
