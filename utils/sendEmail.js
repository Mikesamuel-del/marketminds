const nodemailer = require("nodemailer");

function createTransport() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.log("Missing EMAIL_USER or EMAIL_PASS");
    return null;
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
}

async function sendMail({ to, subject, html }) {
  const transport = createTransport();

  if (!transport) {
    throw new Error("SMTP not configured");
  }

  await transport.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  });

  console.log("Email sent successfully");
}

module.exports = { sendMail };
