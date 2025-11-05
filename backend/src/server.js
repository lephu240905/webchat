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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("trust proxy", 1);

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", authRoute);
app.use(protectedRoute);
app.use("/api/users", userRoute);
app.use("/api/friends", friendRoute);
app.use("/api/messages", messageRoute);
app.use("/api/groups", groupRoute);
app.use("/api/upload", uploadRoute);
app.use("/api/chat-customizations", chatCustomizationRoute);

// Serve frontend build
const distPath = path.join(__dirname, "../../frontend/dist");
app.use(express.static(distPath));
app.get("*", (_, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

const server = createServer(app);
const io = new Server(server, { cors: { origin: true, credentials: true } });
chatSocket(io);

const PORT = process.env.PORT || 5001;
connectDB().then(() => {
  server.listen(PORT, "0.0.0.0", () =>
    console.log(`✅ Server đang chạy tại cổng ${PORT}`)
  );
});
