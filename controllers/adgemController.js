const User = require("../models/User");

exports.adgemPostback = async (req, res) => {
  try {
    const {
      secret,
      player_id,
      amount,
      transaction_id
    } = req.query;

    // 1. Verify secret (from AdGem dashboard)
    if (secret !== process.env.ADGEM_SECRET) {
      return res.status(403).send("Forbidden");
    }

    // 2. Prevent duplicate rewards
    const userExists = await User.findOne({
      "transactions.reference": transaction_id
    });

    if (userExists) return res.status(200).send("OK");

    // 3. Find user using player_id
    const user = await User.findById(player_id);

    if (!user) return res.status(404).send("User not found");

    // 4. Credit balance
    user.balance = (user.balance || 0) + Number(amount);

    // 5. Save transaction
    user.transactions.unshift({
      type: "ad_reward",
      amount: Number(amount),
      reference: transaction_id,
      source: "adgem"
    });

    await user.save();

    return res.status(200).send("OK");

  } catch (err) {
    console.log("ADGEM POSTBACK ERROR:", err);
    return res.status(500).send("ERROR");
  }
};
