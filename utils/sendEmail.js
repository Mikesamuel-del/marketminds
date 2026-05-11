const nodemailer = require("nodemailer");

/**
 * Creates an SMTP transporter when env is configured; otherwise returns null.
 *
 * Supports either:
 * - SMTP_HOST + SMTP_USER + SMTP_PASS (+ optional SMTP_PORT), or
 * - EMAIL_USER + EMAIL_PASS (Gmail / Google Workspace app password; host defaults to smtp.gmail.com).
 */
function createTransport() {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  const host =
    process.env.SMTP_HOST ||
    (user && pass ? "smtp-relay.brevo.com" : null);

  const port = process.env.SMTP_PORT
    ? Number(process.env.SMTP_PORT)
    : 587;

  if (!host || !user || !pass) {
    console.log("SMTP ENV VARIABLES MISSING");
    return null;
  }

return nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  requireTLS: true,

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },

  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});
}

/**
 * Sends an email. Returns { skipped: true } when SMTP is not configured.
 */
async function sendMail({ to, subject, html, text }) {
  const from =
    process.env.EMAIL_FROM ||
    process.env.SMTP_USER ||
    process.env.EMAIL_USER ||
    "no-reply@marketminds.local";
  const transport = createTransport();

  if (!transport) {
    return { skipped: true };
  }

  await transport.sendMail({
    from,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, " "),
  });

  return { skipped: false };
}

module.exports = { sendMail, createTransport };
