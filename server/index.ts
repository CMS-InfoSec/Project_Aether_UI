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
  handleGetUserStats,
} from "./routes/users";
import {
  handleGetSystemStatus,
  handlePauseSystem,
  handleResumeSystem,
  handleGetTradingMode,
  handleSetTradingMode,
  handleKillSwitch,
  handleGetAuditLog,
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
  handleUpdateUserSettings as handleUpdateConfigUserSettings,
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
  handleGetSentimentPipelines,
  handleStartTrainingV1,
} from "./routes/models";
import {
  handleGetEligibleMarkets,
  handleGetMarketStats,
  handleExportMarkets,
  handleStrategyOverride,
} from "./routes/markets";
import {
  handleGetPortfolioOverview,
  handleGetPortfolioDetails,
  handleRebalanceAll,
  handleGetRebalanceStatus,
  handleGetRebalanceHistory,
  handleGetPortfolioStats,
} from "./routes/portfolio";
import {
  handleGetWalletHedges,
  handleGetWalletBalances,
  handleGetWalletWithdrawable,
  handlePostHedge,
  handleGetHedgePercent,
  handlePatchHedgePercent,
  handlePatchHedgeSettings,
  handleGetMarketConditions,
  handleUpdateMarketConditions,
  handleCloseHedge,
  handleGetWalletSnapshot,
  handlePostWalletApiKeys,
  handleGetWalletApiKeysStatus,
} from "./routes/hedge";
import {
  handleGetProposals,
  handleCreateProposal,
  handleCastVote,
  handleDeployProposal,
  handleGetFeedbackSummary,
  handleSubmitFeedback,
  handleGetAllFeedback,
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
  handleCreateNotification,
  handleGetExecutionMetrics,
} from "./routes/reports";
import { handleGetUserTradesReport } from "./routes/reports.user-trades";
import {
  handleGetUserProfile,
  handleUpdateUserProfile,
  handleGetTradingSettings,
  handleUpdateTradingSettings,
  handleGetApiKeys,
  handleDeleteApiKeys,
} from "./routes/profile";
import {
  handleGetBootstrapStatus,
  handleCreateFounder,
  handleGetFounders,
  handleDeleteFounder,
  handleResetFounders,
  handleGetSystemDebug,
} from "./routes/founders";
import {
  handleGetRecentTrades,
  handleGetOpenPositions,
  handleVetoTrade,
  handleGetTradeDetail,
} from "./routes/trades";
import {
  handleAskLLM,
  handleLLMStatus,
  handleResetRateLimit,
} from "./routes/llm";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Simple admin key check for sensitive model operations
  function requireAdminKey(req: any, res: any, next: any) {
    const key = req.get("X-API-Key");
    if (key !== "aether-admin-key-2024") {
      return res
        .status(403)
        .json({ status: "error", message: "Admin key required" });
    }
    next();
  }

  // Authentication routes
  app.post("/api/auth/login", handleLogin);
  app.post("/api/auth/refresh", handleRefresh);
  app.post("/api/auth/logout", handleLogout);
  app.get("/api/auth/me", require("./routes/auth").handleMe);
  app.post(
    "/api/auth/reset/request",
    require("./routes/auth").handleResetRequest,
  );
  app.post(
    "/api/auth/reset/confirm",
    require("./routes/auth").handleResetConfirm,
  );

  // Founder/Bootstrap routes (public)
  app.get("/api/founders/bootstrap-status", handleGetBootstrapStatus);
  app.post("/api/founders/bootstrap", handleCreateFounder);
  app.get("/api/founders", handleGetFounders);
  app.delete("/api/founders/:founderId", handleDeleteFounder);
  app.post("/api/founders/reset", handleResetFounders); // For testing only
  app.get("/api/founders/debug", handleGetSystemDebug); // For debugging only

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
  app.post("/api/admin/kill-switch", handleKillSwitch);
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
  app.post("/api/models/train", requireAdminKey, handleStartTraining);
  // v1 alias for compatibility with client
  app.post("/api/v1/models/train", requireAdminKey, handleStartTrainingV1);
  app.get("/api/models/status/:jobId", handleGetTrainingStatus);
  app.get("/api/models/jobs", handleGetAllTrainingJobs);
  app.get(
    "/api/models/jobs/stream",
    require("./routes/models").handleStreamTrainingJobs,
  );
  app.get(
    "/api/v1/models/jobs/stream",
    require("./routes/models").handleStreamTrainingJobs,
  );
  app.delete("/api/models/train/:jobId", requireAdminKey, handleCancelTraining);
  app.post("/api/models/deploy/:modelId", requireAdminKey, handleDeployModel);
  app.get("/api/models", handleGetAllModels);
  app.get(
    "/api/models/history",
    require("./routes/models").handleGetModelsHistory,
  );
  app.post("/api/models/promote", requireAdminKey, handlePromoteModel);
  app.post("/api/models/shadow/start", requireAdminKey, handleStartShadow);
  app.post("/api/models/shadow/stop", requireAdminKey, handleStopShadow);
  app.post("/api/models/rollback", requireAdminKey, handleRollbackModel);
  app.get("/api/models/shadow", handleGetShadowTests);
  app.get("/api/models/curriculum", handleGetCurriculumStages);
  app.get("/api/models/datasets", handleGetDatasets);
  app.get("/api/models/sentiment-pipelines", handleGetSentimentPipelines);
  // Generic v1 compatibility: redirect /api/v1/* -> /api/* preserving method
  app.use("/api/v1", (req, res, next) => {
    // If a specific /api/v1 route above handled it, skip
    if (res.headersSent) return next();
    const target = req.originalUrl.replace(/^\/api\/v1/, "/api");
    return res.redirect(308, target);
  });
  // Audit log endpoint
  app.get("/api/models/audit", requireAdminKey, (_req, res) => {
    try {
      const { auditLog } = require("./routes/models");
      const lim = 200;
      res.json({ status: "success", data: auditLog.slice(0, lim) });
    } catch (e) {
      res
        .status(500)
        .json({ status: "error", message: "Audit log unavailable" });
    }
  });

  // Markets routes
  app.get("/api/markets/eligible", handleGetEligibleMarkets);
  app.get("/api/markets/stats", handleGetMarketStats);
  app.get("/api/markets/export", handleExportMarkets);
  const { handleMarketPrice } = require("./routes/market_price");
  app.get("/api/markets/price", handleMarketPrice);
  app.post("/api/admin/strategy-override", handleStrategyOverride);

  // Portfolio routes
  app.get("/api/admin/portfolio", handleGetPortfolioOverview);
  app.get("/api/admin/portfolio/:userId", handleGetPortfolioDetails);
  app.post("/api/admin/portfolio/rebalance", handleRebalanceAll);
  app.get(
    "/api/admin/portfolio/rebalance/:rebalanceId",
    handleGetRebalanceStatus,
  );
  app.get("/api/admin/portfolio/rebalance-history", handleGetRebalanceHistory);
  app.get("/api/admin/portfolio/stats", handleGetPortfolioStats);

  // Hedge & Wallet routes
  app.get("/api/wallet/hedges", handleGetWalletHedges);
  app.get("/api/wallet/balances", handleGetWalletBalances);
  app.get("/api/wallet/withdrawable", handleGetWalletWithdrawable);
  app.get("/api/wallet/snapshot", handleGetWalletSnapshot);
  app.post("/api/wallet/api-keys", handlePostWalletApiKeys);
  app.get("/api/wallet/api-keys/status", handleGetWalletApiKeysStatus);
  app.post("/api/hedge", handlePostHedge);
  app.get("/api/hedge/percent", handleGetHedgePercent);
  app.patch("/api/hedge/percent", handlePatchHedgePercent);
  app.patch("/api/hedge/settings", handlePatchHedgeSettings);
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

  // Strategy plugins
  const {
    handlePluginsList,
    handlePluginPropose,
    handlePluginVote,
    handlePluginApprove,
  } = require("./routes/plugins");
  app.get("/api/governance/plugins", handlePluginsList);
  app.post("/api/governance/plugins/propose", handlePluginPropose);
  app.post("/api/governance/plugins/:name/vote", handlePluginVote);
  app.post("/api/governance/plugins/:name/approve", handlePluginApprove);

  // Manipulation defense
  {
    const { handleGetDefenseEvents, handlePatchDefenseOverride, handleGetDefenseSettings } = require("./routes/defense");
    app.get("/api/defense/events", handleGetDefenseEvents);
    app.get("/api/defense/settings", handleGetDefenseSettings);
    app.patch("/api/defense/override", handlePatchDefenseOverride);
  }

  // Strategy review
  const {
    handlePendingStrategies,
    handleApproveStrategy,
  } = require("./routes/strategyReview");
  app.get("/api/strategy-review/strategies/pending", handlePendingStrategies);
  app.post(
    "/api/strategy-review/strategies/:strategyId/approve",
    handleApproveStrategy,
  );

  // Reports and notifications routes
  app.get("/api/reports/daily", handleGetDailyReport);
  app.get("/api/reports/weekly", handleGetWeeklyReport);
  app.get("/api/reports/per-asset", handleGetPerAssetReport);
  app.get("/api/reports/backtest", handleGetBacktestReport);
  app.get("/api/reports/export", handleExportReportCSV);
  app.get("/api/reports/execution", handleGetExecutionMetrics);
  app.get("/api/reports/trades", handleGetUserTradesReport);
  // UK tax-year report (v1 prefix)
  app.get(
    "/api/v1/reports/tax-year",
    require("./routes/reports.tax-year").handleGetTaxYearReport,
  );
  app.get("/api/notifications", handleGetNotifications);
  app.patch(
    "/api/notifications/:notificationId/read",
    handleMarkNotificationRead,
  );
  app.post("/api/notifications/mark-all-read", handleMarkAllNotificationsRead);
  app.post("/api/notifications", handleCreateNotification);
  app.get(
    "/api/notifications/preferences",
    require("./routes/reports").handleGetNotificationPreferences,
  );
  app.post(
    "/api/notifications/preferences",
    require("./routes/reports").handleSaveNotificationPreferences,
  );
  const notif = require("./routes/notifications");
  app.get("/api/notifications/channels/status", notif.handleGetChannelStatus);
  app.post(
    "/api/notifications/async_notify_channels",
    notif.handleAsyncNotifyChannels,
  );
  app.post("/api/notifications/notify_channels", notif.handleNotifyChannels);
  app.post("/api/notifications/notify_user", notif.handleNotifyUser);
  app.post("/api/notifications/notify_admins", notif.handleNotifyAdmins);
  app.post("/api/notifications/alert_api_failure", notif.handleAlertApiFailure);
  app.post(
    "/api/notifications/alert_market_cap_failure",
    notif.handleAlertMarketCapFailure,
  );
  app.post(
    "/api/notifications/send_notification",
    notif.handleSendNotification,
  );

  // API docs
  const { handleOpenApiJson, handleSwaggerDocs } = require("./routes/docs");
  app.get("/api/openapi.json", handleOpenApiJson);
  app.get("/docs", handleSwaggerDocs);

  // User profile routes
  app.get("/api/user/profile", handleGetUserProfile);
  app.patch("/api/user/profile", handleUpdateUserProfile);
  app.get("/api/user/trading-settings", handleGetTradingSettings);
  app.patch("/api/user/trading-settings", handleUpdateTradingSettings);

  app.get("/api/user/api-keys", handleGetApiKeys);
  app.delete("/api/user/api-keys", handleDeleteApiKeys);

  // Health & observability routes
  const {
    handleHealthLive,
    handleHealthReady,
    handleHealthReadyDetails,
    handleHealthDependencies,
    handleMetrics,
  } = require("./routes/health");
  app.get("/api/health/live", handleHealthLive);
  // Alias for system-scoped health path expected by client
  app.get("/api/system/health/live", handleHealthLive);
  app.get("/api/health/ready", handleHealthReady);
  // Alias for system-scoped health path expected by client
  app.get("/api/system/health/ready", handleHealthReady);
  app.get("/api/health/ready/details", handleHealthReadyDetails);
  app.get("/api/health/dependencies", handleHealthDependencies);
  app.get(
    "/api/health/live/details",
    require("./routes/health").handleHealthLiveDetails,
  );
  app.get("/api/metrics", handleMetrics);

  // Events (audit/logs)
  const {
    handleEventsTrades,
    handleEventsBalances,
  } = require("./routes/events");
  app.get("/api/events/trades", handleEventsTrades);
  app.get("/api/events/balances", handleEventsBalances);
  // Explicit v1 aliases for WS/SSE compatibility
  app.get("/api/v1/events/trades", handleEventsTrades);
  app.get("/api/v1/events/balances", handleEventsBalances);

  // Strategies & Signals
  const {
    handleGetStrategyFlags,
    handleGetStrategyBreakdown,
    handleNewsSentiment,
    handleNewsLatest,
    handleSocialLatest,
    handleSignalsMetrics,
    handleNewsReplayFailures,
    handleSignalsIngest,
    handleStrategiesExplain,
    handleStrategiesStressTest,
    handlePostBacktest,
  } = require("./routes/strategies");
  app.get("/api/strategies/flags", handleGetStrategyFlags);
  app.get("/api/strategies/breakdown", handleGetStrategyBreakdown);
  app.patch(
    "/api/strategies/:strategy/trading",
    require("./routes/strategies").handlePatchStrategyTrading,
  );
  app.get("/api/news/sentiment", handleNewsSentiment);
  app.get("/api/news/latest", handleNewsLatest);
  app.get("/api/social/latest", handleSocialLatest);
  app.get("/api/signals/metrics", handleSignalsMetrics);
  app.post("/api/news/replay-failures", handleNewsReplayFailures);
  app.post("/api/signals/ingest", handleSignalsIngest);
  app.get("/api/strategies/explain", handleStrategiesExplain);
  app.post("/api/strategies/stress-test", handleStrategiesStressTest);
  app.post("/api/strategies/backtest", handlePostBacktest);

  // Models explainability
  app.get("/api/models/explain/:modelId", (req, res) => {
    const { modelId } = req.params as any;
    try {
      const { handleGetAllModels } = require("./routes/models");
      // Reuse models store indirectly via the listing handler's closure
      // Fallback: if not available, respond minimally
      const all = (
        require("./routes/models").__getModels?.() ||
        require("./routes/models").models ||
        []
      ).filter?.((m: any) => m.modelId === modelId);
      const model = Array.isArray(all) && all.length ? all[0] : null;
      res.json({
        status: "success",
        data: {
          modelId,
          explanation: model
            ? `Explainability summary for ${model.name}`
            : "Model not found in registry",
          model,
        },
      });
    } catch {
      res.json({
        status: "success",
        data: {
          modelId,
          explanation: "Explainability data not available in mock server",
        },
      });
    }
  });
  const { handleSHAPExplore } = require("./routes/shap");
  app.post("/api/shap/:modelId", handleSHAPExplore);

  // Adaptive Strategy Controller
  const {
    handleASCStatus,
    handleASCReweight,
    handleASCActivate,
    handleASCDeactivate,
    handleASCHistory,
  } = require("./routes/asc");
  app.get("/api/strategy/controller/status", handleASCStatus);
  app.get("/api/strategy/controller/history", handleASCHistory);
  app.post("/api/strategy/controller/reweight", handleASCReweight);
  app.post("/api/strategy/controller/policy/:name/activate", handleASCActivate);
  app.post(
    "/api/strategy/controller/policy/:name/deactivate",
    handleASCDeactivate,
  );

  // Debug endpoint
  app.post("/api/debug/test", (req, res) => {
    console.log("Debug endpoint hit with body:", req.body);
    res.json({ status: "success", received: req.body });
  });

  // Trades and positions routes
  app.get("/api/trades/recent", handleGetRecentTrades);
  app.get("/api/positions/open", handleGetOpenPositions);
  app.get("/api/trades/:id", handleGetTradeDetail);
  app.post("/api/admin/trades/veto", handleVetoTrade);
  // Alias for Project Aether style path
  app.post("/api/trades/admin/veto", handleVetoTrade);
  const {
    handleTradeDecision,
    handleTradeExecute,
  } = require("./routes/trades_decision");
  app.post("/api/trades/decision", handleTradeDecision);
  app.post("/api/trades/execute", handleTradeExecute);

  // LLM/AI Assistant routes
  app.post("/api/llm/ask", handleAskLLM);
  // v1 alias for compatibility with client
  app.post("/api/v1/llm/ask", handleAskLLM);
  app.get("/api/llm/status", handleLLMStatus);
  app.delete("/api/llm/rate-limit/:userId", handleResetRateLimit);

  // Multi-agent LOB simulator
  {
    const {
      handleGetAgentsConfig,
      handleSaveAgentsConfig,
      handleRunAgentsSim,
      handleGetAgentsResult,
      handleGetAgentsHistory,
    } = require("./routes/sim_agents");
    app.get("/api/sim/agents/config", handleGetAgentsConfig);
    app.post("/api/sim/agents/config", handleSaveAgentsConfig);
    app.post("/api/sim/agents/run", handleRunAgentsSim);
    app.get("/api/sim/agents/result/:id", handleGetAgentsResult);
    app.get("/api/sim/agents/history", handleGetAgentsHistory);
  }

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Automation social ingest
  const {
    handleAutomationLimitsMe,
    handleAutomationSocial,
  } = require("./routes/automation");
  app.get("/api/automation/limits/me", handleAutomationLimitsMe);
  app.post("/api/automation/social", handleAutomationSocial);

  // Mobile push console
  const { handleMobileStatus, handleMobilePush } = require("./routes/mobile");
  app.get("/api/mobile/status", handleMobileStatus);
  app.post("/api/mobile/push", handleMobilePush);

  // System tasks
  const {
    handleUserDataRefresh,
    handleGlobalDataRefresh,
    handleDataPriceSeries,
    handleTaskStatus,
  } = require("./routes/tasks");
  app.post("/api/tasks/data-refresh", handleUserDataRefresh);
  app.post("/api/data/refresh", handleGlobalDataRefresh);
  app.get("/api/data/price-series", handleDataPriceSeries);
  app.get("/api/tasks/:id", handleTaskStatus);

  // Global error handler: ensure we always return JSON for unexpected errors
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error("Unhandled server error:", err);
    if (res.headersSent) return;
    res.status(500).json({ error: "Internal server error" });
  });

  // API 404 handler: return JSON for unknown API routes (avoid serving HTML)
  app.use("/api", (_req: any, res: any) => {
    res.status(404).json({ error: "API endpoint not found" });
  });

  return app;
}
