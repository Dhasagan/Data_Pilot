import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { BarChart3, BrainCircuit, Database, FileBarChart, Gauge, LogOut, PanelLeft, Settings2, Sparkles, TrendingUp, UserRound } from "lucide-react";
import { CSSProperties, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const menuItems = [
  { icon: Gauge, label: "Dashboard", path: "/dashboard" },
  { icon: Database, label: "Datasets", path: "/datasets" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: BrainCircuit, label: "AI Analyst", path: "/ai-analyst" },
  { icon: Sparkles, label: "Insights", path: "/insights" },
  { icon: TrendingUp, label: "Forecast", path: "/forecast" },
  { icon: FileBarChart, label: "Reports", path: "/reports" },
];

const secondaryItems = [
  { icon: Settings2, label: "Settings", path: "/settings" },
  { icon: UserRound, label: "Profile", path: "/profile" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem("datapilot-sidebar-width");
    return saved ? parseInt(saved, 10) : 260;
  });
  const { loading, user } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => { localStorage.setItem("datapilot-sidebar-width", sidebarWidth.toString()); }, [sidebarWidth]);
  useEffect(() => { if (!loading && !user) setLocation("/login"); }, [loading, user, setLocation]);
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) return <div className="flex min-h-screen items-center justify-center bg-[#f8f8f5]"><div className="text-center"><p className="mb-4 text-sm text-black/55">Sign in to enter your workspace.</p><Button onClick={() => startLogin()} className="rounded-none bg-black text-white">Continue with Google</Button></div></div>;
  return <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}><DashboardLayoutContent user={user} setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent></SidebarProvider>;
}

function DashboardLayoutContent({ children, user, setSidebarWidth }: { children: React.ReactNode; user: NonNullable<ReturnType<typeof useAuth>["user"]>; setSidebarWidth: (width: number) => void }) {
  const { logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const isMobile = useIsMobile();
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key === "b") { event.preventDefault(); toggleSidebar(); } }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [toggleSidebar]);
  const activeLabel = [...menuItems, ...secondaryItems].find(item => location === item.path || location.startsWith(`${item.path}/`))?.label ?? "Workspace";
  const navigate = (path: string) => { setLocation(path); if (isMobile) toggleSidebar(); };
  return <><Sidebar collapsible="icon" className="border-r border-black/15 bg-[#f1f1ee]"><SidebarHeader className="h-[84px] border-b border-black/10"><div className="flex items-center gap-3 px-2"><button onClick={toggleSidebar} aria-label="Toggle navigation" className="flex h-9 w-9 shrink-0 items-center justify-center bg-black text-white transition-colors hover:bg-[#e4002b]"><PanelLeft className="h-4 w-4" /></button>{!isCollapsed && <div className="min-w-0"><div className="font-display text-lg font-black tracking-[-0.06em]">DataPilot<span className="text-[#e4002b]">.</span></div><div className="font-mono text-[9px] uppercase tracking-[0.15em] text-black/45">Data intelligence</div></div>}</div></SidebarHeader><SidebarContent className="px-2 py-5"><div className="mb-3 px-3 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-black/35">Workspace</div><SidebarMenu>{menuItems.map(item => <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={location === item.path || location.startsWith(`${item.path}/`)} onClick={() => navigate(item.path)} tooltip={item.label} className="h-10 rounded-none font-bold text-black/65 hover:bg-white hover:text-black data-[active=true]:bg-black data-[active=true]:text-white"><item.icon className="h-4 w-4" /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu><div className="mb-3 mt-8 px-3 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-black/35">Account</div><SidebarMenu>{secondaryItems.map(item => <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={location === item.path} onClick={() => navigate(item.path)} tooltip={item.label} className="h-10 rounded-none font-bold text-black/65 hover:bg-white hover:text-black data-[active=true]:bg-black data-[active=true]:text-white"><item.icon className="h-4 w-4" /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarContent><SidebarFooter className="border-t border-black/10 p-3"><button onClick={() => logout()} className="mb-3 flex w-full items-center gap-3 rounded-none px-2 py-2 text-left text-xs font-bold text-black/55 transition-colors hover:bg-white hover:text-[#e4002b]"><LogOut className="h-4 w-4" /><span>Log out</span></button><div className="flex items-center gap-3 px-1"><Avatar className="h-9 w-9 rounded-none bg-[#e4002b] text-white"><AvatarFallback className="rounded-none bg-[#e4002b] text-white">{user.name?.[0]?.toUpperCase() ?? "D"}</AvatarFallback></Avatar>{!isCollapsed && <div className="min-w-0"><p className="truncate text-xs font-bold">{user.name ?? "DataPilot user"}</p><p className="truncate text-[10px] text-black/45">{user.email ?? ""}</p></div>}</div></SidebarFooter></Sidebar><SidebarInset className="min-w-0 bg-[#f8f8f5]"><header className="sticky top-0 z-30 flex h-[84px] items-center justify-between border-b border-black/10 bg-[#f8f8f5]/95 px-5 backdrop-blur md:px-10"><div className="flex items-center gap-3"><SidebarTrigger className="h-9 w-9 rounded-none border border-black/15 bg-white md:hidden" /><div><div className="font-mono text-[9px] uppercase tracking-[0.22em] text-black/35">DataPilot / {activeLabel}</div><div className="mt-1 text-xs text-black/40">Private workspace</div></div></div><div className="hidden items-center gap-3 sm:flex"><span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-black/40"><span className="h-2 w-2 bg-[#e4002b]" />Live data</span><span className="font-mono text-[10px] text-black/35">⌘ B</span></div></header><main className="mx-auto w-full max-w-[1600px] p-5 md:p-10">{children}</main></SidebarInset></>;
}
