import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw } from 'lucide-react';

export default function AuditLogs() {
  const [symbol, setSymbol] = useState('');
  const [status, setStatus] = useState('');
  const [trades, setTrades] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (symbol) qs.set('symbol', symbol);
      if (status) qs.set('status', status);
      const t = await fetch(`/api/events/trades?${qs.toString()}`);
      const b = await fetch(`/api/events/balances`);
      const tj = await t.json();
      const bj = await b.json();
      setTrades(tj.data.items);
      setBalances(bj.data.items);
    } catch (e:any) {
      setError(e.message || 'Failed to load');
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Audit & Logs</h1>
        <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-2"/>Refresh</Button>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Input placeholder="Symbol (e.g. BTC/USDT)" value={symbol} onChange={(e)=>setSymbol(e.target.value.toUpperCase())} />
            <Input placeholder="Status (filled/pending)" value={status} onChange={(e)=>setStatus(e.target.value)} />
            <Button onClick={load}>Apply</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Trades</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead><tr><th className="text-left p-2">Trade ID</th><th className="text-left p-2">Symbol</th><th className="text-left p-2">Side</th><th className="text-left p-2">Size</th><th className="text-left p-2">Price</th><th className="text-left p-2">Status</th><th className="text-left p-2">Request ID</th></tr></thead>
              <tbody>
                {trades.map(t => (
                  <tr key={t.id} className="border-t">
                    <td className="p-2">{t.id}</td>
                    <td className="p-2">{t.symbol}</td>
                    <td className="p-2">{t.side}</td>
                    <td className="p-2">{t.size}</td>
                    <td className="p-2">{t.price}</td>
                    <td className="p-2">{t.status}</td>
                    <td className="p-2">{t.request_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Balance Events</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead><tr><th className="text-left p-2">ID</th><th className="text-left p-2">Account</th><th className="text-left p-2">Symbol</th><th className="text-left p-2">Delta</th><th className="text-left p-2">Reason</th><th className="text-left p-2">Request ID</th></tr></thead>
              <tbody>
                {balances.map(b => (
                  <tr key={b.id} className="border-t">
                    <td className="p-2">{b.id}</td>
                    <td className="p-2">{b.account}</td>
                    <td className="p-2">{b.symbol}</td>
                    <td className="p-2">{b.delta}</td>
                    <td className="p-2">{b.reason}</td>
                    <td className="p-2">{b.request_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
