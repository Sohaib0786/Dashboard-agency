import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import prisma from "../utils/prisma";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiryDate,
} from "../utils/jwt";
import { sendSuccess, sendError } from "../utils/response";
import { AuthenticatedRequest } from "../types";

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};


// ================= LOGIN =================
export async function login(req: Request, res: Response): Promise<void> {
  
  try {
    
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, "Email and password are required", 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return sendError(res, "Invalid credentials", 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return sendError(res, "Invalid credentials", 401);
    }

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // store refresh token
    await prisma.refreshToken.create({
      data: {
        id: uuidv4(),
        token: refreshToken,
        userId: user.id,
        expiresAt: getRefreshTokenExpiryDate(),
      },
    });

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

    return sendSuccess(res, {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return sendError(res, "Internal server error", 500);
  }
}


// ================= REFRESH =================
export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      return sendError(res, "Refresh token required", 401);
    }

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      res.clearCookie("refreshToken");
      return sendError(res, "Invalid refresh token", 401);
    }

    // check in DB
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      res.clearCookie("refreshToken");
      return sendError(res, "Expired or invalid refresh token", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return sendError(res, "User not found", 401);
    }

    // 🚀 ROTATION (IMPORTANT FIX)
    await prisma.refreshToken.delete({ where: { token } });

    const newPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const newAccessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);

    await prisma.refreshToken.create({
      data: {
        id: uuidv4(),
        token: newRefreshToken,
        userId: user.id,
        expiresAt: getRefreshTokenExpiryDate(),
      },
    });

    res.cookie("refreshToken", newRefreshToken, REFRESH_COOKIE_OPTIONS);

    return sendSuccess(res, {
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error("REFRESH ERROR:", error);
    res.clearCookie("refreshToken");
    return sendError(res, "Internal server error", 500);
  }
}


// ================= LOGOUT =================
export async function logout(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const token = req.cookies?.refreshToken;

    if (token) {
      await prisma.refreshToken.deleteMany({
        where: { token },
      });
    }

    res.clearCookie("refreshToken");

    return sendSuccess(res, null, 200, "Logged out successfully");
  } catch (error) {
    console.error("LOGOUT ERROR:", error);
    return sendError(res, "Internal server error", 500);
  }
}


// ================= GET ME =================
export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  
  try {
    if (!req.user?.id) {
      return sendError(res, "Unauthorized", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return sendError(res, "User not found", 404);
    }

    return sendSuccess(res, user);
  } catch (error) {
    console.error("GET ME ERROR:", error);
    return sendError(res, "Internal server error", 500);
  }
}