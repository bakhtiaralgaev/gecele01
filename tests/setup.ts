import "dotenv/config";

// Prisma klienti import olunmazdan ƏVVƏL test bazasını göstər.
// Testlər AYRI Neon branch-ında ("test") işləyir — production-a toxunmur.
const TEST_URL = process.env.TEST_DATABASE_URL;
if (!TEST_URL) {
  throw new Error(
    "TEST_DATABASE_URL təyin edilməyib. .env-ə Neon `test` branch-ının URL-ini yazın."
  );
}

// HƏR İKİSİ əvəz olunmalıdır. DIRECT_URL olduğu kimi qalsa, sxem əməliyyatları
// production-a gedər — schema.prisma migration-lar üçün məhz onu işlədir.
process.env.DATABASE_URL = TEST_URL;
process.env.DIRECT_URL = TEST_URL;

// Sessiya imzası üçün sabit test açarı
process.env.AUTH_SECRET = "test-secret-do-not-use-in-prod";

// Şlüzlərin təsadüfən "canlı" rejimə düşməməsi üçün açarları təmizlə
delete process.env.PAYRIFF_MERCHANT_ID;
delete process.env.PAYRIFF_SECRET_KEY;
delete process.env.SMS_API_KEY;
delete process.env.BLOB_READ_WRITE_TOKEN;
