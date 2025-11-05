// @ts-nocheck
import bcrypt from "bcrypt";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Session from "../models/Session.js";

const ACCESS_TOKEN_TTL = "30m";
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000; // 14 ngày

// ------------------- ĐĂNG KÝ -------------------
export const signUp = async (req, res) => {
  try {
    const { username, password, email, firstName, lastName } = req.body;

    if (!username || !password || !email || !firstName || !lastName) {
      return res
        .status(400)
        .json({
          message: "Thiếu username, password, email, firstName, lastName",
        });
    }

    const duplicateUsername = await User.findOne({ username });
    if (duplicateUsername)
      return res.status(409).json({ message: "Tên đăng nhập đã tồn tại" });

    const duplicateEmail = await User.findOne({ email });
    if (duplicateEmail)
      return res.status(409).json({ message: "Email đã được sử dụng" });

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      username,
      hashedPassword,
      email,
      displayName: `${firstName} ${lastName}`,
    });

    return res.status(201).json({ message: "Đăng ký thành công" });
  } catch (error) {
    console.error("Lỗi signUp:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// ------------------- ĐĂNG NHẬP -------------------
export const signIn = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ message: "Thiếu username hoặc password" });

    const user = await User.findOne({ username });
    if (!user)
      return res
        .status(401)
        .json({ message: "Tên đăng nhập hoặc mật khẩu sai" });

    const passwordCorrect = await bcrypt.compare(password, user.hashedPassword);
    if (!passwordCorrect)
      return res
        .status(401)
        .json({ message: "Tên đăng nhập hoặc mật khẩu sai" });

    // Tạo access token
    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    // Tạo refresh token & lưu session
    const refreshToken = crypto.randomBytes(64).toString("hex");
    await Session.create({
      userId: user._id,
      refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
    });

    // ✅ Lưu refresh token vào cookie (HTTP-only)
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true, // bắt buộc trên HTTPS (Render)
      sameSite: "none",
      maxAge: REFRESH_TOKEN_TTL,
    });

    // ✅ Lưu access token vào cookie luôn (HTTP-only)
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 30 * 60 * 1000, // 30 phút
    });

    return res.status(200).json({
      message: `Xin chào ${user.displayName}`,
    });
  } catch (error) {
    console.error("Lỗi signIn:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// ------------------- ĐĂNG XUẤT -------------------
export const signOut = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      await Session.deleteOne({ refreshToken: token });
    }
    res.clearCookie("refreshToken");
    res.clearCookie("accessToken");
    return res.sendStatus(204);
  } catch (error) {
    console.error("Lỗi signOut:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// ------------------- REFRESH TOKEN -------------------
export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token)
      return res.status(401).json({ message: "Không có refresh token" });

    const session = await Session.findOne({ refreshToken: token });
    if (!session)
      return res.status(403).json({ message: "Refresh token không hợp lệ" });

    if (session.expiresAt < new Date())
      return res.status(403).json({ message: "Refresh token hết hạn" });

    const newAccessToken = jwt.sign(
      { userId: session.userId },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 30 * 60 * 1000,
    });

    return res.status(200).json({ message: "Access token mới đã được tạo" });
  } catch (error) {
    console.error("Lỗi refreshToken:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
