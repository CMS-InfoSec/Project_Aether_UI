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
import {
  handleGetSystemStatus,
  handlePauseSystem,
  handleResumeSystem,
  handleGetTradingMode,
  handleSetTradingMode,
  handleGetAuditLog
} from "./routes/system";
import {
  handleGetRuntimeConfig,
  handleUpdateRuntimeConfig,
  handleReloadConfig,
  handleGetEffectiveConfig,
  handleGetSystemConfig,
  handleUpdateSystemConfig,
  handleResetSystemConfig,
  handleGetUserSettings as handleGetConfigUserSettings,
  handleUpdateUserSettings as handleUpdateConfigUserSettings
} from "./routes/config";
import {
  handleStartTraining,
  handleGetTrainingStatus,
  handleGetAllTrainingJobs,
  handleCancelTraining,
  handleDeployModel,
  handleGetAllModels,
  handlePromoteModel,
  handleStartShadow,
  handleStopShadow,
  handleRollbackModel,
  handleGetShadowTests,
  handleGetCurriculumStages,
  handleGetDatasets,
  handleGetSentimentPipelines
} from "./routes/models";
import {
  handleGetEligibleMarkets,
  handleGetMarketStats,
  handleExportMarkets
} from "./routes/markets";
import {
  handleGetPortfolioOverview,
  handleGetPortfolioDetails,
  handleRebalanceAll,
  handleGetRebalanceStatus,
  handleGetRebalanceHistory,
  handleGetPortfolioStats
} from "./routes/portfolio";
import {
  handleGetHedges,
  handleGetBalances,
  handleGetWithdrawable,
  handleExecuteHedge,
  handleGetHedgePercent,
  handleUpdateHedgePercent,
  handleGetMarketConditions,
  handleUpdateMarketConditions,
  handleCloseHedge,
  handleGetSnapshot
} from "./routes/hedge";
import {
  handleGetProposals,
  handleCreateProposal,
  handleCastVote,
  handleDeployProposal,
  handleGetFeedbackSummary,
  handleSubmitFeedback,
  handleGetAllFeedback
} from "./routes/governance";
import {
  handleGetDailyReport,
  handleGetWeeklyReport,
  handleGetPerAssetReport,
  handleGetBacktestReport,
  handleExportReportCSV,
  handleGetNotifications,
  handleMarkNotificationRead,
  handleMarkAllNotificationsRead,
  handleCreateNotification
} from "./routes/reports";
import {
  handleGetUserProfile,
  handleUpdateUserProfile,
  handleGetTradingSettings,
  handleUpdateTradingSettings,
  handleGetApiKeys
} from "./routes/profile";
import {
  handleGetBootstrapStatus,
  handleCreateFounder,
  handleGetFounders,
  handleDeleteFounder,
  handleResetFounders
} from "./routes/founders";
import {
  handleGetRecentTrades,
  handleGetOpenPositions,
  handleVetoTrade
} from "./routes/trades";

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

  // Founder/Bootstrap routes (public)
  app.get("/api/founders/bootstrap-status", handleGetBootstrapStatus);
  app.post("/api/founders/bootstrap", handleCreateFounder);
  app.get("/api/founders", handleGetFounders);
  app.delete("/api/founders/:founderId", handleDeleteFounder);
  app.post("/api/founders/reset", handleResetFounders); // For testing only

  // User management routes
  app.post("/api/users/invite", handleInviteUser);
  app.get("/api/users/pending", handleGetPendingUsers);
  app.post("/api/users/approve", handleApproveUser);
  app.delete("/api/users/pending/:userId", handleRejectUser);
  app.get("/api/users/settings", handleGetUserSettings);
  app.patch("/api/users/settings", handleUpdateUserSettings);
  app.get("/api/users/stats", handleGetUserStats);

  // System control routes
  app.get("/api/system/status", handleGetSystemStatus);
  app.post("/api/system/pause", handlePauseSystem);
  app.post("/api/system/resume", handleResumeSystem);
  app.get("/api/system/mode", handleGetTradingMode);
  app.post("/api/system/mode", handleSetTradingMode);
  app.get("/api/system/audit", handleGetAuditLog);

  // Configuration routes
  app.get("/api/config/runtime", handleGetRuntimeConfig);
  app.put("/api/config/runtime", handleUpdateRuntimeConfig);
  app.post("/api/config/reload", handleReloadConfig);
  app.get("/api/config/effective", handleGetEffectiveConfig);
  app.get("/api/config", handleGetSystemConfig);
  app.patch("/api/config", handleUpdateSystemConfig);
  app.delete("/api/config", handleResetSystemConfig);
  app.get("/api/config/users", handleGetConfigUserSettings);
  app.post("/api/config/user", handleUpdateConfigUserSettings);

  // Models routes
  app.post("/api/models/train", handleStartTraining);
  app.get("/api/models/status/:jobId", handleGetTrainingStatus);
  app.get("/api/models/jobs", handleGetAllTrainingJobs);
  app.delete("/api/models/train/:jobId", handleCancelTraining);
  app.post("/api/models/deploy/:modelId", handleDeployModel);
  app.get("/api/models", handleGetAllModels);
  app.post("/api/models/promote", handlePromoteModel);
  app.post("/api/models/shadow/start", handleStartShadow);
  app.post("/api/models/shadow/stop", handleStopShadow);
  app.post("/api/models/rollback", handleRollbackModel);
  app.get("/api/models/shadow", handleGetShadowTests);
  app.get("/api/models/curriculum", handleGetCurriculumStages);
  app.get("/api/models/datasets", handleGetDatasets);
  app.get("/api/models/sentiment-pipelines", handleGetSentimentPipelines);

  // Markets routes
  app.get("/api/markets/eligible", handleGetEligibleMarkets);
  app.get("/api/markets/stats", handleGetMarketStats);
  app.get("/api/markets/export", handleExportMarkets);

  // Portfolio routes
  app.get("/api/admin/portfolio", handleGetPortfolioOverview);
  app.get("/api/admin/portfolio/:userId", handleGetPortfolioDetails);
  app.post("/api/admin/portfolio/rebalance", handleRebalanceAll);
  app.get("/api/admin/portfolio/rebalance/:rebalanceId", handleGetRebalanceStatus);
  app.get("/api/admin/portfolio/rebalance-history", handleGetRebalanceHistory);
  app.get("/api/admin/portfolio/stats", handleGetPortfolioStats);

  // Hedge & Wallet routes
  app.get("/api/wallet/hedges", handleGetHedges);
  app.get("/api/wallet/balances", handleGetBalances);
  app.get("/api/wallet/withdrawable", handleGetWithdrawable);
  app.get("/api/wallet/snapshot", handleGetSnapshot);
  app.post("/api/hedge", handleExecuteHedge);
  app.get("/api/hedge/percent", handleGetHedgePercent);
  app.post("/api/hedge/percent", handleUpdateHedgePercent);
  app.get("/api/hedge/market-conditions", handleGetMarketConditions);
  app.post("/api/hedge/market-conditions", handleUpdateMarketConditions);
  app.post("/api/hedge/close/:hedgeId", handleCloseHedge);

  // Governance routes
  app.get("/api/admin/proposals", handleGetProposals);
  app.post("/api/admin/proposals/:proposalId", handleCreateProposal);
  app.post("/api/admin/proposals/:proposalId/vote", handleCastVote);
  app.post("/api/admin/deploy/:proposalId", handleDeployProposal);
  app.get("/api/admin/feedback", handleGetFeedbackSummary);
  app.post("/api/feedback", handleSubmitFeedback);
  app.get("/api/admin/feedback/all", handleGetAllFeedback);

  // Reports and notifications routes
  app.get("/api/reports/daily", handleGetDailyReport);
  app.get("/api/reports/weekly", handleGetWeeklyReport);
  app.get("/api/reports/per-asset", handleGetPerAssetReport);
  app.get("/api/reports/backtest", handleGetBacktestReport);
  app.get("/api/reports/export", handleExportReportCSV);
  app.get("/api/notifications", handleGetNotifications);
  app.patch("/api/notifications/:notificationId/read", handleMarkNotificationRead);
  app.post("/api/notifications/mark-all-read", handleMarkAllNotificationsRead);
  app.post("/api/notifications", handleCreateNotification);

  // User profile routes
  app.get("/api/user/profile", handleGetUserProfile);
  app.patch("/api/user/profile", handleUpdateUserProfile);
  app.get("/api/user/trading-settings", handleGetTradingSettings);
  app.patch("/api/users/settings", handleUpdateTradingSettings);
  app.get("/api/user/api-keys", handleGetApiKeys);

  // Trades and positions routes
  app.get("/api/trades/recent", handleGetRecentTrades);
  app.get("/api/positions/open", handleGetOpenPositions);
  app.post("/api/admin/trades/veto", handleVetoTrade);

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  return app;
}
