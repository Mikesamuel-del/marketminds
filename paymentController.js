const axios = require("axios");
const User = require("../models/User");

// ==========================
// 💳 DEPOSIT (STK PUSH)
// ==========================
exports.deposit = async (req, res) => {
  try {
    const { amount, phone, userId } = req.body;

    console.log("📤 DEPOSIT REQUEST:", req.body);

    const response = await axios.post(
      `${process.env.INTASEND_BASE_URL}/api/v1/payment/collection/`,
      {
        public_key: process.env.INTASEND_PUBLISHABLE_KEY,
        amount: amount,
        currency: "KES",
        phone_number: phone,
        api_ref: userId,
        method: "M-PESA", // 🔥 VERY IMPORTANT (fixes your earlier error)
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.INTASEND_SECRET_KEY}`,
        },
      }
    );

    console.log("✅ STK SENT:", response.data);

    // ✅ ALWAYS SEND RESPONSE
    res.status(200).json({
      message: "STK Push sent",
      data: response.data,
    });

  } catch (err) {
    console.log("❌ DEPOSIT ERROR:", err.response?.data || err.message);

    // ✅ ALWAYS SEND ERROR RESPONSE
    res.status(500).json({
      error: "Payment failed",
      details: err.response?.data || err.message,
    });
  }
};
// ==========================
// 🔁 CALLBACK (UPDATE BALANCE)
// ==========================
exports.callback = async (req, res) => {
  try {
    console.log("📩 CALLBACK RECEIVED:", req.body);

    const data = req.body;

    // ✅ FIX: access data directly (NOT invoice)
    if (data.state === "COMPLETE") {
      const userId = data.api_ref;
      const amount = Number(data.value);
      const reference =
        data.invoice_id ||
        data.id ||
        data.tracking_id ||
        data.mpesa_reference ||
        undefined;

      const user = await User.findById(userId);

      if (user) {
        user.balance = (user.balance || 0) + amount;
        user.transactions = user.transactions || [];
        // best-effort idempotency: don't duplicate same reference+amount+type
        const already = reference
          ? user.transactions.some(
              (t) =>
                t.type === "deposit" &&
                t.reference === reference &&
                Number(t.amount) === amount
            )
          : false;

        if (!already) {
          user.transactions.unshift({
            type: "deposit",
            direction: "credit",
            amount,
            currency: "KES",
            status: "complete",
            source: "intasend",
            reference,
            note: `Deposit from ${user.phone}`,
            meta: data,
          });

          if (user.transactions.length > 200) {
            user.transactions = user.transactions.slice(0, 200);
          }
        }
        await user.save();

        console.log("✅ BALANCE UPDATED:", user.balance);
      } else {
        console.log("❌ User not found in callback");
      }
    }

    return res.status(200).send("OK");

  } catch (err) {
    console.log("❌ CALLBACK ERROR:", err.message);
    return res.status(500).send("Error");
  }
};