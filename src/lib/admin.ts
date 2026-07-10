import { createHash, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE = "gecele_admin";

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function adminTokenFor(password: string): string {
  return hash(`gecele:${password}`);
}

export function verifyAdmin(req: NextRequest): boolean {
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedPassword) return false;
  const cookie = req.cookies.get(ADMIN_COOKIE)?.value ?? "";
  if (!cookie) return false;
  const expected = Buffer.from(adminTokenFor(expectedPassword));
  const actual = Buffer.from(cookie);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
