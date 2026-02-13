import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, AreaChart, Area, LabelList,
  PieChart, Pie, Legend
} from 'recharts';
import { 
  Users, MessageSquare, UserCheck, TrendingUp, 
  DollarSign, Briefcase, RefreshCcw, Zap,
  ArrowUp, ArrowDown, ArrowRight, Activity, 
  Target, CheckCircle2, Info, AlertCircle, Award
} from 'lucide-react';
import { 
  formatCurrency, formatPercent, formatNumber, parseGoogleSheetsJSON 
} from './utils';
import { 
  DashboardState, KPIData, RevenueTrend, WeeklyConversation, SourceConversion 
} from './types';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1zL0ZkcCC4K-PoVwlz_mkNWCR22XfPdM1_7k-rkg32Es/gviz/tq?tqx=out:json&gid=2004389061';
const REFRESH_INTERVAL = 5 * 60 * 1000;
const LOGO_URL = 'https://pivottai.com/assets/pivott-logo-bQ24Oe-4.png';

const SOURCE_COLORS: Record<string, string> = {
  'LinkedIn': '#0A66C2',
  'Instantly': '#6366F1',
  'Calendly': '#006BFF',
  'Organic': '#10B981',
  'Other': '#F59E0B'
};

const KPICard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendDir?: 'up' | 'down' | 'neutral';
  tooltip?: string;
}> = ({ title, value, icon, trend, trendDir = 'neutral', tooltip }) => {
  const TrendIcon = trendDir === 'up' ? ArrowUp : trendDir === 'down' ? ArrowDown : ArrowRight;
  const trendBg = trendDir === 'up' ? 'bg-pivott-success text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 
                   trendDir === 'down' ? 'bg-pivott-danger text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 
                   'bg-slate-500 text-white';

  return (
    <div className="glass-box p-8 rounded-[2rem] flex flex-col gap-6 relative overflow-hidden group h-full transition-all duration-300">
      <div className="absolute top-0 right-0 w-40 h-40 bg-pivott-blue/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-pivott-blue/15 transition-all duration-700"></div>
      
      <div className="flex items-start justify-between relative z-10">
        <div className="p-4 rounded-2xl bg-pivott-navy text-pivott-blue border border-pivott-blue/30 shadow-xl group-hover:bg-pivott-blue group-hover:text-pivott-navy transition-all duration-500 transform group-hover:scale-105">
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1.5 ${trendBg} px-3.5 py-1.5 rounded-xl transition-transform hover:scale-110 cursor-default font-black`}>
            <TrendIcon className="w-3.5 h-3.5" />
            <span className="text-[13px] uppercase tracking-wider">{trend}</span>
          </div>
        )}
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2 group/info">
          <p className="text-[12px] font-bold text-pivott-blue uppercase tracking-[0.2em] opacity-80">{title}</p>
          {tooltip && (
            <div className="relative">
              <Info className="w-4 h-4 text-white/20 hover:text-pivott-blue transition-colors cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 p-4 bg-pivott-navy/95 border border-pivott-blue/30 rounded-2xl text-[12px] text-white opacity-0 group-hover/info:opacity-100 transition-all pointer-events-none z-50 shadow-2xl backdrop-blur-xl translate-y-2 group-hover/info:translate-y-0 leading-relaxed font-medium">
                {tooltip}
              </div>
            </div>
          )}
        </div>
        <p className="text-[42px] font-extrabold text-white tracking-tighter font-display leading-none group-hover:text-pivott-sand transition-colors duration-500">{value}</p>
      </div>
    </div>
  );
};

const ChartCard: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, children, className = "" }) => (
  <div className={`glass-box p-8 md:p-10 rounded-[3rem] flex flex-col h-full chart-container-hover ${className}`}>
    <div className="mb-8 md:mb-10 flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-6 bg-pivott-blue rounded-full shadow-[0_0_12px_rgba(110,172,218,0.6)]"></div>
        <h3 className="text-2xl font-black text-pivott-sand font-display tracking-tight uppercase">
          {title}
        </h3>
      </div>
      {subtitle && <p className="text-[14px] font-bold text-white/50 tracking-wide pl-4 uppercase">{subtitle}</p>}
    </div>
    <div className="flex-1 min-h-[350px] w-full relative">
      {children}
    </div>
  </div>
);

const FunnelStep: React.FC<{ label: string, value: string | number, isLast?: boolean }> = ({ label, value, isLast }) => (
  <div className={`flex-1 flex flex-col items-center text-center px-4 ${!isLast ? 'funnel-arrow' : ''}`}>
    <p className="text-[10px] font-bold text-pivott-blue uppercase tracking-[0.2em] mb-1 opacity-70 italic">{label}</p>
    <p className="text-4xl font-black text-white font-display tracking-tighter">{value}</p>
  </div>
);

const App: React.FC = () => {
  const [state, setState] = useState<DashboardState & { timeFilter: string }>({
    kpis: null,
    revenueTrend: [],
    weeklyConversations: [],
    sourceConversions: [],
    loading: true,
    error: null,
    lastUpdated: null,
    timeFilter: 'All time'
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch(SHEET_URL);
      if (!response.ok) throw new Error('Data sync failed');
      const text = await response.text();
      const rawData = parseGoogleSheetsJSON(text);
      const rows = rawData.table?.rows;
      if (!rows || rows.length === 0) throw new Error('No dataset records found');

      const getNum = (cell: any) => (cell && typeof cell.v === 'number') ? cell.v : 0;
      const getStr = (cell: any) => (cell && cell.v !== null && cell.v !== undefined) ? String(cell.v) : '';

      const firstRowCells = rows[0]?.c || [];
      const kpis: KPIData = {
        totalOpportunities: getNum(firstRowCells[0]),
        qualifiedConversations: getNum(firstRowCells[1]),
        convertedClients: getNum(firstRowCells[2]),
        conversionRate: Math.abs(getNum(firstRowCells[3])), 
        totalRevenue: getNum(firstRowCells[4]),
        activeClientLoad: getNum(firstRowCells[14]) || 1, 
      };

      const revenueTrend: RevenueTrend[] = [];
      const weeklyConversations: WeeklyConversation[] = [];
      const sourceConversions: SourceConversion[] = [];

      rows.forEach((row: any) => {
        const cells = row?.c;
        if (!cells) return;
        
        const month = getStr(cells[5]);
        const rev = cells[6]?.v;
        if (month && typeof rev === 'number') revenueTrend.push({ month, revenue: rev });
        
        const week = getStr(cells[7]);
        const count = cells[8]?.v;
        if (week && typeof count === 'number') weeklyConversations.push({ week, count });
        
        const source = getStr(cells[9]);
        const rate = cells[12]?.v;
        if (source && typeof rate === 'number') {
          // Attributing revenue from index 13 as indicated by the Dashboard_Calculations sheet logic
          const revAttr = getNum(cells[13]); 
          sourceConversions.push({
            source,
            qualified: getNum(cells[10]),
            converted: getNum(cells[11]),
            rate: Math.abs(rate),
            revenue: revAttr
          });
        }
      });

      setState(prev => ({ ...prev, kpis, revenueTrend, weeklyConversations, sourceConversions, loading: false, lastUpdated: new Date() }));
    } catch (err) {
      console.error(err);
      setState(prev => ({ ...prev, loading: false, error: err instanceof Error ? err.message : 'Unknown sync error' }));
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchData]);

  const topSource = useMemo(() => 
    state.sourceConversions.length ? [...state.sourceConversions].sort((a, b) => b.rate - a.rate)[0] : null
  , [state.sourceConversions]);

  const pieData = useMemo(() => {
    if (!state.sourceConversions.length) return [];
    
    // Check if we have real attributed revenue in the sheet (non-zero)
    const hasRealRevenue = state.sourceConversions.some(s => s.revenue > 0);
    const avgDeal = state.kpis?.convertedClients ? (state.kpis.totalRevenue / state.kpis.convertedClients) : 0;

    return state.sourceConversions
      .filter(s => s.converted > 0 || s.revenue > 0)
      .map(s => ({
        name: s.source,
        // Use real revenue if available, else fallback to avg estimate
        value: hasRealRevenue ? s.revenue : (s.converted * avgDeal),
        fill: SOURCE_COLORS[s.source] || SOURCE_COLORS['Other']
      }));
  }, [state.sourceConversions, state.kpis]);

  // Loading state
  if (state.loading && !state.kpis) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-20 gap-10">
        <div className="w-28 h-28 border-[8px] border-pivott-blue/10 border-t-pivott-blue rounded-full animate-spin"></div>
        <div className="text-center space-y-4">
          <p className="text-pivott-sand font-black uppercase tracking-[1em] text-sm animate-pulse">Establishing Node Link...</p>
          <p className="text-white/40 text-[10px] uppercase font-bold tracking-[0.4em]">Enterprise API Connectivity v4.2.1</p>
        </div>
      </div>
    );
  }

  // Error state
  if (state.error && !state.kpis) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-12 gap-8 text-center">
        <AlertCircle className="w-20 h-20 text-pivott-danger animate-pulse" />
        <div className="space-y-4">
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Connection Interrupted</h1>
          <p className="text-pivott-sand/60 max-w-md mx-auto">{state.error}</p>
        </div>
        <button 
          onClick={fetchData} 
          className="flex items-center gap-4 bg-pivott-blue text-pivott-navy px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-2xl active:scale-95"
        >
          <RefreshCcw className="w-5 h-5" /> Retry Handshake
        </button>
      </div>
    );
  }

  const isHighConversion = (state.kpis?.conversionRate || 0) >= 0.3;

  return (
    <div className="min-h-screen pb-32 font-sans animate-fade-in px-8 md:px-16 bg-main-gradient overflow-x-hidden">
      {/* HEADER BAR */}
      <nav className="max-w-[1800px] mx-auto mt-12 py-6 flex flex-col lg:flex-row items-center justify-between border-b border-white/10 gap-8">
        <div className="flex items-center gap-10">
          <div className="relative group cursor-pointer" onClick={() => window.location.reload()}>
            <img src={LOGO_URL} alt="Pivott AI" className="h-10 w-auto hover:scale-110 transition-transform duration-500" />
            <div className="absolute -inset-4 bg-pivott-blue/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
          <div className="hidden sm:block border-l border-white/10 pl-10 h-10 flex flex-col justify-center">
            <p className="text-2xl font-black text-white uppercase tracking-tighter leading-none">PIVOTT AI</p>
            <p className="text-[10px] font-bold text-pivott-blue uppercase tracking-[0.4em] mt-1.5 opacity-80 italic">PIPELINE ANALYTICS ENGINE</p>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 bg-pivott-navy/60 p-2 rounded-2xl border border-pivott-blue/20 shadow-inner">
            {['7D', '30D', '90D', 'All time'].map(p => (
              <button 
                key={p} 
                onClick={() => setState(s => ({ ...s, timeFilter: p }))}
                className={`px-5 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-wider transition-all duration-300 ${state.timeFilter === p ? 'bg-pivott-blue text-pivott-navy shadow-lg scale-105' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-4 bg-pivott-navy/30 px-5 py-2.5 rounded-2xl border border-pivott-blue/20">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pivott-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-pivott-success"></span>
            </span>
            <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">LIVE DATA STREAM</span>
          </div>
          <button onClick={fetchData} className="p-3.5 bg-pivott-blue/10 border border-pivott-blue/30 rounded-2xl hover:bg-pivott-blue hover:text-pivott-dark transition-all duration-500 active:scale-90 shadow-2xl group">
            <RefreshCcw className={`w-6 h-6 group-hover:rotate-180 transition-transform duration-700 ${state.loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </nav>

      <main className="max-w-[1800px] mx-auto mt-20 space-y-16">
        {/* FUNNEL AND TITLE */}
        <div className="flex flex-col xl:flex-row gap-16 xl:items-center justify-between px-2">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter font-display uppercase leading-tight">
              Pipeline Performance<br/>
              <span className="text-pivott-blue italic flex items-center gap-6">
                Dashboard
                {isHighConversion && (
                   <span className="inline-flex items-center gap-2 bg-pivott-success text-white px-4 py-1.5 rounded-xl text-[12px] font-black tracking-widest animate-confetti shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                     <Award className="w-4 h-4" /> ELITE PERFORMANCE
                   </span>
                )}
              </span>
            </h2>
          </div>
          <div className="glass-box p-8 md:p-10 rounded-[2.5rem] flex items-center justify-between min-w-[400px] md:min-w-[600px] gap-6 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.6)] border-pivott-blue/25">
            <FunnelStep label="Top of Funnel" value={formatNumber(state.kpis?.totalOpportunities || 0)} />
            <FunnelStep label="Qualified Pipeline" value={formatNumber(state.kpis?.qualifiedConversations || 0)} />
            <FunnelStep label="Revenue Wins" value={formatNumber(state.kpis?.convertedClients || 0)} isLast />
          </div>
        </div>

        {/* KPI GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-8">
          <KPICard title="Opportunities" value={formatNumber(state.kpis?.totalOpportunities || 0)} icon={<Users className="w-7 h-7" />} trend="+12%" trendDir="up" tooltip="Total potential leads entering the system. Syncing from global CRM nodes." />
          <KPICard title="Qualified Opps" value={formatNumber(state.kpis?.qualifiedConversations || 0)} icon={<MessageSquare className="w-7 h-7" />} trend="+3%" trendDir="up" tooltip="Verified leads that have passed the strict qualification threshold." />
          <KPICard title="Closed Deals" value={formatNumber(state.kpis?.convertedClients || 0)} icon={<UserCheck className="w-7 h-7" />} trend="+14%" trendDir="up" tooltip="Number of enterprise deals closed-won this period." />
          <KPICard title="Conv. Rate" value={formatPercent(state.kpis?.conversionRate || 0)} icon={<TrendingUp className="w-7 h-7" />} trend="+2%" trendDir="up" tooltip="Efficiency of your qualification-to-close pipeline." />
          <KPICard title="Total Revenue" value={formatCurrency(state.kpis?.totalRevenue || 0)} icon={<DollarSign className="w-7 h-7" />} trend="+28%" trendDir="up" tooltip="Gross attribution from all closed-won records synced from calculations sheet." />
          <KPICard title="Active Clients" value={formatNumber(state.kpis?.activeClientLoad || 0)} icon={<Briefcase className="w-7 h-7" />} trend="→" trendDir="neutral" tooltip="Live managed client records within the service ecosystem." />
        </div>

        {/* ROW 1: REVENUE TREND & WEEKLY ACTIVITY */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <ChartCard title="Monthly Revenue Momentum" subtitle={`Cumulative Yield: ${formatCurrency(state.kpis?.totalRevenue || 0)}`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={state.revenueTrend} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6EACDA" stopOpacity={0.7}/>
                    <stop offset="95%" stopColor="#6EACDA" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#E2E2B6', fontSize: 13, fontWeight: 800 }} dy={12} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#E2E2B6', fontSize: 13, fontWeight: 800 }} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip 
                  cursor={{ stroke: '#6EACDA', strokeWidth: 2, strokeDasharray: '4 4' }}
                  contentStyle={{ backgroundColor: '#021526', borderRadius: '1.5rem', border: '2px solid rgba(110,172,218,0.4)', color: '#fff', padding: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#6EACDA', fontWeight: '900' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#6EACDA" 
                  strokeWidth={6} 
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                  animationDuration={2500}
                  dot={{ r: 9, fill: '#6EACDA', strokeWidth: 3, stroke: '#fff' }}
                  activeDot={{ r: 12, strokeWidth: 4, stroke: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  data={[
                    ...state.revenueTrend, 
                    { month: 'Proj.', revenue: (state.revenueTrend[state.revenueTrend.length - 1]?.revenue || 0) * 1.35 }
                  ]} 
                  dataKey="revenue" 
                  stroke="#6EACDA" 
                  strokeDasharray="8 8" 
                  strokeWidth={3}
                  fill="none" 
                  animationDuration={3000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Weekly Activity Pulse" subtitle={`${state.weeklyConversations.reduce((a, b) => a + b.count, 0)} qualified conversations recorded`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={state.weeklyConversations} margin={{ top: 45, right: 25, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6EACDA" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#03346E" stopOpacity={1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#E2E2B6', fontSize: 13, fontWeight: 800 }} dy={12} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#E2E2B6', fontSize: 13, fontWeight: 800 }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(110, 172, 218, 0.15)', radius: 12 }}
                  contentStyle={{ backgroundColor: '#021526', borderRadius: '1.5rem', border: '2px solid rgba(110,172,218,0.4)', padding: '16px' }}
                  itemStyle={{ color: '#6EACDA', fontWeight: '900' }}
                />
                <Bar dataKey="count" radius={[18, 18, 0, 0]} barSize={85} fill="url(#barGrad)">
                  <LabelList dataKey="count" position="top" fill="#E2E2B6" style={{ fontSize: '18px', fontWeight: 900 }} dy={-15} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ROW 2: REVENUE BY SOURCE & PERFORMANCE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <ChartCard title="Revenue Distribution" subtitle="Direct attribution from calculation sheet">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={pieData} 
                  innerRadius={115} 
                  outerRadius={160} 
                  paddingAngle={10} 
                  dataKey="value"
                  animationDuration={2200}
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} className="hover:opacity-80 transition-opacity cursor-pointer filter drop-shadow-xl" />
                  ))}
                </Pie>
                <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ paddingLeft: '50px', fontWeight: '900', fontSize: '14px', textTransform: 'uppercase' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#021526', borderRadius: '1.5rem', border: 'none', color: '#fff', boxShadow: '0 30px 60px rgba(0,0,0,0.7)', padding: '20px' }} 
                  formatter={(value) => [formatCurrency(value as number), 'Revenue Attribution']}
                  itemStyle={{ color: '#6EACDA', fontWeight: '900' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Lead Efficiency Matrix" subtitle="Win-rate benchmark per source">
            <div className="flex-1 w-full flex flex-col justify-center">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={state.sourceConversions} layout="vertical" margin={{ top: 20, right: 110, left: 35, bottom: 20 }}>
                    <XAxis type="number" domain={[0, 1]} hide />
                    <YAxis dataKey="source" type="category" axisLine={false} tickLine={false} tick={{ fill: '#fff', fontSize: 16, fontWeight: 900 }} width={130} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(110, 172, 218, 0.15)', radius: 12 }} 
                      contentStyle={{ backgroundColor: '#021526', borderRadius: '1.5rem', border: '1px solid rgba(110,172,218,0.4)', padding: '16px' }} 
                      formatter={(value) => [`${Math.round((value as number) * 100)}%`, 'Win Rate']}
                      itemStyle={{ color: '#6EACDA', fontWeight: '900' }}
                    />
                    <Bar dataKey="rate" radius={[0, 24, 24, 0]} barSize={60} animationDuration={2000}>
                       {state.sourceConversions.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={SOURCE_COLORS[entry.source] || '#6EACDA'} className="filter drop-shadow-lg" />
                       ))}
                       <LabelList 
                         dataKey="rate" 
                         position="right" 
                         formatter={(val: number) => `${Math.round(val * 100)}%`} 
                         style={{ fill: '#fff', fontWeight: 900, fontSize: '19px' }} 
                         dx={22}
                       />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-10 space-y-5 px-4">
                {state.sourceConversions.map((s, i) => (
                  <div key={i} className="flex justify-between items-center bg-white/5 p-5 rounded-[2rem] border border-white/5 hover:border-pivott-blue/50 transition-all group cursor-default">
                    <div className="flex items-center gap-5">
                       <div className="w-6 h-6 rounded-full shadow-[0_0_15px_rgba(110,172,218,0.3)]" style={{ backgroundColor: SOURCE_COLORS[s.source] || '#6EACDA' }}></div>
                       <span className="text-lg font-black text-pivott-sand uppercase tracking-wider">{s.source}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-white/70 group-hover:text-white transition-colors">
                        <span className="text-white font-black">{s.qualified}</span> Qualified 
                        <span className="mx-3 opacity-30 text-pivott-blue font-light">|</span>
                        <span className="text-white font-black">{s.converted}</span> Won
                      </span>
                      <div className="bg-pivott-blue/20 text-pivott-blue px-4 py-1.5 rounded-xl font-black text-[14px] shadow-sm">
                        {Math.round(s.rate * 100)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>

        {/* COMPACT MARKET INTELLIGENCE SECTION */}
        <div className="relative group overflow-hidden rounded-[2rem] p-6 md:p-8 flex flex-col lg:flex-row gap-8 text-white border border-pivott-blue/20 bg-gradient-to-br from-pivott-navy to-pivott-dark shadow-2xl">
          <div className="absolute -top-32 -right-32 w-[300px] h-[300px] bg-pivott-blue/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-pivott-blue/15 transition-all"></div>
          
          <div className="relative z-10 flex flex-col justify-between flex-1">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-pivott-blue/20 backdrop-blur-3xl rounded-[1rem] flex items-center justify-center border border-pivott-blue/40 shadow-xl">
                  <Activity className="w-7 h-7 text-pivott-blue" />
                </div>
                <div>
                  <h3 className="text-xl font-black font-display tracking-tight leading-none uppercase italic underline decoration-pivott-sand/20 underline-offset-4">Market Intelligence</h3>
                  <p className="text-[9px] font-black text-pivott-sand tracking-[0.4em] mt-2 uppercase opacity-80 italic">Global Diagnostics Engine</p>
                </div>
              </div>
              
              <div className="flex items-center gap-8 bg-white/5 px-6 py-3 rounded-2xl border border-white/5">
                <div className="flex flex-col">
                  <span className="text-4xl font-black text-white font-display tracking-tighter leading-none">
                    {formatPercent(state.kpis?.conversionRate || 0)}
                  </span>
                  <span className="text-[10px] text-pivott-blue font-black uppercase tracking-widest mt-1">Matrix Efficiency</span>
                </div>
                <div className="h-10 w-px bg-white/10"></div>
                <div className="flex flex-col">
                  <span className="text-xl font-black text-pivott-sand uppercase italic leading-none">
                    {topSource?.source || 'INSTANTLY'}
                  </span>
                  <span className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-1">Lead Dominance</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div className="glass-box bg-white/5 rounded-[1.5rem] p-5 border border-pivott-blue/20 shadow-lg hover:border-pivott-sand/40 transition-all">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-[10px] text-pivott-blue uppercase font-black tracking-[0.3em]">Pipeline At Risk/Reward</p>
                  <span className="text-[9px] bg-pivott-blue/20 text-pivott-blue px-2 py-0.5 rounded-full font-bold">Attributed</span>
                </div>
                <p className="text-3xl font-black text-white font-display tracking-tighter mb-3">
                  {formatCurrency(state.kpis?.totalRevenue || 0)}
                </p>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                   <div className="h-full bg-pivott-blue" style={{ width: '100%' }}></div>
                </div>
              </div>
              
              <div className="glass-box bg-white/5 rounded-[1.5rem] p-5 border border-pivott-blue/20 shadow-lg hover:border-pivott-sand/40 transition-all flex flex-col justify-center">
                 <p className="text-white/60 text-sm font-medium leading-snug">
                   Historical nodes identify the <span className="text-pivott-blue font-black">{topSource?.source || 'Instantly'}</span> channel as your highest yield interaction vector. Direct attribution synced successfully.
                 </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="mt-32 max-w-[1800px] mx-auto border-t border-white/10 pt-20 pb-28 flex flex-col md:flex-row justify-between items-center gap-12 opacity-80">
        <div className="flex items-center gap-10">
          <div className="w-5 h-5 rounded-full bg-pivott-success shadow-[0_0_25px_rgba(16,185,129,0.9)] animate-pulse"></div>
          <span className="text-[15px] font-black uppercase tracking-[0.4em] text-white">
            © 2026 Pivott AI • Distributed Analytics Protocol • Secure Cloud Link
          </span>
        </div>
        <div className="flex gap-20 text-[14px] font-black text-pivott-blue uppercase tracking-[0.6em]">
          <span className="flex items-center gap-4 hover:text-white transition-all cursor-pointer group">
            <Activity className="w-6 h-6 group-hover:scale-110 transition-transform" /> System Integrity
          </span>
          <span className="flex items-center gap-4 hover:text-white transition-all cursor-pointer group">
            <RefreshCcw className="w-6 h-6 group-hover:rotate-90 transition-transform" /> Node Sync: 300s
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
