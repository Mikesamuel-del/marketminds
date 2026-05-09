const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      unique: true,
      required: true,
    },

    phone: {
      type: String,
      unique: true,
      required: true,
    },

    password: {
      type: String,
      required: true,
    },

    balance: {
      type: Number,
      default: 0,
    },

    package: {
      type: String,
      default: "none",
    },

    referralCode: {
      type: String,
    },

    /** Referrer's public code entered at signup (legacy / bonus lookup). */
    referredBy: {
      type: String,
    },

    /** Direct link to the referrer document for analytics and counting. */
    referrerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    referral: {
      type: Number,
      default: 0,
    },

    referrals: {
      type: Number,
      default: 0,
    },

    referralCount: {
      type: Number,
      default: 0,
    },

    totalWithdrawn: {
      type: Number,
      default: 0,
    },

    resetPasswordToken: {
      type: String,
    },

    resetPasswordExpire: {
      type: Date,
    },

    transactions: [
      {
        type: {
          type: String,
        },

        direction: {
          type: String,
        },

        amount: {
          type: Number,
        },

        currency: {
          type: String,
          default: "KES",
        },

        status: {
          type: String,
          default: "complete",
        },

        source: {
          type: String,
        },

        reference: {
          type: String,
        },

        note: {
          type: String,
        },

        meta: {
          type: Object,
        },

        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
