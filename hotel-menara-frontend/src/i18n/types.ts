import type { fr } from "./fr";

/** Every language must provide exactly the same keys as the French dictionary. */
export type Dictionary = typeof fr;
export type Lang = "fr" | "en";
