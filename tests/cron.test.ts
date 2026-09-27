import { describe, expect, it } from "vitest";
import { isCronAuthorized } from "@/lib/cron";

function req(auth?: string) {
  return new Request("https://app.test/api/cron/publish", {
    headers: auth ? { authorization: auth } : {},
  });
}

describe("proteção das rotas de cron", () => {
  it("aceita Authorization: Bearer <secret>", () => {
    expect(isCronAuthorized(req("Bearer abc123"), "abc123")).toBe(true);
  });

  it("rejeita secret errado", () => {
    expect(isCronAuthorized(req("Bearer errado"), "abc123")).toBe(false);
  });

  it("rejeita sem header", () => {
    expect(isCronAuthorized(req(), "abc123")).toBe(false);
  });

  it("rejeita quando CRON_SECRET não está configurado", () => {
    expect(isCronAuthorized(req("Bearer x"), undefined)).toBe(false);
  });
});
