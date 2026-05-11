const axios = require("axios");

async function sendMail({ to, subject, html }) {
  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "Market Minds",
          email: process.env.EMAIL_FROM,
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    return { skipped: false };
  } catch (err) {
    console.log("BREVO API ERROR:", err.response?.data || err.message);
    return { skipped: true };
  }
}
module.exports = { sendMail };
