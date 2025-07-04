import { IUser } from "@shared/interfaces.js";
import crypto from "crypto";
import { User } from "models/User.js";
import { ApiError } from "src/utils/errorUtils.js";

export const _register = async (email: string, password: string, username: string): Promise<IUser> => {
  if (password.length < 6) {
    throw ApiError.badRequest("Password must be at least 6 characters long");
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");

  const newUser = await User.create({
    email,
    password,
    username,
    verificationToken,
  });

  console.log("New user created:", newUser);

  return {
    id: newUser._id.toString(),
    email,
    username,
    role: newUser.role,
  };
};
