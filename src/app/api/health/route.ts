import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Uptime monitorinqi üçün sağlamlıq yoxlaması (UptimeRobot / Better Stack).
// DB-yə real sorğu atır — "server ayaqdadır, amma baza ölüb" halını tutur.
// Heç bir həssas məlumat qaytarmır.
export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      db: "up",
      latencyMs: Date.now() - startedAt,
      ts: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        db: "down",
        latencyMs: Date.now() - startedAt,
        ts: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
