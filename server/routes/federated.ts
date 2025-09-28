import { Request, Response } from 'express';

export function handleFederatedStatus(_req: Request, res: Response) {
  const now = Date.now();
  const currentRound = 7;
  const totalRounds = 10;
  const rounds = Array.from({ length: 7 }).map((_, i) => {
    const r = i + 1;
    const done = r < currentRound;
    const inProg = r === currentRound;
    const progress = done ? 100 : (inProg ? Math.round(((now/1000)%60) * (100/60)) : 0);
    return {
      round: r,
      totalRounds,
      progress,
      accuracy: +(0.80 + r * 0.01).toFixed(4),
      loss: +(0.45 - r * 0.02).toFixed(4),
      startTime: new Date(now - (currentRound - r) * 3600000).toISOString(),
      endTime: done ? new Date(now - (currentRound - r - 1) * 3600000).toISOString() : undefined,
      epsilon: +(1.0 + r * 0.05).toFixed(2),
      delta: 1e-6,
      lineage: {
        dataset_hash: `ds_${r.toString().padStart(3, '0')}`,
        contrib_count: 5 + r,
        aggregation: 'FedAvg',
      },
      nodes: Array.from({ length: 5 }).map((__, j) => ({
        id: `node_${j+1}`,
        status: Math.random() > 0.1 ? 'online' : 'offline',
        dataCount: 1000 + j * 250 + r * 10,
        lastUpdate: new Date(now - (j+1) * 60000).toISOString(),
        epsilon: +(1.0 + r * 0.05 + j * 0.01).toFixed(2),
        delta: 1e-6,
      })),
    };
  });

  const payload = {
    status: 'running',
    currentRound,
    totalRounds,
    globalModel: { version: '1.2.3', accuracy: 0.87, loss: 0.31 },
    privacy: { epsilon: 1.65, delta: 1e-6 },
    rounds,
    nodes: Array.from({ length: 5 }).map((_, i) => ({
      id: `node_${i+1}`,
      status: Math.random() > 0.1 ? 'online' : 'offline',
      dataCount: 1200 + i * 200,
      lastUpdate: new Date(now - (i+1) * 90000).toISOString(),
      epsilon: 1.5 + i * 0.02,
      delta: 1e-6,
    })),
  };

  res.json({ status: 'success', data: payload });
}
