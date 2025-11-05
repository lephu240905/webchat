import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./libs/db.js";
import authRoute from "./routes/authRoute.js";
import userRoute from "./routes/userRoute.js";
import friendRoute from "./routes/friendRoute.js";
import messageRoute from "./routes/messageRoute.js";
import groupRoute from "./routes/groupRoute.js";
import uploadRoute from "./routes/uploadRoute.js";
import chatCustomizationRoute from "./routes/chatCustomizationRoute.js";
import { fileURLToPath } from "url";
import path from "path";
import cookieParser from "cookie-parser";
import { protectedRoute } from "./middlewares/authMiddleware.js";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { chatSocket } from "./sockets/chatSocket.js";

dotenv.config();

// Lấy đường dẫn tuyệt đối hiện tại (ESM không có __dirname mặc định)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Khởi tạo Express app
const app = express();

// Cho phép xác định IP gốc khi chạy qua proxy (Render, Ngrok, Nginx,...)
app.set("trust proxy", 1);

// Middleware cơ bản
app.use(express.json());
app.use(cookieParser());

// CORS — cho phép tất cả origin trong deploy Render
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Static files cho upload
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(
  "/uploads/avatars",
  express.static(path.join(__dirname, "../uploads/avatars"))
);

// =======================
// 🌐 API ROUTES
// =======================
app.use("/api/auth", authRoute);
app.use(protectedRoute); // bảo vệ các route sau đăng nhập
app.use("/api/users", userRoute);
app.use("/api/friends", friendRoute);
app.use("/api/messages", messageRoute);
app.use("/api/groups", groupRoute);
app.use("/api/upload", uploadRoute);
app.use("/api/chat-customizations", chatCustomizationRoute);

// =======================
// 🏗️ SERVE FRONTEND BUILD (Render deploy)
// =======================
const distPath = path.join(__dirname, "../../frontend/dist");
app.use(express.static(distPath));

// ✅ Express 5 dùng path-to-regexp v6: phải dùng /(.*) thay vì '/*'
app.get("/(.*)", (_, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// =======================
// ⚙️ SOCKET.IO SETUP
// =======================
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});
chatSocket(io);

// =======================
// 🚀 SERVER START
// =======================
const PORT = process.env.PORT || 5001;

connectDB().then(() => {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server (Express + Socket.IO) đang chạy tại cổng ${PORT}`);
  });
});
