import { describe, expect, it } from "vitest";
import { decryptToken, encryptToken } from "@/lib/crypto";
import { randomBytes } from "node:crypto";

const key = randomBytes(32).toString("base64");

describe("crypto (tokens da Meta)", () => {
  it("faz roundtrip de um token", () => {
    const token = "IGAASuperSecretToken123==";
    const encrypted = encryptToken(token, key);
    expect(encrypted).not.toContain(token);
    expect(decryptToken(encrypted, key)).toBe(token);
  });

  it("gera ciphertexts diferentes para o mesmo token (IV aleatório)", () => {
    const a = encryptToken("token", key);
    const b = encryptToken("token", key);
    expect(a).not.toBe(b);
  });

  it("falha ao descriptografar com outra chave", () => {
    const encrypted = encryptToken("token", key);
    const otherKey = randomBytes(32).toString("base64");
    expect(() => decryptToken(encrypted, otherKey)).toThrow();
  });

  it("falha com ciphertext adulterado", () => {
    const encrypted = encryptToken("token", key);
    const buf = Buffer.from(encrypted, "base64");
    buf[buf.length - 1] ^= 1;
    expect(() => decryptToken(buf.toString("base64"), key)).toThrow();
  });

  it("rejeita chave que não tem 32 bytes", () => {
    expect(() => encryptToken("token", "chave-curta")).toThrow(/32 bytes/);
  });
});
