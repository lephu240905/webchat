// @ts-nocheck
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ✅ đọc token từ cookie thay vì header
export const protectedRoute = async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      (req.headers["authorization"] &&
        req.headers["authorization"].split(" ")[1]);

    if (!token)
      return res.status(401).json({ message: "Không tìm thấy access token" });

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
      if (err) {
        console.error("JWT verify error:", err);
        return res
          .status(403)
          .json({ message: "Access token hết hạn hoặc không đúng" });
      }

      const user = await User.findById(decoded.userId).select(
        "-hashedPassword"
      );
      if (!user)
        return res.status(404).json({ message: "Người dùng không tồn tại" });

      req.user = user;
      next();
    });
  } catch (error) {
    console.error("Lỗi xác minh JWT:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
