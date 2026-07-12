import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  TEST_OTP,
  generateOtp,
  hashOtp,
  isValidPhone,
  normalizePhone,
  setSession,
  smsLive,
  toUserDto,
} from "@/lib/auth";
import { sendSms } from "@/lib/notify";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const OTP_TTL_MIN = 5;
const OTP_MAX_ATTEMPTS = 5;

// Addım 1: OTP göndər (SMS provayderi qoşulana qədər demo-da test kodu 1234)
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "otp-send", 5, 5 * 60_000);
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Yanlış sorğu" }, { status: 400 });
  }

  const phone = normalizePhone(String(body.phone ?? ""));
  if (!isValidPhone(phone)) {
    return NextResponse.json(
      { error: "Telefon nömrəsini düzgün yazın (məs: +994501234567)" },
      { status: 400 }
    );
  }

  if (!smsLive() && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "SMS xidməti hazırda konfiqurasiya olunmayıb" },
      { status: 503 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { phone } });

  if (smsLive()) {
    const code = generateOtp();
    await prisma.otpCode.deleteMany({ where: { phone } });
    await prisma.otpCode.create({
      data: {
        phone,
        codeHash: hashOtp(phone, code),
        expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60_000),
      },
    });
    const sent = await sendSms(
      phone,
      `Gecələ təsdiq kodunuz: ${code}. ${OTP_TTL_MIN} dəqiqə etibarlıdır.`
    );
    if (!sent) {
      return NextResponse.json(
        { error: "SMS göndərilmədi — bir azdan yenidən cəhd edin" },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, testMode: false, isNewUser: !existing });
  }

  // Demo rejim: SMS yoxdur, universal test kodu (TEST_OTP) işləyir
  return NextResponse.json({ ok: true, testMode: true, isNewUser: !existing });
}

// Addım 2: OTP təsdiqi → giriş və ya yeni hesab
export async function PUT(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Yanlış sorğu" }, { status: 400 });
  }

  const phone = normalizePhone(String(body.phone ?? ""));
  const otp = String(body.otp ?? "").trim();
  const name = String(body.name ?? "").trim();
  const role = body.role === "host" ? "host" : "guest";

  if (!isValidPhone(phone)) {
    return NextResponse.json({ error: "Telefon nömrəsi yanlışdır" }, { status: 400 });
  }

  if (!smsLive() && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "SMS xidməti hazırda konfiqurasiya olunmayıb" },
      { status: 503 }
    );
  }

  if (smsLive()) {
    const record = await prisma.otpCode.findFirst({
      where: { phone },
      orderBy: { createdAt: "desc" },
    });
    if (!record || record.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Kodun müddəti bitib — yeni kod istəyin" },
        { status: 401 }
      );
    }
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: "Çox sayda yanlış cəhd — yeni kod istəyin" },
        { status: 429 }
      );
    }
    if (record.codeHash !== hashOtp(phone, otp)) {
      await prisma.otpCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json({ error: "Kod yanlışdır" }, { status: 401 });
    }
    await prisma.otpCode.deleteMany({ where: { phone } });
  } else if (otp !== TEST_OTP) {
    return NextResponse.json({ error: "Kod yanlışdır" }, { status: 401 });
  }

  let user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    if (name.length < 2) {
      return NextResponse.json(
        { error: "Adınızı yazın", needName: true },
        { status: 400 }
      );
    }
    user = await prisma.user.create({
      data: { name, phone, role, provider: "phone" },
    });
  }

  const res = NextResponse.json({ user: toUserDto(user) });
  setSession(res, user.id);
  return res;
}
