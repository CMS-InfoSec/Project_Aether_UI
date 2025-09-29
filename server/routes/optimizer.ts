import type { Request, Response } from "express";

// In-memory store for last uploaded covariance matrix
let lastCovariance: {
  id: string;
  symbols: string[];
  matrix: number[][];
  uploadedAt: string;
} | null = null;

function isSquareMatrix(m: number[][]): boolean {
  if (!Array.isArray(m) || m.length === 0) return false;
  const n = m.length;
  return m.every((row) => Array.isArray(row) && row.length === n && row.every((v) => typeof v === "number" && Number.isFinite(v)));
}

function identity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
}

function cloneMatrix(a: number[][]): number[][] {
  return a.map((row) => row.slice());
}

// Robust matrix inversion with small ridge regularization for near-singular matrices
function invertMatrix(a: number[][], ridge = 1e-8): number[][] {
  const n = a.length;
  const A = cloneMatrix(a);
  for (let i = 0; i < n; i++) A[i][i] += ridge; // ridge
  const I = identity(n);
  // Augment A | I
  for (let i = 0; i < n; i++) A[i] = [...A[i], ...I[i]];
  // Gaussian elimination
  for (let col = 0; col < n; col++) {
    // Find pivot
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r;
    }
    if (Math.abs(A[pivot][col]) < 1e-15) throw new Error("Matrix is singular");
    // Swap
    if (pivot !== col) {
      const tmp = A[col];
      A[col] = A[pivot];
      A[pivot] = tmp;
    }
    // Normalize row
    const div = A[col][col];
    for (let c = 0; c < 2 * n; c++) A[col][c] /= div;
    // Eliminate other rows
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = A[r][col];
      for (let c = 0; c < 2 * n; c++) A[r][c] -= factor * A[col][c];
    }
  }
  // Extract right half as inverse
  const inv: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) inv[i][j] = A[i][j + n];
  return inv;
}

function matVecMul(A: number[][], v: number[]): number[] {
  return A.map((row) => row.reduce((sum, aij, j) => sum + aij * v[j], 0));
}

function projectNonNegative(w: number[]): number[] {
  const clipped = w.map((x) => (x > 0 ? x : 0));
  const s = clipped.reduce((a, b) => a + b, 0);
  if (s <= 0) {
    const n = clipped.length;
    return Array.from({ length: n }, () => 1 / n);
  }
  return clipped.map((x) => x / s);
}

function normalizeToOne(w: number[]): number[] {
  const s = w.reduce((a, b) => a + b, 0);
  if (!Number.isFinite(s) || Math.abs(s) < 1e-12) {
    const n = w.length;
    return Array.from({ length: n }, () => 1 / n);
  }
  return w.map((x) => x / s);
}

function kellyAlloc(mu: number[], cov: number[][]): number[] {
  const inv = invertMatrix(cov);
  const w = matVecMul(inv, mu);
  return projectNonNegative(w);
}

function markowitzAlloc(mu: number[], cov: number[][], riskAversion = 1): number[] {
  const inv = invertMatrix(cov);
  const scaledMu = mu.map((m) => m / Math.max(1e-8, riskAversion));
  const raw = matVecMul(inv, scaledMu);
  const nn = projectNonNegative(raw);
  return normalizeToOne(nn);
}

export function handleUploadCovariance(req: Request, res: Response) {
  try {
    const { symbols, matrix } = req.body || {};
    if (!Array.isArray(symbols) || !Array.isArray(matrix)) {
      return res.status(422).json({ status: "error", message: "symbols (string[]) and matrix (number[][]) required" });
    }
    if (!symbols.every((s) => typeof s === "string" && s.trim().length > 0)) {
      return res.status(422).json({ status: "error", message: "symbols must be non-empty strings" });
    }
    if (!isSquareMatrix(matrix) || matrix.length !== symbols.length) {
      return res.status(422).json({ status: "error", message: "matrix must be square and match symbols length" });
    }
    const id = `cov_${Date.now()}`;
    lastCovariance = { id, symbols: symbols.map((s) => s.toUpperCase()), matrix, uploadedAt: new Date().toISOString() };
    return res.json({ status: "success", id, symbols: lastCovariance.symbols, size: matrix.length });
  } catch (e: any) {
    return res.status(500).json({ status: "error", message: e?.message || "Upload failed" });
  }
}

export function handleRunOptimizer(req: Request, res: Response) {
  try {
    const { method, expectedReturns, covarianceId, symbols, matrix, riskAversion } = req.body || {};
    let covSymbols: string[] = symbols;
    let cov: number[][] = matrix;
    if ((!covSymbols || !cov) && covarianceId) {
      if (!lastCovariance || lastCovariance.id !== covarianceId) {
        return res.status(404).json({ status: "error", message: "covariance not found" });
      }
      covSymbols = lastCovariance.symbols;
      cov = lastCovariance.matrix;
    }
    if (!Array.isArray(covSymbols) || !isSquareMatrix(cov) || cov.length !== covSymbols.length) {
      return res.status(422).json({ status: "error", message: "valid covariance symbols/matrix required" });
    }
    // expectedReturns can be array aligned with symbols, or a map
    let mu: number[] = [];
    if (Array.isArray(expectedReturns)) {
      if (expectedReturns.length !== covSymbols.length)
        return res.status(422).json({ status: "error", message: "expectedReturns length must match symbols" });
      mu = expectedReturns.map((v: any) => Number(v));
    } else if (expectedReturns && typeof expectedReturns === "object") {
      mu = covSymbols.map((s) => Number((expectedReturns as any)[s] ?? (expectedReturns as any)[s.toUpperCase()] ?? 0));
    } else {
      // default equal expected return
      mu = Array.from({ length: covSymbols.length }, () => 0.01);
    }
    if (mu.some((v) => !Number.isFinite(v))) {
      return res.status(422).json({ status: "error", message: "expectedReturns must be numbers" });
    }
    const m = String(method || "markowitz").toLowerCase();
    let weights: number[];
    if (m === "kelly") weights = kellyAlloc(mu, cov);
    else weights = markowitzAlloc(mu, cov, Number(riskAversion) || 1);

    const result = covSymbols.map((sym, i) => ({ symbol: sym, weight: weights[i] }));
    const response = {
      status: "success",
      method: m,
      riskAversion: Number(riskAversion) || 1,
      symbols: covSymbols,
      allocations: result,
      stats: {
        expectedReturn: mu.reduce((sum, r, i) => sum + r * weights[i], 0),
        variance: weights.reduce((acc, wi, i) => acc + wi * cov[i].reduce((s, cij, j) => s + cij * weights[j], 0), 0),
      },
    };
    return res.json(response);
  } catch (e: any) {
    return res.status(500).json({ status: "error", message: e?.message || "Optimization failed" });
  }
}

export function handleGetLastOptimization(_req: Request, res: Response) {
  if (!lastCovariance) return res.json({ status: "success", data: null });
  return res.json({ status: "success", data: { covarianceId: lastCovariance.id, symbols: lastCovariance.symbols, uploadedAt: lastCovariance.uploadedAt } });
}

export function __getLastCovariance() {
  return lastCovariance;
}
