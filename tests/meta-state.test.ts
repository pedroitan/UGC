import { describe, expect, it } from "vitest";
import { signMetaState, verifyMetaState } from "@/lib/meta";

const secret = "test-secret";

describe("state do OAuth da Meta", () => {
  it("faz roundtrip do workspace id", () => {
    const state = signMetaState("ws-123", secret);
    expect(verifyMetaState(state, secret)).toEqual({ workspaceId: "ws-123" });
  });

  it("rejeita state adulterado", () => {
    const state = signMetaState("ws-123", secret);
    const [body, sig] = state.split(".");
    const tampered = `${body}.${sig.slice(0, -1)}${sig.endsWith("a") ? "b" : "a"}`;
    expect(verifyMetaState(tampered, secret)).toBeNull();
  });

  it("rejeita state com outro secret", () => {
    const state = signMetaState("ws-123", secret);
    expect(verifyMetaState(state, "outro-secret")).toBeNull();
  });

  it("rejeita state expirado", () => {
    const state = signMetaState("ws-123", secret);
    const future = Date.now() + 11 * 60 * 1000;
    expect(verifyMetaState(state, secret, future)).toBeNull();
  });

  it("rejeita state malformado", () => {
    expect(verifyMetaState("lixo", secret)).toBeNull();
    expect(verifyMetaState("", secret)).toBeNull();
  });
});
