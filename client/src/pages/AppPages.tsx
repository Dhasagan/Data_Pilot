import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";
import {
  ArrowUpRight, BarChart3, BrainCircuit, Check, ChevronRight, CircleAlert, Database, Download,
  FileBarChart, FileSpreadsheet, FileText, Filter, Gauge, KeyRound, LineChart as LineChartIcon,
  Loader2, LogIn, Menu, MessageSquare, MoreHorizontal, Plus, RefreshCw, Search, ShieldCheck,
  Sparkles, Trash2, TrendingDown, TrendingUp, Upload, UserRound, X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";

const COLORS = ["#e4002b", "#1d4ed8", "#111827", "#6b7280", "#f59e0b", "#14b8a6", "#7c3aed", "#0f766e"];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function usePathDatasetId() {
  const [location] = useLocation();
  const parts = location.split("/");
  const candidate = Number(parts[parts.length - 1]);
  return Number.isFinite(candidate) && candidate > 0 ? candidate : undefined;
}

function SectionHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 border-b border-black pb-6 md:flex-row md:items-end">
      <div>
        <div className="mb-3 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.25em] text-[#e4002b]"><span className="h-2 w-2 bg-[#e4002b]" />{eyebrow}</div>
        <h1 className="font-display text-4xl font-black tracking-[-0.06em] text-black md:text-6xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-black/55">{description}</p>
      </div>
      {action}
    </div>
  );
}

function StatBlock({ label, value, note, accent = false }: { label: string; value: string | number; note?: string; accent?: boolean }) {
  return <div className={`border-l-2 ${accent ? "border-[#e4002b]" : "border-black/20"} pl-4`}><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">{label}</div><div className="mt-2 font-display text-3xl font-black tracking-[-0.05em]">{value}</div>{note && <div className="mt-1 text-xs text-black/45">{note}</div>}</div>;
}

function UploadControl({ onUploaded }: { onUploaded?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string>("");
  const upload = trpc.datasets.upload.useMutation({
    onSuccess: () => { setStatus("Dataset indexed"); onUploaded?.(); },
    onError: error => setStatus(error.message),
  });
  const onFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus("Reading file…");
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      upload.mutate({ fileName: file.name, mimeType: file.type || "application/octet-stream", contentBase64: result.split(",")[1] ?? result });
    };
    reader.onerror = () => setStatus("Could not read this file.");
    reader.readAsDataURL(file);
    event.target.value = "";
  };
  return <div className="flex items-center gap-3"><input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFile} /><Button onClick={() => inputRef.current?.click()} disabled={upload.isPending} className="rounded-none bg-black px-5 text-white hover:bg-[#e4002b]">{upload.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Upload dataset</Button>{status && <span className="max-w-44 text-xs text-black/50">{status}</span>}</div>;
}

export function LoginPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => { if (!loading && user) setLocation("/dashboard"); }, [loading, user, setLocation]);
  return <main className="min-h-screen bg-[#f8f8f5] text-black"><div className="mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[1.15fr_0.85fr]">
    <section className="relative flex flex-col justify-between overflow-hidden border-r border-black/10 px-7 py-8 md:px-14 md:py-12">
      <div className="absolute right-10 top-20 h-24 w-24 bg-[#e4002b] md:h-40 md:w-40" />
      <div className="relative z-10 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center bg-black text-xl font-black text-white">D</div><span className="font-display text-xl font-black tracking-[-0.05em]">DataPilot<span className="text-[#e4002b]">.</span></span></div>
      <div className="relative z-10 my-16 max-w-2xl"><p className="mb-8 font-mono text-[11px] uppercase tracking-[0.25em] text-black/45">A new standard for data fluency</p><h1 className="font-display text-[clamp(3.6rem,9vw,8.8rem)] font-black leading-[0.82] tracking-[-0.09em]">Your AI-<br /><span className="text-[#e4002b]">Powered</span><br />Data Analyst.</h1><p className="mt-10 max-w-md text-base leading-7 text-black/55">Turn raw datasets into confident decisions. Upload, understand, and move forward with a clear point of view.</p></div>
      <div className="relative z-10 flex items-end justify-between border-t border-black/15 pt-5 text-[11px] uppercase tracking-[0.18em] text-black/45"><span>Est. 2026</span><span>Data intelligence / 01</span></div>
    </section>
    <section className="flex flex-col justify-center px-7 py-12 md:px-16"><div className="mx-auto w-full max-w-md"><div className="mb-12"><div className="mb-5 h-2 w-12 bg-[#e4002b]" /><p className="font-mono text-[11px] uppercase tracking-[0.2em] text-black/45">Secure access</p><h2 className="mt-4 font-display text-4xl font-black tracking-[-0.06em]">Welcome to<br />your workspace.</h2><p className="mt-4 text-sm leading-6 text-black/55">Sign in to access your private datasets, analysis history, and generated reports.</p></div><button onClick={() => startLogin()} className="group flex w-full items-center justify-between border border-black bg-white px-5 py-4 text-left text-sm font-bold transition-colors hover:bg-black hover:text-white"><span className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center bg-[#f1f1ee] text-base font-black group-hover:bg-white group-hover:text-black">G</span>Continue with Google</span><ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" /></button><div className="mt-8 flex items-start gap-3 border-t border-black/10 pt-5 text-xs leading-5 text-black/45"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><span>Private by design. Your data is isolated to your authenticated account and is never used to train public models.</span></div><div className="mt-20 flex gap-5 text-[10px] font-bold uppercase tracking-[0.15em] text-black/40"><a href="#privacy" className="hover:text-[#e4002b]">Privacy</a><a href="#terms" className="hover:text-[#e4002b]">Terms</a><span className="ml-auto">v1.0.0</span></div></div></section>
  </div></main>;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const summary = trpc.dashboard.summary.useQuery();
  const utils = trpc.useUtils();
  const datasets = summary.data?.datasets ?? [];
  return <div className="page-enter"><SectionHeading eyebrow="Overview / 01" title={`Good morning, ${user?.name?.split(" ")[0] ?? "there"}.`} description="A concise view of the work that matters. Your latest datasets and analysis signals, all in one place." action={<UploadControl onUploaded={() => { void utils.dashboard.summary.invalidate(); void utils.datasets.list.invalidate(); }} />} /><div className="grid gap-4 border-b border-black pb-10 sm:grid-cols-3"><StatBlock label="Datasets" value={summary.data?.totalDatasets ?? 0} note="Private workspaces" accent /><StatBlock label="Rows indexed" value={(summary.data?.totalRows ?? 0).toLocaleString()} note="Across all datasets" /><StatBlock label="Reports" value={summary.data?.totalReports ?? 0} note="Ready to share" /></div><div className="mt-10 grid gap-8 xl:grid-cols-[1.4fr_0.6fr]"><section><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-2xl font-black tracking-[-0.04em]">Recent datasets</h2><button onClick={() => setLocation("/datasets")} className="text-xs font-bold uppercase tracking-[0.14em] text-[#e4002b]">View all <ChevronRight className="inline h-3 w-3" /></button></div>{summary.isLoading ? <LoadingRow /> : datasets.length ? <div className="grid gap-3 md:grid-cols-2">{datasets.slice(0, 4).map((dataset, index) => <DatasetCard key={dataset.id} dataset={dataset} index={index} onClick={() => setLocation(`/analytics/${dataset.id}`)} />)}</div> : <EmptyState title="Start with a dataset" description="Upload a CSV or Excel file and DataPilot will map its structure automatically." action={<UploadControl onUploaded={() => void utils.dashboard.summary.invalidate()} />} />}</section><section className="border-l border-black/10 pl-0 xl:pl-8"><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-2xl font-black tracking-[-0.04em]">Signal</h2><Sparkles className="h-5 w-5 text-[#e4002b]" /></div><div className="bg-black p-6 text-white"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">What is next</p><h3 className="mt-8 font-display text-3xl font-black leading-none tracking-[-0.05em]">Ask better<br />questions.</h3><p className="mt-5 text-sm leading-6 text-white/60">The Analyst is ready to turn your dataset into a conversation, not just a chart.</p><button onClick={() => setLocation(datasets[0] ? `/ai-analyst/${datasets[0].id}` : "/datasets")} className="mt-8 border border-white/35 px-4 py-3 text-xs font-bold uppercase tracking-[0.15em] transition-colors hover:bg-[#e4002b] hover:border-[#e4002b]">Open Analyst <ArrowUpRight className="ml-2 inline h-4 w-4" /></button></div></section></div></div>;
}

function DatasetCard({ dataset, index, onClick }: { dataset: any; index: number; onClick: () => void }) {
  return <button onClick={onClick} className="group border border-black/15 bg-white p-5 text-left transition-colors hover:border-black hover:bg-[#f1f1ee]"><div className="flex items-start justify-between"><div className={`flex h-10 w-10 items-center justify-center ${index % 2 ? "bg-black text-white" : "bg-[#e4002b] text-white"}`}><FileSpreadsheet className="h-5 w-5" /></div><ArrowUpRight className="h-4 w-4 text-black/35 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" /></div><h3 className="mt-8 truncate font-display text-xl font-black tracking-[-0.04em]">{dataset.name}</h3><p className="mt-2 text-xs text-black/45">{dataset.rowCount.toLocaleString()} rows · {dataset.columnCount} columns</p><div className="mt-5 flex items-center justify-between border-t border-black/10 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-black/40"><span>{dataset.originalName.split(".").pop()?.toUpperCase()}</span><span>{new Date(dataset.createdAt).toLocaleDateString()}</span></div></button>;
}

function LoadingRow() { return <div className="flex items-center gap-3 border border-black/10 p-6 text-sm text-black/50"><Loader2 className="h-4 w-4 animate-spin" />Loading your workspace…</div>; }
function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) { return <div className="border border-dashed border-black/20 bg-white p-10"><div className="mb-5 flex h-10 w-10 items-center justify-center bg-[#e4002b] text-white"><Plus className="h-5 w-5" /></div><h3 className="font-display text-2xl font-black tracking-[-0.04em]">{title}</h3><p className="mt-2 max-w-md text-sm leading-6 text-black/50">{description}</p>{action && <div className="mt-6">{action}</div>}</div>; }

export function DatasetsPage() {
  const datasets = trpc.datasets.list.useQuery();
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const remove = trpc.datasets.delete.useMutation({ onSuccess: () => { void utils.datasets.list.invalidate(); } });
  const filtered = (datasets.data ?? []).filter(item => item.name.toLowerCase().includes(search.toLowerCase()) || item.originalName.toLowerCase().includes(search.toLowerCase()));
  return <div className="page-enter"><SectionHeading eyebrow="Library / 02" title="Datasets" description="Your private source of truth. Upload, inspect, and choose the dataset that deserves a closer look." action={<UploadControl onUploaded={() => void utils.datasets.list.invalidate()} />} /><div className="mb-6 flex flex-col gap-3 border-b border-black/10 pb-6 md:flex-row"><div className="relative max-w-md flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-black/35" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search datasets" className="h-10 rounded-none border-black/20 bg-white pl-10 text-sm" /></div><Button variant="outline" className="h-10 rounded-none border-black/20 text-xs uppercase tracking-[0.12em]"><Filter className="mr-2 h-3.5 w-3.5" />Filter</Button></div>{datasets.isLoading ? <LoadingRow /> : filtered.length ? <div className="border-t border-black">{filtered.map((dataset, index) => <div key={dataset.id} className="group grid gap-4 border-b border-black/10 py-5 md:grid-cols-[1.4fr_0.7fr_0.7fr_auto] md:items-center"><button className="flex items-center gap-4 text-left" onClick={() => setLocation(`/datasets/${dataset.id}`)}><div className="flex h-9 w-9 items-center justify-center bg-[#f1f1ee] group-hover:bg-[#e4002b] group-hover:text-white"><FileSpreadsheet className="h-4 w-4" /></div><div><h3 className="font-bold">{dataset.name}</h3><p className="mt-1 text-xs text-black/45">{dataset.originalName} · {formatBytes(dataset.sizeBytes)}</p></div></button><div className="text-sm text-black/55">{dataset.rowCount.toLocaleString()} rows</div><div className="text-xs uppercase tracking-[0.12em] text-black/45">{new Date(dataset.createdAt).toLocaleDateString()}</div><div className="flex gap-2 md:justify-end"><Button onClick={() => setLocation(`/analytics/${dataset.id}`)} variant="ghost" size="sm" className="rounded-none text-xs">Analyze <ArrowUpRight className="ml-1 h-3 w-3" /></Button><Button onClick={() => remove.mutate({ datasetId: dataset.id })} variant="ghost" size="icon" className="rounded-none text-black/35 hover:text-[#e4002b]"><Trash2 className="h-4 w-4" /></Button></div></div>)}</div> : <EmptyState title="No matching datasets" description="Try another search or upload a new CSV or Excel workbook." />}</div>;
}

export function DatasetDetailPage() {
  const id = usePathDatasetId();
  const [, setLocation] = useLocation();
  const dataset = trpc.datasets.get.useQuery({ datasetId: id ?? 0 }, { enabled: Boolean(id) });
  const storedRows = trpc.datasets.rows.useQuery({ datasetId: id ?? 0 }, { enabled: Boolean(id) });
  if (dataset.isLoading || storedRows.isLoading) return <LoadingRow />;
  if (!dataset.data) return <EmptyState title="Dataset not found" description="This dataset may have been deleted or is not part of your workspace." action={<Button onClick={() => setLocation("/datasets")} className="rounded-none bg-black text-white">Back to datasets</Button>} />;
  const rows = (storedRows.data ?? []) as Record<string, unknown>[];
  const columns = JSON.parse(dataset.data.columnsJson) as string[];
  return <div className="page-enter"><SectionHeading eyebrow="Dataset / Preview" title={dataset.data.name} description={`${dataset.data.rowCount.toLocaleString()} rows · ${dataset.data.columnCount} columns · uploaded ${new Date(dataset.data.createdAt).toLocaleDateString()}`} action={<Button onClick={() => setLocation(`/analytics/${dataset.data?.id}`)} className="rounded-none bg-[#e4002b] text-white hover:bg-black">Open analytics <ArrowUpRight className="ml-2 h-4 w-4" /></Button>} /><div className="mb-6 grid gap-4 sm:grid-cols-3"><StatBlock label="Rows" value={dataset.data.rowCount.toLocaleString()} /><StatBlock label="Columns" value={dataset.data.columnCount} /><StatBlock label="Format" value={dataset.data.originalName.split(".").pop()?.toUpperCase() ?? "FILE"} /></div><div className="overflow-x-auto border border-black/15 bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-black text-[10px] uppercase tracking-[0.16em] text-white"><tr>{columns.map(column => <th key={column} className="whitespace-nowrap px-4 py-3 font-bold">{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-b border-black/10 last:border-0">{columns.map(column => <td key={column} className="max-w-[240px] truncate whitespace-nowrap px-4 py-3 text-black/65">{String(row[column] ?? "—")}</td>)}</tr>)}</tbody></table></div></div>;
}

function AnalyticsCharts({ analysis }: { analysis: any }) {
  return <div className="grid gap-4 xl:grid-cols-2"><Card className="rounded-none border-black/15 shadow-none"><CardHeader className="border-b border-black/10"><CardTitle className="font-display text-xl font-black tracking-[-0.04em]">Category comparison</CardTitle></CardHeader><CardContent className="h-72 pt-6"><ResponsiveContainer width="100%" height="100%"><BarChart data={analysis.chartData.bar.data}><CartesianGrid stroke="#000" strokeOpacity={0.08} vertical={false} /><XAxis dataKey={analysis.chartData.bar.categoryKey} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey={analysis.chartData.bar.valueKey} fill="#e4002b" barSize={24} /></BarChart></ResponsiveContainer></CardContent></Card><Card className="rounded-none border-black/15 shadow-none"><CardHeader className="border-b border-black/10"><CardTitle className="font-display text-xl font-black tracking-[-0.04em]">Observed movement</CardTitle></CardHeader><CardContent className="h-72 pt-6"><ResponsiveContainer width="100%" height="100%"><LineChart data={analysis.chartData.line.data}><CartesianGrid stroke="#000" strokeOpacity={0.08} vertical={false} /><XAxis dataKey={analysis.chartData.line.xKey} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip /><Line type="monotone" dataKey={analysis.chartData.line.yKey} stroke="#111827" strokeWidth={3} dot={{ r: 2, fill: "#e4002b" }} /></LineChart></ResponsiveContainer></CardContent></Card><Card className="rounded-none border-black/15 shadow-none xl:col-span-2"><CardHeader className="border-b border-black/10"><CardTitle className="font-display text-xl font-black tracking-[-0.04em]">Composition</CardTitle></CardHeader><CardContent className="grid h-80 grid-cols-2 items-center pt-4"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={analysis.chartData.pie.data} dataKey="value" nameKey="name" innerRadius={65} outerRadius={105} paddingAngle={3}>{analysis.chartData.pie.data.map((_: any, index: number) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer><div className="hidden border-l border-black/10 pl-8 sm:block"><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/45">Chart note</p><p className="mt-3 max-w-xs text-sm leading-6 text-black/60">Visuals are generated directly from detected categorical and numeric fields. Select another dataset to change the analytical frame.</p></div></CardContent></Card></div>;
}

export function AnalyticsPage() {
  const id = usePathDatasetId();
  const [, setLocation] = useLocation();
  const query = trpc.analytics.overview.useQuery({ datasetId: id ?? 0 }, { enabled: Boolean(id) });
  if (query.isLoading) return <LoadingRow />;
  if (!query.data) return <EmptyState title="Choose a dataset" description="Select a dataset from the library to unlock analytics." action={<Button onClick={() => setLocation("/datasets")} className="rounded-none bg-black text-white">Browse datasets</Button>} />;
  const { dataset, analysis } = query.data;
  const metric = analysis.numericColumns[0];
  return <div className="page-enter"><SectionHeading eyebrow="Analytics / 03" title={dataset.name} description={`A visual overview generated from ${analysis.rowCount.toLocaleString()} rows. The system detected ${analysis.numericColumns.length} numeric fields and ${analysis.dateColumns.length} time fields.`} action={<Button onClick={() => setLocation(`/ai-analyst/${dataset.id}`)} variant="outline" className="rounded-none border-black"><BrainCircuit className="mr-2 h-4 w-4" />Ask Analyst</Button>} /><div className="mb-8 grid gap-4 border-b border-black pb-8 sm:grid-cols-2 lg:grid-cols-4"><StatBlock label="Rows" value={analysis.rowCount.toLocaleString()} accent /><StatBlock label="Fields" value={analysis.columnCount} /><StatBlock label="Numeric signals" value={analysis.numericColumns.length} /><StatBlock label="Primary metric" value={metric?.column ?? "—"} /></div><AnalyticsCharts analysis={analysis} /></div>;
}

export function AIAnalystPage() {
  const id = usePathDatasetId();
  const datasets = trpc.datasets.list.useQuery();
  const selectedId = id ?? datasets.data?.[0]?.id;
  const history = trpc.chat.history.useQuery({ datasetId: selectedId ?? 0 }, { enabled: Boolean(selectedId) });
  const send = trpc.chat.send.useMutation({ onSuccess: () => void history.refetch() });
  const [, setLocation] = useLocation();
  const messages: Message[] = (history.data?.messages ?? []).map(item => ({ role: item.role as Message["role"], content: item.content }));
  if (!selectedId) return <EmptyState title="Start with a dataset" description="The Analyst needs a dataset to ground its answers." action={<Button onClick={() => setLocation("/datasets")} className="rounded-none bg-black text-white">Browse datasets</Button>} />;
  const selected = datasets.data?.find(item => item.id === selectedId);
  return <div className="page-enter"><SectionHeading eyebrow="AI Analyst / 04" title="Ask the data." description="A conversational workspace grounded in the selected dataset. Ask follow-ups, challenge assumptions, and keep the thread." action={<select value={selectedId} onChange={event => setLocation(`/ai-analyst/${event.target.value}`)} className="h-10 border border-black bg-white px-3 text-sm font-bold">{(datasets.data ?? []).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>} /><div className="mb-4 flex items-center gap-3 text-xs text-black/50"><span className="h-2 w-2 bg-[#e4002b]" />Dataset context: <strong className="text-black">{selected?.name}</strong></div><AIChatBox messages={messages} onSendMessage={message => send.mutate({ datasetId: selectedId, conversationId: history.data?.conversationId, message })} isLoading={send.isPending} height="min(620px, calc(100vh - 280px))" emptyStateMessage="Start a grounded conversation about your data." suggestedPrompts={["What are the key insights?", "Show revenue trends", "Find the best-performing products", "Find anomalies", "Compare regions", "Predict future sales"]} /></div>;
}

export function InsightsPage() {
  const id = usePathDatasetId();
  const datasets = trpc.datasets.list.useQuery();
  const selectedId = id ?? datasets.data?.[0]?.id;
  const insights = trpc.insights.list.useQuery({ datasetId: selectedId ?? 0 }, { enabled: Boolean(selectedId) });
  const generate = trpc.insights.generate.useMutation({ onSuccess: result => { setNarrative(result.narrative); void insights.refetch(); } });
  const [narrative, setNarrative] = useState("");
  const selected = datasets.data?.find(item => item.id === selectedId);
  if (!selectedId) return <EmptyState title="No insight surface yet" description="Upload a dataset and DataPilot will calculate highlights from it." />;
  return <div className="page-enter"><SectionHeading eyebrow="Insights / 05" title="The signal layer." description="Calculated highlights that make important changes easier to notice. Every finding below is derived from the selected dataset." action={<Button onClick={() => generate.mutate({ datasetId: selectedId })} disabled={generate.isPending} className="rounded-none bg-black text-white hover:bg-[#e4002b]">{generate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Refresh insights</Button>} /><div className="mb-7 flex items-center justify-between border-b border-black/10 pb-4"><div className="text-sm text-black/55">Viewing <strong className="text-black">{selected?.name}</strong></div><Badge className="rounded-none bg-[#f1f1ee] text-black hover:bg-[#f1f1ee]">Calculated analysis</Badge></div>{narrative && <div className="mb-6 border-l-4 border-[#e4002b] bg-white p-5 text-sm leading-6 text-black/70"><Streamdown>{narrative}</Streamdown></div>}{insights.isLoading ? <LoadingRow /> : insights.data?.length ? <div className="grid gap-4 md:grid-cols-2">{insights.data.map(item => <div key={item.id} className="border border-black/15 bg-white p-6"><div className="flex items-start justify-between"><div className={`flex h-9 w-9 items-center justify-center ${item.severity === "positive" ? "bg-black text-white" : "bg-[#e4002b] text-white"}`}>{item.category === "Trend" ? <TrendingUp className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}</div><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">{item.category}</span></div><h3 className="mt-8 font-display text-2xl font-black tracking-[-0.05em]">{item.title}</h3><p className="mt-3 text-sm leading-6 text-black/60">{item.summary}</p>{item.metric && <div className="mt-6 border-t border-black/10 pt-3 font-mono text-xs text-black/45">{item.metric}</div>}</div>)}</div> : <EmptyState title="Generate the first read" description="Run the insight engine to calculate patterns, quality signals, and changes from this dataset." action={<Button onClick={() => generate.mutate({ datasetId: selectedId })} className="rounded-none bg-[#e4002b] text-white">Calculate insights</Button>} />}</div>;
}

export function ForecastPage() {
  const id = usePathDatasetId();
  const datasets = trpc.datasets.list.useQuery();
  const selectedId = id ?? datasets.data?.[0]?.id;
  const overview = trpc.analytics.overview.useQuery({ datasetId: selectedId ?? 0 }, { enabled: Boolean(selectedId) });
  const forecast = trpc.forecast.run.useMutation();
  const [dateColumn, setDateColumn] = useState("");
  const [targetColumn, setTargetColumn] = useState("");
  const [horizon, setHorizon] = useState(6);
  useEffect(() => { if (overview.data) { setDateColumn(overview.data.analysis.dateColumns[0] ?? overview.data.analysis.columns[0] ?? ""); setTargetColumn(overview.data.analysis.numericColumns[0]?.column ?? ""); } }, [overview.data]);
  const analysis = overview.data?.analysis;
  if (!selectedId) return <EmptyState title="Forecasting needs a dataset" description="Upload a dataset with historical values to project future movement." />;
  return <div className="page-enter"><SectionHeading eyebrow="Forecast / 06" title="Look ahead." description="A transparent linear projection for datasets with a meaningful time axis and numeric target. Use it as a directional signal, not a promise." /><div className="grid gap-8 xl:grid-cols-[0.35fr_0.65fr]"><Card className="h-fit rounded-none border-black/15 shadow-none"><CardHeader className="border-b border-black/10"><CardTitle className="font-display text-xl font-black tracking-[-0.04em]">Forecast setup</CardTitle></CardHeader><CardContent className="space-y-5 pt-6"><label className="block text-xs font-bold uppercase tracking-[0.13em]">Date / index<select value={dateColumn} onChange={event => setDateColumn(event.target.value)} className="mt-2 h-10 w-full border border-black/20 bg-white px-3 text-sm normal-case tracking-normal">{(analysis?.dateColumns.length ? analysis.dateColumns : analysis?.columns ?? []).map(column => <option key={column}>{column}</option>)}</select></label><label className="block text-xs font-bold uppercase tracking-[0.13em]">Target metric<select value={targetColumn} onChange={event => setTargetColumn(event.target.value)} className="mt-2 h-10 w-full border border-black/20 bg-white px-3 text-sm normal-case tracking-normal">{(analysis?.numericColumns ?? []).map(item => <option key={item.column}>{item.column}</option>)}</select></label><label className="block text-xs font-bold uppercase tracking-[0.13em]">Periods ahead<input type="number" min={1} max={24} value={horizon} onChange={event => setHorizon(Number(event.target.value))} className="mt-2 h-10 w-full border border-black/20 bg-white px-3 text-sm font-normal tracking-normal" /></label><Button onClick={() => forecast.mutate({ datasetId: selectedId, dateColumn, targetColumn, horizon })} disabled={!dateColumn || !targetColumn || forecast.isPending} className="w-full rounded-none bg-[#e4002b] text-white hover:bg-black">{forecast.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}Run projection</Button>{forecast.error && <p className="text-xs text-[#e4002b]">{forecast.error.message}</p>}</CardContent></Card><div>{forecast.data ? <><div className="mb-5 border-l-4 border-[#e4002b] bg-white p-5 text-sm leading-6 text-black/70"><Streamdown>{forecast.data.summary}</Streamdown></div><Card className="rounded-none border-black/15 shadow-none"><CardHeader className="border-b border-black/10"><CardTitle className="font-display text-xl font-black tracking-[-0.04em]">Actual vs projected</CardTitle></CardHeader><CardContent className="h-[380px] pt-6"><ResponsiveContainer width="100%" height="100%"><LineChart data={forecast.data.points}><CartesianGrid stroke="#000" strokeOpacity={0.08} vertical={false} /><XAxis dataKey="period" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip /><Legend /><Line type="monotone" dataKey="actual" stroke="#111827" strokeWidth={3} dot={false} /><Line type="monotone" dataKey="forecast" stroke="#e4002b" strokeWidth={3} strokeDasharray="6 6" dot={{ r: 2 }} /></LineChart></ResponsiveContainer></CardContent></Card></> : <div className="flex h-full min-h-[360px] flex-col justify-center border border-dashed border-black/20 p-8"><LineChartIcon className="h-8 w-8 text-[#e4002b]" /><h3 className="mt-8 font-display text-3xl font-black tracking-[-0.05em]">A view of what could be next.</h3><p className="mt-3 max-w-md text-sm leading-6 text-black/50">Choose the time axis, select the metric, and generate a directional projection.</p></div>}</div></div></div>;
}

function downloadText(name: string, content: string, type = "text/plain") { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url); }

export function ReportsPage() {
  const datasets = trpc.datasets.list.useQuery();
  const reports = trpc.reports.list.useQuery();
  const generate = trpc.reports.generate.useMutation({ onSuccess: () => void reports.refetch() });
  const remove = trpc.reports.delete.useMutation({ onSuccess: () => void reports.refetch() });
  const [datasetId, setDatasetId] = useState<number | undefined>();
  useEffect(() => { if (!datasetId && datasets.data?.[0]) setDatasetId(datasets.data[0].id); }, [datasetId, datasets.data]);
  return <div className="page-enter"><SectionHeading eyebrow="Reports / 07" title="Make it legible." description="Package a dataset's structure, calculated findings, and visual signals into a document you can carry forward." action={<Button onClick={() => datasetId && generate.mutate({ datasetId })} disabled={!datasetId || generate.isPending} className="rounded-none bg-[#e4002b] text-white hover:bg-black">{generate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Generate report</Button>} /><div className="mb-10 flex flex-col gap-4 border-b border-black/10 pb-7 md:flex-row md:items-center"><span className="text-xs font-bold uppercase tracking-[0.14em]">Source dataset</span><select value={datasetId ?? ""} onChange={event => setDatasetId(Number(event.target.value))} className="h-10 max-w-md border border-black/20 bg-white px-3 text-sm"><option value="" disabled>Select a dataset</option>{(datasets.data ?? []).map(dataset => <option key={dataset.id} value={dataset.id}>{dataset.name}</option>)}</select></div>{reports.isLoading ? <LoadingRow /> : reports.data?.length ? <div className="border-t border-black">{reports.data.map(report => <div key={report.id} className="grid gap-4 border-b border-black/10 py-5 md:grid-cols-[1fr_auto_auto] md:items-center"><div><h3 className="font-display text-xl font-black tracking-[-0.04em]">{report.title}</h3><p className="mt-1 text-sm text-black/50">{report.summary}</p></div><span className="text-xs text-black/40">{new Date(report.createdAt).toLocaleDateString()}</span><div className="flex gap-2"><Button asChild variant="outline" size="sm" className="rounded-none border-black"><a href={report.storageUrl} download={report.fileName}><Download className="mr-2 h-3.5 w-3.5" />Download document</a></Button><Button onClick={() => remove.mutate({ reportId: report.id })} variant="ghost" size="icon" className="rounded-none text-black/35 hover:text-[#e4002b]"><Trash2 className="h-4 w-4" /></Button></div></div>)}</div> : <EmptyState title="No reports yet" description="Generate a report after selecting a source dataset. It will remain scoped to your workspace." />}</div>;
}

export function SettingsPage() { const { user } = useAuth(); return <div className="page-enter"><SectionHeading eyebrow="Settings / 08" title="Workspace settings." description="A quiet place for account context and product preferences." /><div className="grid gap-4 lg:grid-cols-2"><Card className="rounded-none border-black/15 shadow-none"><CardHeader><CardTitle className="font-display text-2xl font-black tracking-[-0.04em]">Account</CardTitle></CardHeader><CardContent className="space-y-4 text-sm"><div className="flex items-center justify-between border-b border-black/10 pb-4"><span className="text-black/45">Name</span><strong>{user?.name ?? "—"}</strong></div><div className="flex items-center justify-between border-b border-black/10 pb-4"><span className="text-black/45">Email</span><strong>{user?.email ?? "—"}</strong></div><div className="flex items-center justify-between"><span className="text-black/45">Provider</span><strong>Google / Manus OAuth</strong></div></CardContent></Card><Card className="rounded-none border-black/15 shadow-none"><CardHeader><CardTitle className="font-display text-2xl font-black tracking-[-0.04em]">Preferences</CardTitle></CardHeader><CardContent className="space-y-4 text-sm"><div className="flex items-center justify-between border-b border-black/10 pb-4"><span className="text-black/45">Chart language</span><span className="font-bold">English</span></div><div className="flex items-center justify-between border-b border-black/10 pb-4"><span className="text-black/45">Default chart</span><span className="font-bold">Auto-detect</span></div><div className="flex items-center justify-between"><span className="text-black/45">Visual system</span><span className="font-bold">International Typographic Style</span></div></CardContent></Card></div><div className="mt-8 flex items-start gap-3 border-l-4 border-black bg-white p-5 text-sm leading-6 text-black/60"><KeyRound className="mt-1 h-4 w-4 text-[#e4002b]" />Your datasets and generated artifacts are scoped to your authenticated user ID. No shared workspace access is enabled in this build.</div></div>; }
export function ProfilePage() { const { user } = useAuth(); const initial = user?.name?.[0]?.toUpperCase() ?? "D"; return <div className="page-enter"><SectionHeading eyebrow="Profile / 09" title="Your account." description="Identity and access context for this DataPilot workspace." /><div className="max-w-xl border border-black/15 bg-white p-8"><div className="flex items-center gap-5 border-b border-black/10 pb-7"><div className="flex h-16 w-16 items-center justify-center bg-[#e4002b] font-display text-3xl font-black text-white">{initial}</div><div><h2 className="font-display text-2xl font-black tracking-[-0.04em]">{user?.name ?? "DataPilot user"}</h2><p className="mt-1 text-sm text-black/50">{user?.email ?? "No email provided"}</p></div></div><div className="space-y-5 pt-7 text-sm"><div className="flex items-center justify-between"><span className="text-black/45">Login provider</span><span className="font-bold">Google</span></div><div className="flex items-center justify-between"><span className="text-black/45">Account created</span><span className="font-bold">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</span></div><div className="flex items-center justify-between"><span className="text-black/45">Last sign-in</span><span className="font-bold">{user?.lastSignedIn ? new Date(user.lastSignedIn).toLocaleDateString() : "—"}</span></div></div></div></div>; }
