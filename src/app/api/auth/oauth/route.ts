import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { oauthLive, setSession, toUserDto } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Apple/Google girişi.
// Canlı açarlar (GOOGLE_CLIENT_ID / APPLE_CLIENT_ID) qoşulana qədər
// DEMO rejimdə işləyir — App Store dərcindən əvvəl real OAuth axını
// (authorization code flow) bu endpoint-ə qoşulacaq.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Yanlış sorğu" }, { status: 400 });
  }

  const provider = body.provider === "apple" ? "apple" : "google";
  const role = body.role === "host" ? "host" : "guest";

  if (oauthLive(provider)) {
    // Real axın: client-dən gələn authorization code burada token-ə
    // dəyişdirilir və provayderdən email/ad alınır.
    return NextResponse.json(
      { error: "OAuth canlı konfiqurasiyası tamamlanmalıdır" },
      { status: 501 }
    );
  }

  // Prod-da açar yoxdursa demo hesabı YARADILMIR — fail closed.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Bu giriş üsulu hazırda əlçatan deyil" },
      { status: 503 }
    );
  }

  // DEMO (yalnız dev): provayder hesabını simulyasiya edən istifadəçi
  const email = `${provider}.demo@gecele.app`;
  const name = provider === "apple" ? "Apple İstifadəçisi" : "Google İstifadəçisi";

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, role, provider },
  });

  const res = NextResponse.json({ user: toUserDto(user), testMode: true });
  setSession(res, user.id);
  return res;
}
