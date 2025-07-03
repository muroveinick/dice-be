import { ILoginResponse, IUser, IUserScheme } from "@shared/interfaces.js";
import crypto from "crypto";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Token } from "models/Token.js";
import { User } from "models/User.js";
import { _register } from "src/services/authService.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { ApiError } from "../utils/errorUtils.js";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_EXPIRES = (process.env.JWT_REFRESH_EXPIRES || "7d") as any;

const createAuthToken = async (userId: string): Promise<string> => {
  const payload = { id: userId };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 7); // 7 days from now

  await Token.create({
    userId,
    token,
    type: "auth",
    expiresAt: expiryDate,
  });

  return token;
};

// Register new user
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, username } = req.body;

  if (!email || !password || !username) {
    throw ApiError.badRequest("Email, password, and username are required");
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw ApiError.conflict("Email already in use", "EMAIL_IN_USE");
  }

  const user = await _register(email, password, username);

  const token = await createAuthToken(user.id);

  res.status(201).json({
    status: "success",
    message: "User registered successfully. Please verify your email.",
    user,
    token,
  });
});

export const login = asyncHandler(async (req: Request, res: Response<ILoginResponse>) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw ApiError.badRequest("Please provide email and password");
  }

  const user = await User.findOne<IUserScheme>({ email });

  if (user) {
    const compare = await user.comparePassword(password);
    if (!compare) {
      throw ApiError.badRequest("Invalid password");
    }
  } else {
    throw ApiError.notFound("User not found", "USER_NOT_FOUND");
  }

  const userId = user._id.toString();
  const token = await createAuthToken(userId);

  res.status(200).json({
    token,
    user: {
      id: userId,
      email: user.email,
      username: user.username,
      role: user.role,
    },
  });
});

// Refresh token - now used to generate a new token when the old one expires
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    throw ApiError.badRequest("Token is required");
  }

  try {
    // Verify the token first to get the payload
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    // Then check if it exists in the database
    const tokenDoc = await Token.findOne({
      token,
      type: "auth",
      expiresAt: { $gt: new Date() },
    });

    if (!tokenDoc) {
      throw ApiError.unauthorized("Invalid or expired token", "INVALID_TOKEN");
    }

    // Find the user
    const user = await User.findById(decoded.id);
    if (!user) {
      throw ApiError.notFound("User no longer exists", "USER_NOT_FOUND");
    }

    // Delete the old token
    await Token.deleteOne({ _id: tokenDoc._id });

    // Generate new token
    const userId = user._id.toString();
    const newToken = await createAuthToken(userId);

    res.status(200).json({
      status: "success",
      token: newToken,
    });
  } catch (error: any) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      throw ApiError.unauthorized("Invalid or expired token", "INVALID_TOKEN");
    }
    throw error;
  }
});

// Logout user
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;

  if (token) {
    // Delete the auth token from database
    await Token.deleteOne({ token, type: "auth" });
  }

  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
});

// TODO reset password
// Request password reset
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    throw ApiError.badRequest("Email is required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    // Security: Still return success even if email not found
    return res.status(200).json({
      status: "success",
      message: "If your email is registered, you will receive a password reset link",
    });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Set expiration (1 hour)
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + 1);

  // Update user
  // user.resetPasswordToken = resetToken;
  // user.resetPasswordExpires = expiryDate;
  await user.save();

  // TODO: Send password reset email

  res.status(200).json({
    status: "success",
    message: "If your email is registered, you will receive a password reset link",
  });
});

// Reset password
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    throw ApiError.badRequest("Password is required");
  }

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    throw ApiError.badRequest("Invalid or expired reset token", "INVALID_TOKEN");
  }

  // Update password
  user.password = password;
  await user.save();

  // Invalidate all refresh tokens for this user
  await Token.deleteMany({ userId: user._id, type: "refresh" });

  res.status(200).json({
    status: "success",
    message: "Password reset successfully",
  });
});

// Get current user
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;

  if (!user) {
    throw ApiError.unauthorized("User not found");
  }

  res.status(200).json({
    email: user.email,
    username: user.username,
    role: user.role,
    id: user._id.toString(),
  } as IUser);
});
