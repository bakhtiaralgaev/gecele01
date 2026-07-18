import { describe, it, expect } from "vitest";
import sharp, { type Exif } from "sharp";
import fs from "fs";
import path from "path";
import { processListingImage } from "@/lib/watermark";

// Bu testlər iki şeyi qoruyur:
//  1) MƏXFİLİK — telefon şəkillərindəki EXIF/GPS ev sahibinin ünvanını açır.
//     Emaldan sonra metadata QALMAMALIDIR.
//  2) Su nişanı — şəklin özünə yandırılır (yalnız CSS örtüyü deyil).

const OUT_DIR = path.join(process.cwd(), "tests", "__output__");

/** GPS EXIF-i olan sintetik foto (real istifadəçi datası yoxdur). */
async function makePhotoWithGps(): Promise<Buffer> {
  return sharp({
    create: {
      width: 2400,
      height: 1600,
      channels: 3,
      background: { r: 90, g: 120, b: 150 },
    },
  })
    .withMetadata({
      exif: {
        IFD0: { Copyright: "Test Host" },
        // Real telefon şəkillərində GPS bloku olur. sharp-ın TS tipi bu açarı
        // sadalamır, ona görə cast edirik — testin iddiası onsuz da ümumidir:
        // emaldan sonra HEÇ BİR metadata qalmamalıdır.
        GPS: { GPSLatitudeRef: "N", GPSLongitudeRef: "E" },
      } as unknown as Exif,
    })
    .jpeg()
    .toBuffer();
}

describe("processListingImage", () => {
  it("EXIF/GPS metadata TAMAMİLƏ silinir", async () => {
    const input = await makePhotoWithGps();

    // Giriş şəklində metadata həqiqətən var (test etibarlı olsun deyə)
    const before = await sharp(input).metadata();
    expect(before.exif).toBeDefined();

    const out = await processListingImage(input, "jpeg");
    const after = await sharp(out).metadata();

    expect(after.exif).toBeUndefined();
  });

  it("ölçü 1600px ilə məhdudlaşır (aspekt saxlanılır)", async () => {
    const input = await makePhotoWithGps(); // 2400x1600
    const out = await processListingImage(input, "jpeg");
    const meta = await sharp(out).metadata();

    expect(meta.width).toBe(1600);
    expect(meta.height).toBe(Math.round((1600 * 1600) / 2400));
  });

  it("su nişanı şəklin piksellərinə yandırılır (sağ alt künc dəyişir)", async () => {
    const input = await makePhotoWithGps();
    const out = await processListingImage(input, "jpeg");

    const meta = await sharp(out).metadata();
    const w = meta.width!;
    const h = meta.height!;

    // ⚠️ sharp-ın `.stats()`-ı (`.metadata()` kimi) GİRİŞ şəklində işləyir —
    // `.extract()` ona təsir etmir. Ona görə kəsiyi əvvəlcə buffer-ə yazırıq,
    // sonra statistikanı ONDAN alırıq. (Əks halda hər iki ölçmə eyni çıxır.)
    const cornerBuf = await sharp(out)
      .extract({
        left: w - 340,
        top: h - 110,
        width: 320,
        height: 90,
      })
      .toBuffer();
    const corner = await sharp(cornerBuf).stats();

    const plainBuf = await sharp(out)
      .extract({ left: 0, top: 0, width: 320, height: 90 })
      .toBuffer();
    const plain = await sharp(plainBuf).stats();

    const cornerSpread = Math.max(...corner.channels.map((c) => c.stdev));
    const plainSpread = Math.max(...plain.channels.map((c) => c.stdev));

    // Nümunəni assert-dən ƏVVƏL yaz — test sınsa da gözlə baxa bilək
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, "watermark-sample.jpg"), out);

    // Mütləq hədd yerinə NİSBƏT: JPEG sıxılması düz fonda da səs-küy yaradır,
    // ona görə "nişan var" siqnalı = künc fondan xeyli dəyişkəndir.
    expect(cornerSpread).toBeGreaterThan(plainSpread * 2.5);
  });

  it("png və webp formatları da qorunur", async () => {
    const input = await makePhotoWithGps();
    const png = await processListingImage(input, "png");
    const webp = await processListingImage(input, "webp");

    expect((await sharp(png).metadata()).format).toBe("png");
    expect((await sharp(webp).metadata()).format).toBe("webp");
  });
});
