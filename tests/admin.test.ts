import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import {
  ADMIN_COOKIE,
  makeAdminToken,
  verifyAdmin,
  verifyAdminPassword,
} from "@/lib/admin";

// 2026-07-17-də tapılan zəiflik: admin kukisi = sha256("gecele:"+parol) —
// SABİT dəyər, serverdə müddət yoxlanışı YOX idi. Kuki bir dəfə sızsa əbədi admin.
// Bu testlər həmin vəziyyətin qayıtmasının qarşısını alır.

function reqWithCookie(token: string): NextRequest {
  return new NextRequest("http://localhost/api/admin/action", {
    headers: { cookie: `${ADMIN_COOKIE}=${token}` },
  });
}

beforeAll(() => {
  process.env.ADMIN_PASSWORD = "test-admin-pw";
});

describe("Admin parolu", () => {
  it("düzgün parol qəbul olunur, yanlış rədd", () => {
    expect(verifyAdminPassword("test-admin-pw")).toBe(true);
    expect(verifyAdminPassword("yanlis")).toBe(false);
    expect(verifyAdminPassword("")).toBe(false);
  });
});

describe("Admin sessiya tokeni", () => {
  it("etibarlı token qəbul olunur", () => {
    expect(verifyAdmin(reqWithCookie(makeAdminToken()))).toBe(true);
  });

  it("kuki yoxdursa rədd", () => {
    const req = new NextRequest("http://localhost/api/admin/action");
    expect(verifyAdmin(req)).toBe(false);
  });

  it("MÜDDƏTİ BİTMİŞ token rədd olunur (server tərəfdə yoxlanılır)", () => {
    const past = String(Date.now() - 1000);
    const valid = makeAdminToken();
    const sig = valid.split(".")[1];
    expect(verifyAdmin(reqWithCookie(`${past}.${sig}`))).toBe(false);
  });

  it("imzası dəyişdirilmiş token rədd olunur", () => {
    const valid = makeAdminToken();
    const [exp] = valid.split(".");
    expect(verifyAdmin(reqWithCookie(`${exp}.saxta-imza`))).toBe(false);
  });

  it("gələcək exp uydurmaqla token saxtalaşdırmaq olmur", () => {
    const farFuture = String(Date.now() + 10 * 365 * 24 * 3600_000);
    expect(verifyAdmin(reqWithCookie(`${farFuture}.hec-ne`))).toBe(false);
  });

  it("KÖHNƏ format (sha256 hash) artıq keçmir", () => {
    const legacy =
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    expect(verifyAdmin(reqWithCookie(legacy))).toBe(false);
  });

  it("parol dəyişəndə köhnə tokenlər ETİBARSIZ olur", () => {
    const token = makeAdminToken();
    expect(verifyAdmin(reqWithCookie(token))).toBe(true);

    process.env.ADMIN_PASSWORD = "yeni-parol"; // rotasiya
    expect(verifyAdmin(reqWithCookie(token))).toBe(false);

    process.env.ADMIN_PASSWORD = "test-admin-pw"; // bərpa
  });

  it("ADMIN_PASSWORD yoxdursa heç kim admin deyil", () => {
    const token = makeAdminToken();
    const saved = process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_PASSWORD;
    expect(verifyAdmin(reqWithCookie(token))).toBe(false);
    process.env.ADMIN_PASSWORD = saved;
  });
});
