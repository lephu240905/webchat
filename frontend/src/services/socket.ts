import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:5001"
    : window.location.origin;

export const socket = io(SOCKET_URL, {
  withCredentials: true,
  transports: ["websocket"],
});
