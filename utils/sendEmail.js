const nodemailer = require("nodemailer");

/**
 * Creates an SMTP transporter when env is configured; otherwise returns null.
 *
 * Supports either:
 * - SMTP_HOST + SMTP_USER + SMTP_PASS (+ optional SMTP_PORT), or
 * - EMAIL_USER + EMAIL_PASS (Gmail / Google Workspace app password; host defaults to smtp.gmail.com).
 */

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
