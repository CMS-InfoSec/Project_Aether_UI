import type { Request, Response } from "express";
import { handleUploadCovariance as _noop } from "./optimizer";

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
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
}

function cloneMatrix(a: number[][]): number[][] { return a.map((r) => r.slice()); }

function invertMatrix(a: number[][], ridge = 1e-8): number[][] {
  const n = a.length;
  const A = cloneMatrix(a);
  for (let i = 0; i < n; i++) A[i][i] += ridge;
  const I = identity(n);
  for (let i = 0; i < n; i++) A[i] = [...A[i], ...I[i]];
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r;
    if (Math.abs(A[pivot][col]) < 1e-15) throw new Error("Matrix is singular");
    if (pivot !== col) { const tmp = A[col]; A[col] = A[pivot]; A[pivot] = tmp; }
    const div = A[col][col];
    for (let c = 0; c < 2 * n; c++) A[col][c] /= div;
    for (let r = 0; r < n; r++) if (r !== col) {
      const factor = A[r][col];
      for (let c = 0; c < 2 * n; c++) A[r][c] -= factor * A[col][c];
    }
  }
  const inv: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) inv[i][j] = A[i][j + n];
  return inv;
}

function matVecMul(A: number[][], v: number[]): number[] { return A.map((row) => row.reduce((sum, aij, j) => sum + aij * v[j], 0)); }
function projectNonNegative(w: number[]): number[] { const c = w.map((x)=> x>0?x:0); const s=c.reduce((a,b)=>a+b,0); if(s<=0){ const n=c.length; return Array.from({length:n},()=>1/n);} return c.map((x)=> x/s); }
function normalizeToOne(w: number[]): number[] { const s=w.reduce((a,b)=>a+b,0); if(!Number.isFinite(s)||Math.abs(s)<1e-12){ const n=w.length; return Array.from({length:n},()=>1/n);} return w.map((x)=> x/s); }

function kellyAlloc(mu: number[], cov: number[][]): number[] { const inv=invertMatrix(cov); const w=matVecMul(inv, mu); return projectNonNegative(w); }
function markowitzAlloc(mu: number[], cov: number[][], riskAversion = 1): number[] {
  const inv = invertMatrix(cov);
  const scaledMu = mu.map((m) => m / Math.max(1e-8, riskAversion));
  const raw = matVecMul(inv, scaledMu);
  const nn = projectNonNegative(raw);
  return normalizeToOne(nn);
}
function riskParityAlloc(cov: number[][]): number[] {
  const n = cov.length;
  const varDiag = cov.map((row, i) => Math.max(1e-12, row[i]));
  const invVar = varDiag.map((v) => 1 / v);
  return normalizeToOne(invVar);
}

function applyLimits(w: number[], maxWeight?: number | null): number[] {
  let ww = w.slice();
  if (Number.isFinite(maxWeight as any) && (maxWeight as any) > 0) {
    const cap = Math.min(1, Math.max(0.01, Number(maxWeight)));
    ww = ww.map((x) => Math.min(x, cap));
  }
  return normalizeToOne(ww);
}

export function __setLastCovarianceForPortfolio(cov: any){ lastCovariance = cov; }

export function handlePortfolioOptimize(req: Request, res: Response) {
  try {
    const { method, expectedReturns, covarianceId, symbols, matrix, riskAversion, riskLimits } = req.body || {};
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
    let mu: number[] = [];
    if (Array.isArray(expectedReturns)) {
      if (expectedReturns.length !== covSymbols.length) return res.status(422).json({ status: "error", message: "expectedReturns length must match symbols" });
      mu = expectedReturns.map((v: any) => Number(v) || 0);
    } else if (expectedReturns && typeof expectedReturns === "object") {
      mu = covSymbols.map((s) => Number((expectedReturns as any)[s] ?? (expectedReturns as any)[s.toUpperCase()] ?? 0));
    } else {
      mu = Array.from({ length: covSymbols.length }, () => 0.01);
    }
    const m = String(method || 'markowitz').toLowerCase();
    let weights: number[];
    if (m === 'kelly') weights = kellyAlloc(mu, cov);
    else if (m === 'risk-parity' || m === 'risk_parity') weights = riskParityAlloc(cov);
    else weights = markowitzAlloc(mu, cov, Number(riskAversion) || 1);

    const limited = applyLimits(weights, riskLimits?.maxWeight);
    const allocations = covSymbols.map((sym, i) => ({ symbol: sym, weight: limited[i] }));
    const stats = {
      expectedReturn: mu.reduce((sum, r, i) => sum + r * limited[i], 0),
      variance: limited.reduce((acc, wi, i) => acc + wi * cov[i].reduce((s, cij, j) => s + cij * limited[j], 0), 0),
    };
    return res.json({ status: 'success', method: m, riskAversion: Number(riskAversion) || 1, symbols: covSymbols, allocations, stats });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Optimization failed' });
  }
}
