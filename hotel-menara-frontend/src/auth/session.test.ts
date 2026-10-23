import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSessionStore, SESSION_KEY, type KeyValueStorage } from "./session";

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v), removeItem: (k) => void delete data[k] };
}
const admin = { id: "1", email: "admin@hotel.tn", name: "Admin" };

describe("Administrator session (login / logout / expiry)", () => {
  it("stores the token with its expiry after login", () => {
    const storage = memoryStorage();
    const store = createSessionStore(storage, () => 1_000);
    const session = store.save("jwt", 3600, admin);
    assert.equal(session.expiresAt, 1_000 + 3_600_000);
    assert.equal(JSON.parse(storage.data[SESSION_KEY]).token, "jwt");
    assert.equal(store.get()?.token, "jwt");
  });

  it("restores a valid session and drops an expired one", () => {
    const valid = memoryStorage({ [SESSION_KEY]: JSON.stringify({ token: "a", expiresAt: 10_000_000, admin }) });
    assert.equal(createSessionStore(valid, () => 0).get()?.token, "a");
    const expired = memoryStorage({ [SESSION_KEY]: JSON.stringify({ token: "a", expiresAt: 30_000, admin }) });
    assert.equal(createSessionStore(expired, () => 0).get(), null, "less than one minute left counts as expired");
    assert.equal(expired.data[SESSION_KEY], undefined);
  });

  it("ignores corrupted stored data", () => {
    const storage = memoryStorage({ [SESSION_KEY]: "{not json" });
    assert.equal(createSessionStore(storage).get(), null);
  });

  it("expires while the page is open and remembers why", () => {
    let now = 0;
    const store = createSessionStore(memoryStorage(), () => now);
    store.save("jwt", 60, admin);
    now = 61_000;
    assert.equal(store.get(), null);
    assert.equal(store.lastEndReason(), "expired");
  });

  it("logout clears the session and notifies listeners", () => {
    const storage = memoryStorage();
    const store = createSessionStore(storage);
    const seen: Array<string | null> = [];
    store.subscribe((s) => seen.push(s?.token ?? null));
    store.save("jwt", 3600, admin);
    store.clear("logout");
    assert.deepEqual(seen, ["jwt", null]);
    assert.equal(storage.data[SESSION_KEY], undefined);
    assert.equal(store.lastEndReason(), "logout");
  });

  it("still works when storage is unavailable", () => {
    const broken: KeyValueStorage = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    const store = createSessionStore(broken);
    store.save("jwt", 3600, admin);
    assert.equal(store.get()?.token, "jwt");
  });
});
