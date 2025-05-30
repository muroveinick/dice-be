import mongoose from "mongoose";

const TokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["auth", "blacklisted"],
    default: "auth",
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: "30d", // TTL index to automatically remove expired tokens
  },
});

// Index for faster token lookup
TokenSchema.index({ token: 1, type: 1 });
TokenSchema.index({ userId: 1, type: 1 });

export const Token = mongoose.model("Token", TokenSchema);
