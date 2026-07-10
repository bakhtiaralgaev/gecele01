// Sessiya və parol infrastrukturu.
// Token formatı: userId.expiry.HMAC — httpOnly kukidə saxlanılır.

import {
  createHmac,
  randomBytes,
  randomInt,
  scryptSync,
  timingSafeEqual,
} from "crypto";
import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import { prisma } from "./prisma";

export const SESSION_COOKIE = "gecele_session";
const SESSION_DAYS = 30;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length > 0) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET təyin edilməyib — canlı mühitdə sessiya imzası üçün mütləqdir"
    );
  }
  return "gecele-dev-secret";
}

export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = scryptSync(pw, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return expected.length === test.length && timingSafeEqual(expected, test);
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function makeToken(userId: string): string {
  const exp = Date.now() + SESSION_DAYS * 24 * 3600 * 1000;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function parseToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expStr, sig] = parts;
  const expected = sign(`${userId}.${expStr}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (!/^\d+$/.test(expStr) || Number(expStr) < Date.now()) return null;
  return userId;
}

export async function getSessionUser(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = parseToken(token);
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

export function setSession(res: NextResponse, userId: string) {
  res.cookies.set(SESSION_COOKIE, makeToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
}

export function clearSession(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export interface UserDto {
  id: string;
  role: string;
  name: string;
  email: string | null;
  phone: string | null;
  provider: string;
}

export function toUserDto(u: {
  id: string;
  role: string;
  name: string;
  email: string | null;
  phone: string | null;
  provider: string;
}): UserDto {
  return {
    id: u.id,
    role: u.role,
    name: u.name,
    email: u.email,
    phone: u.phone,
    provider: u.provider,
  };
}

export function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-()]/g, "");
}

export function isValidPhone(p: string): boolean {
  return /^\+?\d{9,13}$/.test(p);
}

export function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

// OAuth/SMS canlı açarları yoxdursa demo rejim aktivdir
export function oauthLive(provider: "google" | "apple"): boolean {
  if (provider === "google")
    return Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    );
  return Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_KEY_ID);
}

export function smsLive(): boolean {
  return Boolean(process.env.SMS_API_KEY);
}

export const TEST_OTP = "1234";

// OTP və parol-bərpa: canlı SMS/email rejimi üçün (demo-da TEST_OTP kifayətdir)
export function generateOtp(): string {
  return String(randomInt(1000, 10000)); // 4 rəqəmli
}

export function hashOtp(phone: string, code: string): string {
  return createHmac("sha256", secret())
    .update(`${phone}:${code}`)
    .digest("hex");
}

// Parol bərpası — stateless token. İmza istifadəçinin cari passwordHash-ı ilə
// bağlıdır: parol dəyişən kimi bütün köhnə linklər avtomatik etibarsız olur.
export function makeResetToken(userId: string, passwordHash: string): string {
  const exp = Date.now() + 3600_000; // 1 saat
  const payload = `${userId}.${exp}`;
  const sig = createHmac("sha256", `${secret()}:reset:${passwordHash}`)
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyResetToken(
  token: string,
  passwordHash: string
): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expStr, sig] = parts;
  const expected = createHmac("sha256", `${secret()}:reset:${passwordHash}`)
    .update(`${userId}.${expStr}`)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (!/^\d+$/.test(expStr) || Number(expStr) < Date.now()) return null;
  return userId;
}
