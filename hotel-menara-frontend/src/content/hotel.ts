/**
 * Facts published by the hotel on its official website (https://www.menarahammamet.com/, checked 22 October 2026).
 * They are shown when the backend settings still contain the backend's DEMO defaults.
 */
export const OFFICIAL = {
  name: "Hôtel Menara Hammamet",
  street: "Rue de la Paix",
  postalCode: "8050",
  city: "Hammamet",
  country: { fr: "Tunisie", en: "Tunisia" },
  phone: "+216 72 226 999",
  email: "welcome@menarahammamet.com",
  facebook: "https://www.facebook.com/p/Hotel-M%C3%A9nara-100064604412810/",
  instagram: "https://www.instagram.com/hotel_menara/",
  mapUrl: "https://maps.app.goo.gl/LwvtCgzQ3gCEnRnT9",
  website: "https://www.menarahammamet.com/",
} as const;
