import type { Request, Response } from 'express';

export function handleSHAPExplore(req: Request, res: Response) {
  const { modelId } = req.params as { modelId: string };
  if (!modelId || typeof modelId !== 'string' || modelId.length > 100) {
    return res.status(422).json({ detail: 'invalid model id' });
  }

  const body = (req.body ?? {}) as any;
  const input = body.input ?? body.data ?? body.features;
  if (input === undefined || input === null) {
    return res.status(400).json({ detail: 'missing input payload' });
  }

  let values: number[] = [];
  try {
    if (Array.isArray(input)) {
      values = input.map(Number);
    } else if (typeof input === 'object') {
      values = Object.values(input).map((v: any) => Number(v));
    } else {
      return res.status(400).json({ detail: 'invalid input type' });
    }
  } catch {
    return res.status(400).json({ detail: 'invalid input' });
  }

  if (!Array.isArray(values) || values.some((v) => Number.isNaN(v))) {
    return res.status(400).json({ detail: 'input must be numeric array or numeric map' });
  }

  if (values.length > 2000) {
    return res.status(413).json({ detail: 'payload too large' });
  }

  const features = values.slice(0, Math.min(values.length, 20)).map((v, i) => ({
    name: `feature_${i + 1}`,
    shap: +(Math.tanh(v) * (Math.random() * 0.5 + 0.5)).toFixed(4),
  }));

  const top = features
    .map((f) => ({ feature: f.name, weight: Math.abs(f.shap) }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);

  return res.json({
    status: 'success',
    data: {
      modelId,
      baseline: 0,
      features,
      top_features: top,
      request_id: `shap_${Date.now()}`,
      created_at: new Date().toISOString(),
    },
  });
}
