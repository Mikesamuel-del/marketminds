const nodemailer = require("nodemailer");

async function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log({
    host,
    port,
    user,
    passExists: !!pass,
  });

  if (!host || !user || !pass) {
    console.log("SMTP ENV VARIABLES MISSING");
    return null;
  }

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },

  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,
});

  await transporter.verify();

  console.log("SMTP VERIFIED SUCCESSFULLY");

  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const transport = await createTransport();

  if (!transport) {
    return { skipped: true };
  }

  await transport.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, " "),
  });

  return { skipped: false };
}

module.exports = { sendMail };
