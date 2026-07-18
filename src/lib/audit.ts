import type { NextRequest } from "next/server";
import { prisma } from "./prisma";

// Audit izi — "kim, nə vaxt, nəyi dəyişdi" sualının yeganə cavabı.
// Qayda: pul hərəkəti və ya admin əməliyyatı varsa — audit sətri OLMALIDIR.
// Audit yazısı əsas əməliyyatı ASLA sındırmamalıdır (best-effort).

export type ActorType = "admin" | "user" | "system";

export function requestIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return fwd.split(",")[0]!.trim().slice(0, 45);
}

export async function audit(entry: {
  actor: string;
  actorType: ActorType;
  action: string;
  targetType: string;
  targetId: string;
  meta?: unknown;
  ip?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actor: entry.actor,
        actorType: entry.actorType,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        meta: entry.meta ? JSON.stringify(entry.meta).slice(0, 2000) : "",
        ip: entry.ip ?? "",
      },
    });
  } catch (e) {
    // Audit yazıla bilmirsə əməliyyatı dayandırmırıq, amma səssiz də qalmırıq
    console.error("[audit] yazıla bilmədi:", entry.action, entry.targetId, e);
  }
}
