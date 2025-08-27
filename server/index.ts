import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleLogin, handleRefresh, handleLogout } from "./routes/auth";
import {
  handleInviteUser,
  handleGetPendingUsers,
  handleApproveUser,
  handleRejectUser,
  handleGetUserSettings,
  handleUpdateUserSettings,
  handleGetUserStats
} from "./routes/users";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Authentication routes
  app.post("/api/auth/login", handleLogin);
  app.post("/api/auth/refresh", handleRefresh);
  app.post("/api/auth/logout", handleLogout);

  // User management routes
  app.post("/api/users/invite", handleInviteUser);
  app.get("/api/users/pending", handleGetPendingUsers);
  app.post("/api/users/approve", handleApproveUser);
  app.delete("/api/users/pending/:userId", handleRejectUser);
  app.get("/api/users/settings", handleGetUserSettings);
  app.patch("/api/users/settings", handleUpdateUserSettings);
  app.get("/api/users/stats", handleGetUserStats);

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  return app;
}
