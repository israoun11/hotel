const nodemailer = require("nodemailer");
const { env } = require("../config/env");

const { logger } = require("../utils/logger");
const { toISODate } = require("../utils/dates");

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
}

/** Sends a plain-text e-mail. Never throws: a mail failure must not break an API request. */
async function sendMail(to, subject, text) {
  if (!env.EMAIL_ENABLED) {
    logger.debug("E-mail disabled, message not sent", { subject });
    return false;
  }
  try {
    await getTransporter().sendMail({ from: env.EMAIL_FROM, to, subject, text });
    return true;
  } catch (error) {
    logger.error("Failed to send e-mail", { subject, reason: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

function bookingSummary(booking) {
  return [
    `Reference: ${booking.reference}`,
    `Room: ${booking.roomName}`,
    `Dates: ${toISODate(booking.checkIn)} -> ${toISODate(booking.checkOut)} (${booking.nights} night(s))`,
    `Guests: ${booking.adults} adult(s), ${booking.children} child(ren)`,
    `Total: ${booking.pricing.total} ${booking.pricing.currency}`,
    `Status: ${booking.status}`,
  ].join("\n");
}

/** Fire-and-forget notifications (the caller does not wait for SMTP). */
function notifyBookingCreated(booking) {
  if (!env.EMAIL_ENABLED) return;
  const summary = bookingSummary(booking);
  void sendMail(booking.guest.email, `Booking request received - ${booking.reference}`, `Hello ${booking.guest.firstName},\n\nWe received your booking request.\n\n${summary}\n`);
  if (env.HOTEL_NOTIFY_EMAIL) {
    void sendMail(env.HOTEL_NOTIFY_EMAIL, `New booking ${booking.reference}`, `${summary}\n\nGuest: ${booking.guest.firstName} ${booking.guest.lastName} <${booking.guest.email}> ${booking.guest.phone}`);
  }
}

function notifyBookingStatusChanged(booking) {
  if (!env.EMAIL_ENABLED) return;
  void sendMail(booking.guest.email, `Booking ${booking.reference} is now ${booking.status}`, `Hello ${booking.guest.firstName},\n\n${bookingSummary(booking)}\n`);
}

function notifyContactMessage(message) {
  if (!env.EMAIL_ENABLED || !env.HOTEL_NOTIFY_EMAIL) return;
  void sendMail(env.HOTEL_NOTIFY_EMAIL, `New contact message: ${message.subject}`, `From: ${message.name} <${message.email}>\n\n${message.message}`);
}

module.exports = {
  sendMail,
  notifyBookingCreated,
  notifyBookingStatusChanged,
  notifyContactMessage,
};
