const User = require("../models/User");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendMail } = require("../utils/sendEmail");

const JWT_SECRET = process.env.JWT_SECRET || "marketmindssecret";

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Collision-resistant referral codes (uppercase alphanumeric). */
const generateUniqueReferralCode = async () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 16; attempt += 1) {
    let code = "";
    const bytes = crypto.randomBytes(8);
    for (let j = 0; j < 8; j += 1) {
      code += chars[bytes[j] % chars.length];
    }
    const exists = await User.exists({ referralCode: code });
    if (!exists) return code;
  }
  throw new Error("Could not generate referral code");
};

const resolveReferrerByCode = async (codeRaw) => {
  const trimmed = codeRaw && String(codeRaw).trim();
  if (!trimmed) return null;
  return User.findOne({
    referralCode: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, "i") },
  });
};

const sanitizeUserForClient = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  balance: user.balance,
  package: user.package,
  referralCode: user.referralCode,
  referralCount: user.referralCount ?? user.referrals ?? 0,
});

const getPackageRules = (packageType) => {
  switch ((packageType || "none").toLowerCase()) {
    case "gold":
      return { minWithdraw: 2000, maxTotalWithdraw: Infinity };
    case "silver":
      return { minWithdraw: 2500, maxTotalWithdraw: 100000 };
    case "bronze":
      return { minWithdraw: 5, maxTotalWithdraw: 20000 };
    default:
      return null;
  }
};

const pushTransaction = async (user, tx) => {
  if (!user) return;
  user.transactions = user.transactions || [];
  user.transactions.unshift({
    ...tx,
    amount: Number(tx.amount),
  });
  // keep last 200 for safety
  if (user.transactions.length > 200) {
    user.transactions = user.transactions.slice(0, 200);
  }
  await user.save();
};

// =====================================
// REGISTER USER
// =====================================
const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      referredBy,
    } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, phone and password are required",
      });
    }

    // CHECK EXISTING USER
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email or phone already exists",
      });
    }

    let referrerDoc = null;
    const refInput =
      referredBy && String(referredBy).trim()
        ? String(referredBy).trim()
        : null;

    if (refInput) {
      referrerDoc = await resolveReferrerByCode(refInput);
      if (!referrerDoc) {
        return res.status(400).json({
          success: false,
          message: "Invalid referral code",
        });
      }

      if (
        referrerDoc.email &&
        String(referrerDoc.email).toLowerCase() ===
          String(email).toLowerCase()
      ) {
        return res.status(400).json({
          success: false,
          message: "You cannot refer yourself",
        });
      }

      if (
        referrerDoc.phone &&
        String(referrerDoc.phone).trim() === String(phone).trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "You cannot refer yourself",
        });
      }
    }

    const referralCode = await generateUniqueReferralCode();

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      referredBy: referrerDoc ? referrerDoc.referralCode : undefined,
      referrerId: referrerDoc ? referrerDoc._id : null,
      referralCode,
      balance: 0,
      package: "none",
      referralCount: 0,
    });

    await user.save();

    if (referrerDoc) {
      referrerDoc.referralCount = (referrerDoc.referralCount || 0) + 1;
      await referrerDoc.save();
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: sanitizeUserForClient(user),
    });

  } catch (error) {
    console.log("REGISTER ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
};

// =====================================
// LOGIN USER
// =====================================
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // FIND USER
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // CHECK PASSWORD
    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // CREATE TOKEN
    const token = jwt.sign(
      { id: user._id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: sanitizeUserForClient(user),
    });

  } catch (error) {
    console.log("LOGIN ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

// =====================================
// CREATE USER
// =====================================
const createUser = async (req, res) => {
  try {
    const { name, email, referredBy } = req.body;

    const referralCode = await generateUniqueReferralCode();

    const user = new User({
      name,
      email,
      referredBy,
      referralCode,
      balance: 0,
      package: "none",
      referralCount: 0,
    });

    await user.save();

    res.json(user);

  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: "Failed to create user",
    });
  }
};

// =====================================
// GET USER
// =====================================
const getUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (
      !id ||
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        error: "Invalid user ID",
      });
    }

    const user = await User.findById(id).select(
      "-password -resetPasswordToken -resetPasswordExpire"
    );

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    res.json(user);

  } catch (error) {
    console.log("GET USER ERROR:", error);

    res.status(500).json({
      error: "Server error",
    });
  }
};

// =====================================
// GET TRANSACTIONS
// =====================================
const getTransactions = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(Number(req.query.limit || 50), 200);
    const offset = Math.max(Number(req.query.offset || 0), 0);

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const user = await User.findById(id).select("transactions");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const txs = Array.isArray(user.transactions) ? user.transactions : [];
    const page = txs.slice(offset, offset + limit);

    return res.json({
      success: true,
      total: txs.length,
      limit,
      offset,
      transactions: page,
    });
  } catch (error) {
    console.log("GET TRANSACTIONS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load transactions" });
  }
};

// =====================================
// WITHDRAW
// =====================================
const axios = require("axios");

const withdraw = async (req, res) => {
  try {
    let { userId, amount } = req.body;

    amount = Number(amount);

    // VALIDATE AMOUNT
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid withdrawal amount",
      });
    }

    // FIND USER
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // MUST HAVE PACKAGE
    if (
      !user.package ||
      user.package === "none"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Buy a package first to withdraw",
      });
    }

    // PACKAGE RULES
    const rules = getPackageRules(
      user.package
    );

    if (!rules) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid package",
      });
    }

    // MINIMUM WITHDRAW
    if (amount < rules.minWithdraw) {
      return res.status(400).json({
        success: false,
        message: `Minimum withdrawal for ${user.package} is KES ${rules.minWithdraw}`,
      });
    }

    // MAX TOTAL WITHDRAW
    const totalWithdrawn = Number(
      user.totalWithdrawn || 0
    );

    if (
      Number.isFinite(
        rules.maxTotalWithdraw
      ) &&
      totalWithdrawn + amount >
        rules.maxTotalWithdraw
    ) {
      return res.status(400).json({
        success: false,
        message: `Withdrawal limit reached for ${user.package}`,
      });
    }

    // CHECK BALANCE
    if (user.balance < amount) {
      return res.status(400).json({
        success: false,
        message:
          "Insufficient balance",
      });
    }

    // FORMAT PHONE NUMBER
    const formattedPhone =
      String(user.phone)
        .replace(/\s/g, "")
        .replace("+", "")
        .replace(/^0/, "254");

    // GET URL FROM ENV
    const INTASEND_PAYOUT_URL =
      process.env
        .INTASEND_PAYOUT_URL;

    // SEND MPESA PAYOUT
    const payoutResponse =
      await axios.post(
        `${INTASEND_PAYOUT_URL}/api/v1/payouts/`,
        {
          currency: "KES",
          amount,
          phone_number:
            formattedPhone,
          method: "MPESA",
          narrative:
            "Market Minds Withdrawal",
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.INTASEND_SECRET_KEY}`,
            "Content-Type":
              "application/json",
          },
        }
      );

    console.log(
      "INTASEND RESPONSE:",
      payoutResponse.data
    );

    // CHECK PAYOUT RESPONSE
    if (
      !payoutResponse.data ||
      payoutResponse.data.status ===
        "FAILED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Withdrawal payout failed",
      });
    }

    // DEDUCT BALANCE
    user.balance -= amount;

    user.totalWithdrawn =
      (user.totalWithdrawn || 0) +
      amount;

    await user.save();

    // SAVE TRANSACTION
    await pushTransaction(user, {
      type: "withdraw",
      direction: "debit",
      amount,
      currency: "KES",
      status: "complete",
      source: "intasend",
      note: `Withdraw to ${formattedPhone}`,
      meta: {
        payout:
          payoutResponse.data,
      },
    });

    // SUCCESS RESPONSE
    return res.json({
      success: true,
      message:
        "Withdrawal successful",
      balance: user.balance,
      payout: payoutResponse.data,
      user: sanitizeUserForClient(
        user
      ),
    });

  } catch (error) {
    console.log(
      "WITHDRAW ERROR:",
      error?.response?.data ||
        error.message
    );

    return res.status(500).json({
      success: false,
      message:
        error?.response?.data
          ?.detail ||
        error.message ||
        "Withdrawal failed",
    });
  }
};

// =====================================
// BUY PACKAGE
// =====================================
const buyPackage = async (req, res) => {
  try {
    const { userId, packageType } =
      req.body;

    const prices = {
      gold: 500,
      silver: 200,
      bronze: 100,
    };

    const referralEarnings = {
      gold: 200,
      silver: 80,
      bronze: 45,
    };

    const user = await User.findById(
      userId
    );

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    const price =
      prices[packageType];

    if (!price) {
      return res.status(400).json({
        error: "Invalid package",
      });
    }

    // CHECK BALANCE
    if (user.balance < price) {
      return res.status(400).json({
        success: false,
        message:
          "Insufficient balance",
      });
    }

    // BUY PACKAGE
    user.balance -= price;
    user.package = packageType;

    await user.save();

    await pushTransaction(user, {
      type: "package_purchase",
      direction: "debit",
      amount: price,
      currency: "KES",
      status: "complete",
      source: "system",
      note: `${packageType} package purchase`,
      meta: { packageType },
    });

    // REFERRAL BONUS
    let referrer = null;

    if (user.referrerId) {
      referrer =
        await User.findById(
          user.referrerId
        );
    }

    if (
      !referrer &&
      user.referredBy
    ) {
      referrer =
        await resolveReferrerByCode(
          user.referredBy
        );
    }

    if (referrer) {
      const bonus =
        referralEarnings[
          packageType
        ];

      referrer.balance += bonus;

      referrer.referral =
        (referrer.referral || 0) +
        bonus;

      await referrer.save();

      await pushTransaction(
        referrer,
        {
          type:
            "referral_bonus",
          direction: "credit",
          amount: bonus,
          currency: "KES",
          status: "complete",
          source: "system",
          note: `Referral bonus from ${user.email}`,
          meta: {
            fromUserId:
              user._id,
            packageType,
          },
        }
      );
    }

    return res.json({
      success: true,
      message: `${packageType} package purchased successfully`,
      balance: user.balance,
      user:
        sanitizeUserForClient(
          user
        ),
    });

  } catch (error) {
    console.log(
      "BUY PACKAGE ERROR:",
      error
    );

    return res.status(500).json({
      error: "Purchase failed",
    });
  }
};

// =====================================
// FORGOT PASSWORD
// =====================================
const forgotPassword = async (req, res) => {
  const genericMessage =
    "If an account exists for that email, we sent reset instructions.";

  try {
    const { email } = req.body;

    if (!email || !String(email).trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalized = String(email).trim().toLowerCase();

    const user = await User.findOne({
      email: { $regex: new RegExp(`^${escapeRegex(normalized)}$`, "i") },
    });

    // Same response whether or not the user exists (avoid email enumeration)
    if (!user) {
      return res.json({ success: true, message: genericMessage });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000);
    await user.save({ validateModifiedOnly: true });

    const frontend = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetUrl = `${String(frontend).replace(/\/$/, "")}/reset-password/${resetToken}`;

    const result = await sendMail({
      to: user.email,
      subject: "Reset your Market Minds password",
      html: `
        <p>You requested a password reset.</p>
        <p><a href="${resetUrl}">Reset your password</a></p>
        <p>This link expires in one hour. If you did not request this, you can ignore this email.</p>
      `,
    });

    if (result.skipped) {
      console.warn(
        "[forgotPassword] SMTP not configured; reset URL (dev only):",
        resetUrl
      );
    }

    return res.json({ success: true, message: genericMessage });
  } catch (error) {
    console.log("FORGOT PASSWORD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Could not process password reset request",
    });
  }
};


// =====================================
// RESET PASSWORD
// =====================================
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!token || !String(token).trim()) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset link",
      });
    }

    if (!password || String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    if (confirmPassword !== undefined && confirmPassword !== password) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(String(token).trim())
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    user.password = await bcrypt.hash(String(password), 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    const tokenJwt = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.json({
      success: true,
      message: "Password updated successfully",
      token: tokenJwt,
      user: sanitizeUserForClient(user),
    });
  } catch (error) {
    console.log("RESET PASSWORD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Password reset failed",
    });
  }
};

// =====================================
// UPDATE PROFILE (NAME/PHONE)
// =====================================
const updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (phone && phone !== user.phone) {
      const exists = await User.findOne({ phone, _id: { $ne: id } });
      if (exists) {
        return res.status(400).json({
          success: false,
          message: "Phone already exists",
        });
      }
      user.phone = phone;
    }

    if (name) user.name = name;

    await user.save();

    return res.json({
      success: true,
      message: "Profile updated",
      user: sanitizeUserForClient(user),
    });
  } catch (error) {
    console.log("UPDATE PROFILE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Profile update failed",
    });
  }
};

// =====================================
// EXPORTS
// =====================================
module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  createUser,
  getUser,
  getTransactions,
  updateProfile,
  withdraw,
  buyPackage,
};
