import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AdminPlugins(){
  const [items,setItems]=useState<any[]>([]);
  const [name,setName]=useState('');
  const [module,setModule]=useState('');
  const [description,setDescription]=useState('');
  const [error,setError]=useState<string|null>(null);
  const load=async()=>{setError(null);try{const r=await fetch('/api/governance/plugins');const j=await r.json();setItems(j.data||[]);}catch(e:any){setError(e.message||'Failed');}};
  useEffect(()=>{load();},[]);
  const propose=async()=>{const r=await fetch('/api/governance/plugins/propose',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name, module, description})});const j=await r.json();if(r.ok){setName('');setModule('');setDescription('');load();}else{alert(j.detail||'Failed');}}
  const vote=async(n:string,c:string)=>{await fetch(`/api/governance/plugins/${encodeURIComponent(n)}/vote`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({choice:c})});load();}
  const approve=async(n:string)=>{await fetch(`/api/governance/plugins/${encodeURIComponent(n)}/approve`,{method:'POST'});load();}
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-bold">Strategy Plugins</h1><Button variant="outline" onClick={load}>Refresh</Button></div>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <Card>
        <CardHeader><CardTitle>Propose Plugin</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
          <Input placeholder="Module path" value={module} onChange={e=>setModule(e.target.value)} />
          <Textarea placeholder="Description" value={description} onChange={e=>setDescription(e.target.value)} />
          <Button onClick={propose} disabled={!name||!module||!description}>Submit</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Proposals</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm"><thead><tr><th className="p-2 text-left">Name</th><th className="p-2 text-left">Module</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Votes</th><th className="p-2"></th></tr></thead>
            <tbody>
              {items.map((p:any)=>(
                <tr key={p.name} className="border-t">
                  <td className="p-2">{p.name}</td>
                  <td className="p-2">{p.module}</td>
                  <td className="p-2">{p.status}</td>
                  <td className="p-2">+{p.votes?.for||0}/-{p.votes?.against||0}/~{p.votes?.abstain||0}</td>
                  <td className="p-2 text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={()=>vote(p.name,'approve')}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={()=>vote(p.name,'reject')}>Reject</Button>
                    <Button size="sm" onClick={()=>approve(p.name)} disabled={(p.votes?.for||0)<2}>Activate</Button>
                  </td>
                </tr>
              ))}
            </tbody></table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
