import jwt, { JwtPayload } from "jsonwebtoken";
import { promisify } from "util";
import { Request, Response, NextFunction } from "express";
import { User } from "models/User.js";
import { Token } from "models/Token.js";
import { IUserScheme } from "@shared/interfaces.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from authorization header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    console.log('token', token);
    

    if (!token) {
      return res.status(401).json({
        status: "fail",
        message: "You are not logged in. Please log in to get access.",
      });
    }

    // Verify token
    const decoded = await (promisify(jwt.verify) as (token: string, secret: string) => Promise<JwtPayload>)(token, JWT_SECRET);

    // Check if token exists in database (this validates that the token hasn't been revoked)
    const tokenDoc = await Token.findOne({
      token,
      type: "auth",
      expiresAt: { $gt: new Date() },
    });

    if (!tokenDoc) {
      return res.status(401).json({
        status: "fail",
        message: "Invalid or expired token. Please log in again.",
      });
    }

    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: "fail",
        message: "The user belonging to this token no longer exists.",
      });
    }

    // Grant access to protected route
    (req as any).user = currentUser as IUserScheme;
    next();
  } catch (error: any) {

    console.log(error);
    

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        status: "fail",
        message: "Invalid token. Please log in again.",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        status: "fail",
        message: "Your token has expired. Please log in again.",
      });
    }

    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Restrict to certain roles
export const restrictTo = (...roles: string[]) => {
  return (req: Request & { user?: IUserScheme }, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "fail",
        message: "You do not have permission to perform this action",
      });
    }
    next();
  };
};
