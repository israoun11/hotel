import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dictionaries, resolveInitialLang } from "./index";

/** Lists every key path of a nested dictionary, with the kind of value found there. */
function shape(value: unknown, path = ""): string[] {
  if (typeof value === "function") return [`${path}:fn${value.length}`];
  if (Array.isArray(value)) return [`${path}:array${value.length}`, ...value.flatMap((v, i) => shape(v, `${path}[${i}]`))];
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k));
  return [`${path}:${typeof value}`];
}

describe("Languages", () => {
  it("French and English have exactly the same keys, lists and functions", () => {
    assert.deepEqual(shape(dictionaries.en), shape(dictionaries.fr));
  });

  it("no text is left empty or untranslated placeholder", () => {
    for (const dict of Object.values(dictionaries)) {
      for (const line of shape(dict)) assert.ok(!line.endsWith(":undefined"), line);
    }
    const flat = (v: unknown): string[] => (typeof v === "string" ? [v] : v && typeof v === "object" ? Object.values(v).flatMap(flat) : []);
    for (const dict of Object.values(dictionaries)) assert.ok(flat(dict).every((text) => text.trim().length > 0));
  });

  it("chooses the stored language, then the browser language, then French", () => {
    assert.equal(resolveInitialLang("en", ["fr-FR"]), "en");
    assert.equal(resolveInitialLang(null, ["de-DE", "en-US"]), "en");
    assert.equal(resolveInitialLang(null, ["fr-TN"]), "fr");
    assert.equal(resolveInitialLang("xx", ["ar-TN"]), "fr");
  });

  it("switching language changes the visible texts", () => {
    assert.equal(dictionaries.fr.nav.book, "Réserver");
    assert.equal(dictionaries.en.nav.book, "Book");
    assert.equal(dictionaries.fr.common.nights(2), "2 nuits");
    assert.equal(dictionaries.en.common.nights(1), "1 night");
  });
});
