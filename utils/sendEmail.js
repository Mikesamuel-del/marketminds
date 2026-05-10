const nodemailer = require("nodemailer");

/**
 * Creates an SMTP transporter when env is configured; otherwise returns null.
 *
 * Supports either:
 * - SMTP_HOST + SMTP_USER + SMTP_PASS (+ optional SMTP_PORT), or
 * - EMAIL_USER + EMAIL_PASS (Gmail / Google Workspace app password; host defaults to smtp.gmail.com).
 */
console.log("SMTP_HOST:", process.env.SMTP_HOST);
console.log("SMTP_USER:", process.env.SMTP_USER);
console.log("SMTP_PASS:", process.env.SMTP_PASS ? "EXISTS" : "MISSING");
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
  }

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 2525,
  secure: false, // IMPORTANT
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
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
