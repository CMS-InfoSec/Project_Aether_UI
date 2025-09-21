import { useState, useEffect, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import apiFetch from "@/lib/apiClient";
import copy from "@/lib/clipboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import HelpTip from "@/components/ui/help-tip";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Bot,
  User,
  Send,
  Copy,
  RefreshCw,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2,
  MessageSquare,
  Sparkles,
  TrendingUp,
  BarChart3,
  FileText,
  Activity,
  CheckCircle,
  Info,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Types
interface Trade {
  id: string;
  symbol: string;
  action: "buy" | "sell";
  amount: number;
  price: number;
  timestamp: string;
}

interface LLMContext {
  trades: Trade[];
  strategy: string;
  regime: string;
  sentiment: string;
  documents: [string, string][]; // [snippet, citation_id]
}

interface LLMResponse {
  answer: string;
  context: LLMContext;
}

interface HistoryItem {
  id: string;
  question: string;
  answer: string;
  context?: LLMContext;
  timestamp: string;
}

interface RequestState {
  isLoading: boolean;
  error: string | null;
  rateLimit: {
    isLimited: boolean;
    resetTime: number | null;
  };
}

export default function AIAssistant() {
  // State
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<LLMResponse | null>(null);
  const [includeOptions, setIncludeOptions] = useState({
    signals: true,
    trades: true,
    sentiment: true,
    regime: true,
  });
  const lastRequestRef = useRef<{
    question: string;
    include: typeof includeOptions;
  } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showContext, setShowContext] = useState(false);
  const [isContextExpanded, setIsContextExpanded] = useState(false);
  const [requestState, setRequestState] = useState<RequestState>({
    isLoading: false,
    error: null,
    rateLimit: { isLimited: false, resetTime: null },
  });

  // Refs
  const questionInputRef = useRef<HTMLTextAreaElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  // Constants
  const MAX_CHARS = 500;
  const HISTORY_STORAGE_KEY = "ai-assistant-history";

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    }

    // Focus question input on load
    questionInputRef.current?.focus();
  }, []);

  // Save history to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error("Failed to save history:", error);
    }
  }, [history]);

  // Handle rate limit countdown
  useEffect(() => {
    if (requestState.rateLimit.isLimited && requestState.rateLimit.resetTime) {
      const interval = setInterval(() => {
        const now = Date.now();
        if (now >= requestState.rateLimit.resetTime!) {
          setRequestState((prev) => ({
            ...prev,
            rateLimit: { isLimited: false, resetTime: null },
          }));
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [requestState.rateLimit]);

  // Utility functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const copyToClipboard = async (text: string) => {
    const ok = await copy(text);
    toast({
      title: ok ? "Copied" : "Copy Failed",
      description: ok
        ? "Text copied to clipboard"
        : "Failed to copy to clipboard",
      variant: ok ? "default" : "destructive",
    });
  };

  const copyCitation = async (citationId: string) => {
    const ok = await copy(citationId);
    toast({
      title: ok ? "Citation copied" : "Copy Failed",
      description: ok
        ? `Citation ID ${citationId} copied`
        : "Failed to copy to clipboard",
      variant: ok ? "default" : "destructive",
    });
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (e.ctrlKey || e.metaKey) {
        // Ctrl+Enter or Cmd+Enter submits
        e.preventDefault();
        handleSubmit();
      } else if (!e.shiftKey) {
        // Plain Enter submits (Shift+Enter for new line)
        e.preventDefault();
        handleSubmit();
      }
    }
  };

  // Submit question to LLM
  const handleSubmit = async () => {
    if (
      !question.trim() ||
      requestState.isLoading ||
      requestState.rateLimit.isLimited
    ) {
      return;
    }

    setRequestState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const payload = { question: question.trim(), include: includeOptions };
      lastRequestRef.current = payload;
      const response = await apiFetch("/api/llm/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 429) {
        const errorData = await response.json();
        setRequestState((prev) => ({
          ...prev,
          isLoading: false,
          rateLimit: {
            isLimited: true,
            resetTime: errorData.resetTime || Date.now() + 3600000,
          },
        }));
        toast({
          title: "Rate Limit Exceeded",
          description:
            errorData.message ||
            "Too many requests. Please wait before asking again.",
          variant: "destructive",
        });
        return;
      }

      if (response.status === 401) {
        // Try to refresh token
        try {
          const refreshResponse = await apiFetch("/api/auth/refresh", {
            method: "POST",
          });
          if (refreshResponse.ok) {
            // Retry the original request
            return handleSubmit();
          }
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
        }

        setRequestState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Authentication failed. Please login again.",
        }));
        return;
      }

      if (!response.ok) {
        let detail = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          detail = errorData.message || detail;
        } catch {}
        if (response.status === 413) {
          setRequestState((prev) => ({
            ...prev,
            isLoading: false,
            error: detail,
          }));
          toast({
            title: "Too long",
            description: detail,
            variant: "destructive",
          });
          return;
        }
        if (response.status === 502 || response.status === 503) {
          setRequestState((prev) => ({
            ...prev,
            isLoading: false,
            error: detail,
          }));
          toast({
            title: "Upstream error",
            description: detail,
            variant: "destructive",
            action: (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (lastRequestRef.current) {
                    setTimeout(handleSubmit, 100);
                  }
                }}
              >
                Retry
              </Button>
            ),
          });
          return;
        }
        throw new Error(detail);
      }

      const data = await response.json();

      if (data.status === "success") {
        setResponse(data.data);

        // Add to history
        const historyItem: HistoryItem = {
          id: Date.now().toString(),
          question: question.trim(),
          answer: data.data.answer,
          context: data.data.context,
          timestamp: new Date().toISOString(),
        };

        setHistory((prev) => [historyItem, ...prev.slice(0, 49)]); // Keep last 50 items

        // Scroll to response
        setTimeout(() => {
          responseRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        throw new Error(data.message || "Failed to get response");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send question";
      setRequestState((prev) => ({ ...prev, error: errorMessage }));
      toast({
        title: "Request Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setRequestState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Clear conversation
  const handleClear = () => {
    setQuestion("");
    setResponse(null);
    setRequestState({
      isLoading: false,
      error: null,
      rateLimit: { isLimited: false, resetTime: null },
    });
    questionInputRef.current?.focus();
  };

  // Load question from history
  const loadFromHistory = (item: HistoryItem) => {
    setQuestion(item.question);
    setResponse({ answer: item.answer, context: item.context! });
    questionInputRef.current?.focus();
  };

  // Delete history item
  const deleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear all history
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    toast({
      title: "History cleared",
      description: "All conversation history has been cleared",
    });
  };

  // Get rate limit countdown
  const getRateLimitCountdown = () => {
    if (!requestState.rateLimit.resetTime) return "";
    const remaining = Math.max(
      0,
      requestState.rateLimit.resetTime - Date.now(),
    );
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const characterCount = question.length;
  const isNearLimit = characterCount > MAX_CHARS * 0.8;
  const isOverLimit = characterCount > MAX_CHARS;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <Bot className="h-8 w-8 mr-3 text-blue-600" />
            AI Assistant
          </h1>
          <p className="text-muted-foreground">
            Ask questions about your trades, strategies, and market conditions
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {history.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(history, null, 2)], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "ask-aether-history.json";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Export JSON
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const headers = ["timestamp", "question", "answer"];
                  const rows = history.map((h) => [
                    h.timestamp,
                    '"' + h.question.replace(/"/g, '""') + '"',
                    '"' + h.answer.replace(/"/g, '""') + '"',
                  ]);
                  const csv = [headers.join(",")]
                    .concat(rows.map((r) => r.join(",")))
                    .join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "ask-aether-history.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Export CSV
              </Button>
            </>
          )}
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={requestState.isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Conversation Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Question Input */}
          <Card>
            <CardHeader className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Ask a Question
                </CardTitle>
                <CardDescription>
                  Ask about your trades, portfolio, market conditions, or
                  strategies (max {MAX_CHARS} characters)
                </CardDescription>
              </div>
              <HelpTip content="Type your question to the AI. Supports Enter to send, Shift+Enter for a new line." />
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Rate limit warning */}
              {requestState.rateLimit.isLimited && (
                <Alert variant="destructive">
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Rate limit exceeded. Please wait {getRateLimitCountdown()}{" "}
                    before asking again.
                  </AlertDescription>
                </Alert>
              )}

              {/* Error display */}
              {requestState.error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{requestState.error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="question">Your Question</Label>
                  <HelpTip content="Be specific. For example: 'Analyze my BTC trades last week'." />
                </div>
                <Textarea
                  ref={questionInputRef}
                  id="question"
                  placeholder="e.g., 'How is my portfolio performing?' or 'What's the current market sentiment?'"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={
                    requestState.isLoading || requestState.rateLimit.isLimited
                  }
                  className="min-h-[100px] resize-none"
                  aria-describedby="char-count"
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeOptions.signals}
                      onChange={(e) =>
                        setIncludeOptions((o) => ({
                          ...o,
                          signals: e.target.checked,
                        }))
                      }
                    />{" "}
                    <span className="inline-flex items-center gap-2">
                      Signals{" "}
                      <HelpTip content="Include trading signals and indicators." />
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeOptions.trades}
                      onChange={(e) =>
                        setIncludeOptions((o) => ({
                          ...o,
                          trades: e.target.checked,
                        }))
                      }
                    />{" "}
                    <span className="inline-flex items-center gap-2">
                      Trades{" "}
                      <HelpTip content="Include your recent trades as context." />
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeOptions.sentiment}
                      onChange={(e) =>
                        setIncludeOptions((o) => ({
                          ...o,
                          sentiment: e.target.checked,
                        }))
                      }
                    />{" "}
                    <span className="inline-flex items-center gap-2">
                      Sentiment{" "}
                      <HelpTip content="Include news/social sentiment if available." />
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeOptions.regime}
                      onChange={(e) =>
                        setIncludeOptions((o) => ({
                          ...o,
                          regime: e.target.checked,
                        }))
                      }
                    />{" "}
                    <span className="inline-flex items-center gap-2">
                      Market Regime{" "}
                      <HelpTip content="Include current market regime classification." />
                    </span>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div
                    id="char-count"
                    className={`text-sm ${
                      isOverLimit
                        ? "text-red-600"
                        : isNearLimit
                          ? "text-yellow-600"
                          : "text-muted-foreground"
                    }`}
                  >
                    {characterCount}/{MAX_CHARS} characters
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Press Enter to send, Shift+Enter for new line
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={
                  !question.trim() ||
                  isOverLimit ||
                  requestState.isLoading ||
                  requestState.rateLimit.isLimited
                }
                className="w-full"
                size="lg"
              >
                {requestState.isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Thinking...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Ask AI
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Response Area */}
          {response && (
            <Card ref={responseRef}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-blue-600" />
                    AI Response
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <HelpTip content="The assistant's answer. Use Copy to save it to your clipboard." />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(response.answer)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{response.answer}</p>
                </div>

                {/* Context Toggle */}
                <div className="mt-6 pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-context"
                      checked={showContext}
                      onCheckedChange={setShowContext}
                    />
                    <Label
                      htmlFor="show-context"
                      className="text-sm inline-flex items-center gap-2"
                    >
                      <span>Show context (trades, strategy, sentiment)</span>
                      <HelpTip content="Toggle to view the data used to generate this answer." />
                    </Label>
                  </div>

                  {/* Context Panel */}
                  {showContext && response.context && (
                    <Collapsible
                      open={isContextExpanded}
                      onOpenChange={setIsContextExpanded}
                      className="mt-4"
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between"
                        >
                          <span className="flex items-center">
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Context Details
                          </span>
                          {isContextExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          {/* Strategy & Market Info */}
                          <div className="space-y-4">
                            <div className="p-3 border rounded-lg">
                              <div className="text-sm font-medium mb-1">
                                Current Strategy
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {response.context.strategy}
                              </div>
                            </div>
                            <div className="p-3 border rounded-lg">
                              <div className="text-sm font-medium mb-1">
                                Market Regime
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {response.context.regime}
                              </div>
                            </div>
                            <div className="p-3 border rounded-lg">
                              <div className="text-sm font-medium mb-1">
                                Market Sentiment
                              </div>
                              <Badge
                                variant={
                                  response.context.sentiment
                                    .toLowerCase()
                                    .includes("bullish")
                                    ? "default"
                                    : response.context.sentiment
                                          .toLowerCase()
                                          .includes("bearish")
                                      ? "destructive"
                                      : "secondary"
                                }
                              >
                                {response.context.sentiment}
                              </Badge>
                            </div>
                          </div>

                          {/* Recent Trades */}
                          <div className="space-y-4">
                            <div className="p-3 border rounded-lg">
                              <div className="text-sm font-medium mb-3 flex items-center">
                                <TrendingUp className="h-4 w-4 mr-1" />
                                Recent Trades
                              </div>
                              <div className="space-y-2">
                                {response.context.trades
                                  .slice(0, 5)
                                  .map((trade) => (
                                    <div
                                      key={trade.id}
                                      className="text-xs flex justify-between items-center"
                                    >
                                      <span className="font-mono">
                                        {trade.symbol}
                                      </span>
                                      <span
                                        className={`font-medium ${
                                          trade.action === "buy"
                                            ? "text-green-600"
                                            : "text-red-600"
                                        }`}
                                      >
                                        {trade.action.toUpperCase()}{" "}
                                        {trade.amount}
                                      </span>
                                      <span className="text-muted-foreground">
                                        {formatCurrency(trade.price)}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Documents */}
                        {response.context.documents.length > 0 && (
                          <div className="mt-4 p-3 border rounded-lg">
                            <div className="text-sm font-medium mb-3 flex items-center">
                              <FileText className="h-4 w-4 mr-1" />
                              Relevant Documents
                            </div>
                            <div className="space-y-2">
                              {response.context.documents.map(
                                ([snippet, citationId], index) => (
                                  <div
                                    key={index}
                                    className="text-xs border-l-2 pl-3 border-blue-200"
                                  >
                                    <p className="text-muted-foreground mb-1">
                                      {snippet}
                                    </p>
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="h-auto p-0 text-xs"
                                      onClick={() => copyCitation(citationId)}
                                    >
                                      Citation: {citationId}
                                    </Button>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warnings and degraded state */}
          {response && (
            <>
              {response.supabase_degraded && (
                <Alert className="-mt-4 mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Context may be incomplete due to degraded data source.
                  </AlertDescription>
                </Alert>
              )}
              {response.warnings?.length ? (
                <div className="-mt-2 mb-2 flex flex-wrap gap-2">
                  {response.warnings.map((w: string, i: number) => (
                    <Badge key={i} variant="secondary">
                      {w}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </>
          )}

          {/* No response state */}
          {!response && !requestState.isLoading && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Ask a question to get started</p>
                  <p className="text-sm mt-1">
                    I can help with trades, portfolio analysis, market insights,
                    and more
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Conversation Stream (previous messages) */}
          {history.length > 1 && (
            <div className="space-y-3">
              {history.slice(1).map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      {new Date(item.timestamp).toLocaleString()}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Q: {item.question}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                      {item.answer}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Question History Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Question History</CardTitle>
              <div className="flex items-center gap-2">
                <HelpTip content="Click an entry to reload its question and answer. Use the bin to clear history." />
                {history.length > 0 && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Clear History</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to clear all conversation
                          history? This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => {}}>
                          Cancel
                        </Button>
                        <Button variant="destructive" onClick={clearHistory}>
                          Clear All
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {history.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => loadFromHistory(item)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.question}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(item.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 ml-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteHistoryItem(item.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No questions asked yet</p>
                  <p className="text-xs mt-1">
                    Your conversation history will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card>
            <CardHeader className="flex items-start justify-between">
              <CardTitle className="text-lg flex items-center">
                <Info className="h-5 w-5 mr-2" />
                Tips
              </CardTitle>
              <HelpTip content="Examples and shortcuts to get better answers." />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <p className="font-medium mb-1">Example questions:</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>• "How is my portfolio performing?"</li>
                  <li>• "What's the current market sentiment?"</li>
                  <li>• "Should I adjust my strategy?"</li>
                  <li>• "Analyze my recent trades"</li>
                </ul>
              </div>
              <Separator />
              <div className="text-sm">
                <p className="font-medium mb-1">Keyboard shortcuts:</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>• Enter: Send question</li>
                  <li>• Shift+Enter: New line</li>
                  <li>• Ctrl+Enter: Send (alternative)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
