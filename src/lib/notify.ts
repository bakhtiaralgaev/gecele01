// Bildiriş abstraksiyası — email (Resend) və SMS (provayder).
// Açar yoxdursa demo rejim: konsola yazılır və uğurlu sayılır.

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Gecələ <bildiris@gecele.az>";
  if (!key) {
    console.log(`[EMAIL demo] → ${to} | ${subject}\n${html}`);
    return true;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(8_000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendSms(to: string, text: string): Promise<boolean> {
  const key = process.env.SMS_API_KEY;
  if (!key) {
    console.log(`[SMS demo] → ${to} | ${text}`);
    return true;
  }
  try {
    // Provayder endpoint-i (məs. LSIM/Twilio) — açar aktivləşəndə doldurulur
    const url = process.env.SMS_API_URL;
    if (!url) return false;
    const res = await fetch(url, {
      method: "POST",
      signal: AbortSignal.timeout(8_000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        to,
        text,
        sender: process.env.SMS_SENDER ?? "Gecele",
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface BookingNotice {
  code: string;
  title: string;
  region: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestName: string;
  guestPhone: string;
  deposit: number;
  total: number;
  hostPhone?: string;
  guestEmail?: string | null;
}

// Rezervasiya təsdiqləndikdə: qonağa kod, ev sahibinə yeni rezerv xəbəri.
export async function notifyBookingConfirmed(b: BookingNotice): Promise<void> {
  const guestMsg =
    `Gecələ: rezervasiyanız təsdiqləndi! ${b.title} (${b.region}), ` +
    `${b.checkIn}–${b.checkOut}. Kod: ${b.code}. Beh ${b.deposit}₼ qorunur.`;
  await sendSms(b.guestPhone, guestMsg);

  if (b.guestEmail) {
    await sendEmail(
      b.guestEmail,
      `Rezervasiya təsdiqləndi — kod ${b.code}`,
      `<h2>Rezervasiyanız təsdiqləndi</h2>` +
        `<p>${b.title}, ${b.region}<br>${b.checkIn} → ${b.checkOut} · ${b.guests} qonaq</p>` +
        `<p><b>Rezervasiya kodu: ${b.code}</b></p>` +
        `<p>Beh ${b.deposit}₼ Beh Qorumasında saxlanılır. Qalıq ${b.total - b.deposit}₼ girişdə ödənilir.</p>`
    );
  }

  if (b.hostPhone) {
    await sendSms(
      b.hostPhone,
      `Gecələ: yeni rezervasiya! ${b.title}, ${b.checkIn}–${b.checkOut}, ` +
        `${b.guests} qonaq (${b.guestName}, ${b.guestPhone}).`
    );
  }
}

// Tərk edilmiş rezerv xatırlatması — ödənişə çatıb getmiş qonağa SMS.
// İtən rezervasiyaların bir hissəsini geri qaytarır (marketplace pleybuku).
export async function notifyAbandonedBooking(a: {
  guestPhone: string;
  guestEmail?: string | null;
  title: string;
  region: string;
  bookingUrl: string;
}): Promise<void> {
  const msg =
    `Gecələ: ${a.region}dakı "${a.title}" üçün rezervasiyanız yarımçıq qaldı. ` +
    `Bəyəndinizsə yenidən baxın — Beh Qoruması ilə ödənişiniz təhlükəsizdir.`;
  await sendSms(a.guestPhone, msg);
  if (a.guestEmail) {
    await sendEmail(
      a.guestEmail,
      `${a.title} — rezervasiyanız yarımçıq qaldı`,
      `<h2>Rezervasiyanızı tamamlamadınız</h2>` +
        `<p>${a.title}, ${a.region} üçün başladığınız rezervasiya tamamlanmadı. ` +
        `Tarixlər hələ də uyğun ola bilər — yoxlamaq üçün evə yenidən baxın.</p>` +
        `<p>Beh Qoruması ilə behiniz ev sahibinə deyil, platformada qalır — ` +
        `risk yoxdur.</p>` +
        `<p><a href="${a.bookingUrl}">Evə yenidən bax →</a></p>`
    );
  }
}
