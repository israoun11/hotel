const { z } = require("zod");
const { atLeastOneField, atLeastOneFieldMessage, emailField, httpUrl } = require("./common");

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "must use HH:MM (24h)");

const updateSettingsBody = z
  .object({
    hotelName: z.string().trim().min(2).max(120),
    tagline: z.string().trim().max(200),
    description: z.string().trim().max(3000),
    address: z
      .object({ street: z.string().trim().max(200), city: z.string().trim().max(100), country: z.string().trim().max(100) })
      .strict()
      .partial(),
    contact: z
      .object({ phone: z.string().trim().max(30), email: emailField })
      .strict()
      .partial(),
    socialLinks: z
      .object({ facebook: httpUrl, instagram: httpUrl })
      .strict()
      .partial(),
    checkInTime: time,
    checkOutTime: time,
    currency: z.string().regex(/^[A-Z]{3}$/, "must be a 3-letter ISO code such as TND"),
    taxRatePercent: z.number().min(0).max(100),
    touristTaxPerAdultPerNight: z.number().min(0).max(1000),
    maxStayNights: z.number().int().min(1).max(90),
    cancellationPolicy: z.string().trim().max(3000),
    isBookingEnabled: z.boolean(),
  })
  .strict()
  .partial()
  .refine(atLeastOneField, atLeastOneFieldMessage);

module.exports = {
  updateSettingsBody,
};
