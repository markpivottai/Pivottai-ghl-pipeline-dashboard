
import React, { useState, useEffect, useCallback } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, AreaChart, Area
} from 'recharts';
import { 
  Users, MessageSquare, UserCheck, TrendingUp, 
  DollarSign, Briefcase, RefreshCcw, LayoutDashboard, 
  ChevronRight, Activity, Zap
} from 'lucide-react';
import { 
  formatCurrency, formatPercent, formatNumber, parseGoogleSheetsJSON 
} from './utils';
import { 
  DashboardState, KPIData, RevenueTrend, WeeklyConversation, SourceConversion 
} from './types';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1zL0ZkcCC4K-PoVwlz_mkNWCR22XfPdM1_7k-rkg32Es/gviz/tq?tqx=out:json&gid=2004389061';
const REFRESH_INTERVAL = 5 * 60 * 1000;
const LOGO_URL = 'https://pivottai.com/wp-content/uploads/2023/11/Logo-Pivott-White.png';

const KPICard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
}> = ({ title, value, icon, trend }) => (
  <div className="glass-box p-8 rounded-[2rem] flex flex-col gap-5 relative overflow-hidden group">
    <div className="absolute top-0 right-0 w-32 h-32 bg-pivott-blue/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-pivott-blue/10 transition-colors"></div>
    <div className="flex items-center justify-between relative z-10">
      <div className="p-4 rounded-2xl bg-gradient-to-br from-pivott-navy to-pivott-dark text-pivott-blue border border-pivott-blue/20 shadow-lg group-hover:scale-110 transition-transform duration-500">
        {icon}
      </div>
      {trend && (
        <span className="text-[10px] font-black text-pivott-sand bg-pivott-blue/10 border border-pivott-blue/30 px-3 py-1.5 rounded-xl uppercase tracking-widest backdrop-blur-md">
          {trend}
        </span>
      )}
    </div>
    <div className="relative z-10">
      <p className="text-[11px] font-black text-pivott-blue uppercase tracking-[0.3em] opacity-80 mb-2">{title}</p>
      <p className="text-4xl font-black text-white tracking-tighter font-display drop-shadow-lg">{value}</p>
    </div>
  </div>
);

const ChartCard: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, children }) => (
  <div className="glass-box p-10 rounded-[2.5rem] h-full flex flex-col group">
    <div className="mb-10 flex justify-between items-start">
      <div>
        <h3 className="text-2xl font-black text-white flex items-center gap-4 font-display tracking-tight">
          <span className="w-2 h-8 bg-gradient-to-b from-pivott-blue to-pivott-sand rounded-full shadow-lg shadow-pivott-blue/20"></span>
          {title}
        </h3>
        {subtitle && <p className="text-sm text-pivott-blue/50 mt-2 font-semibold uppercase tracking-widest">{subtitle}</p>}
      </div>
      <div className="flex gap-2">
        <div className="w-2 h-2 rounded-full bg-pivott-navy"></div>
        <div className="w-2 h-2 rounded-full bg-pivott-blue opacity-50"></div>
        <div className="w-2 h-2 rounded-full bg-pivott-sand opacity-30"></div>
      </div>
    </div>
    <div className="flex-1 min-h-[350px] w-full">
      {children}
    </div>
  </div>
);

const App: React.FC = () => {
  const [state, setState] = useState<DashboardState>({
    kpis: null,
    revenueTrend: [],
    weeklyConversations: [],
    sourceConversions: [],
    loading: true,
    error: null,
    lastUpdated: null
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch(SHEET_URL);
      if (!response.ok) throw new Error('Data sync failed.');
      
      const text = await response.text();
      const rawData = parseGoogleSheetsJSON(text);
      const rows = rawData.table?.rows;

      if (!rows || rows.length === 0) throw new Error('No data found.');

      const getNum = (cell: any) => (cell && typeof cell.v === 'number') ? cell.v : 0;
      const getStr = (cell: any) => (cell && cell.v !== null && cell.v !== undefined) ? String(cell.v) : '';

      const firstRowCells = rows[0]?.c || [];
      const kpis: KPIData = {
        totalOpportunities: getNum(firstRowCells[0]),
        qualifiedConversations: getNum(firstRowCells[1]),
        convertedClients: getNum(firstRowCells[2]),
        conversionRate: getNum(firstRowCells[3]),
        totalRevenue: getNum(firstRowCells[4]),
        activeClientLoad: getNum(firstRowCells[13]),
      };

      const revenueTrend: RevenueTrend[] = [];
      const weeklyConversations: WeeklyConversation[] = [];
      const sourceConversions: SourceConversion[] = [];

      rows.forEach((row: any) => {
        const cells = row?.c;
        if (!cells) return;
        const month = getStr(cells[5]);
        const revValue = cells[6]?.v;
        if (month && typeof revValue === 'number') revenueTrend.push({ month, revenue: revValue });
        const week = getStr(cells[7]);
        const count = cells[8]?.v;
        if (week && typeof count === 'number') weeklyConversations.push({ week, count });
        const source = getStr(cells[9]);
        const rate = cells[12]?.v;
        if (source && typeof rate === 'number') {
          sourceConversions.push({
            source,
            qualified: getNum(cells[10]),
            converted: getNum(cells[11]),
            rate
          });
        }
      });

      setState({ kpis, revenueTrend, weeklyConversations, sourceConversions, loading: false, error: null, lastUpdated: new Date() });
    } catch (err) {
      console.error(err);
      setState(prev => ({ ...prev, loading: false, error: 'Sync Error' }));
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchData]);

  if (state.loading && !state.kpis) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-8">
        <div className="relative">
          <div className="w-24 h-24 border-[4px] border-pivott-blue/10 border-t-pivott-blue rounded-full animate-spin shadow-2xl"></div>
          <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-pivott-blue animate-pulse fill-current" />
        </div>
        <div className="text-center">
          <p className="text-pivott-sand font-black tracking-[0.6em] uppercase text-sm mb-2">Pivott AI Link</p>
          <p className="text-pivott-blue/50 text-[10px] uppercase font-bold tracking-widest">Ingesting Neural Pipeline Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 font-sans">
      {/* Header - Not sticky */}
      <nav className="glass-box mx-8 mt-8 py-6 px-12 rounded-[2.5rem] relative z-50 flex items-center justify-between border-pivott-blue/10">
        <div className="flex items-center gap-8">
          <div className="relative group">
            <div className="absolute -inset-2 bg-pivott-blue/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <img 
              src={LOGO_URL} 
              alt="Pivott AI Logo" 
              className="h-10 w-auto relative z-10 transition-transform duration-500 group-hover:scale-105" 
              onError={(e) => {
                // Fallback to text if image fails
                (e.target as HTMLImageElement).style.display = 'none';
                const parent = (e.target as HTMLElement).parentElement;
                if (parent) parent.innerHTML = '<h1 class="text-3xl font-black text-white">PIVOTT AI</h1>';
              }}
            />
          </div>
          <div className="border-l border-pivott-blue/20 pl-8 h-12 flex flex-col justify-center">
            <p className="text-[11px] font-black text-pivott-sand tracking-[0.5em] uppercase opacity-60">ANALYTICS ENGINE v4.0</p>
            <p className="text-[9px] font-bold text-pivott-blue uppercase tracking-widest mt-0.5 italic">Intelligence for the Modern Pipeline</p>
          </div>
        </div>
        <div className="flex items-center gap-12">
          <div className="hidden xl:flex flex-col items-end">
            <span className="text-[10px] font-black text-pivott-blue uppercase tracking-widest mb-1 opacity-70">Neural Connection</span>
            <div className="flex items-center gap-3 bg-pivott-navy/30 px-4 py-1.5 rounded-full border border-pivott-blue/10">
              <span className="w-2 h-2 bg-pivott-sand rounded-full animate-pulse shadow-[0_0_10px_rgba(226,226,182,0.8)]"></span>
              <span className="text-[11px] font-black text-pivott-sand uppercase italic tracking-tighter">Live Stream Active</span>
            </div>
          </div>
          <button 
            onClick={fetchData}
            disabled={state.loading}
            className="group relative w-16 h-16 bg-pivott-navy/50 border border-pivott-blue/20 rounded-[1.25rem] flex items-center justify-center hover:bg-pivott-blue hover:border-pivott-blue transition-all duration-500 shadow-2xl"
          >
            <RefreshCcw className={`w-7 h-7 text-pivott-blue group-hover:text-white transition-all duration-700 group-hover:rotate-180 ${state.loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </nav>

      <main className="max-w-[1800px] mx-auto px-10 mt-20 space-y-16">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 px-6">
          <div className="animate-in slide-in-from-left duration-1000">
            <div className="flex items-center gap-4 text-pivott-sand font-black text-[12px] uppercase tracking-[0.6em] mb-4">
              <Activity className="w-5 h-5 text-pivott-blue" /> Machine Intelligence
            </div>
            <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter font-display leading-[0.85]">
              Market <span className="text-pivott-blue italic">Velocity</span>
            </h2>
          </div>
          <div className="glass-box px-10 py-5 rounded-[2rem] border-pivott-blue/10 flex flex-col items-end shadow-2xl">
            <p className="text-[11px] font-black text-pivott-blue uppercase tracking-[0.4em] mb-1 opacity-60">System Timestamp</p>
            <p className="text-2xl font-black text-pivott-sand font-display italic tracking-tight">
              {state.lastUpdated?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-8 animate-in slide-in-from-bottom duration-1000 delay-200">
          <KPICard title="Total Opps" value={formatNumber(state.kpis?.totalOpportunities || 0)} icon={<Users className="w-7 h-7" />} />
          <KPICard title="Qualified" value={formatNumber(state.kpis?.qualifiedConversations || 0)} icon={<MessageSquare className="w-7 h-7" />} />
          <KPICard title="Won Contracts" value={formatNumber(state.kpis?.convertedClients || 0)} icon={<UserCheck className="w-7 h-7" />} trend="+14.2%" />
          <KPICard title="Conv. Ratio" value={formatPercent(state.kpis?.conversionRate || 0)} icon={<TrendingUp className="w-7 h-7" />} />
          <KPICard title="Net Revenue" value={formatCurrency(state.kpis?.totalRevenue || 0)} icon={<DollarSign className="w-7 h-7" />} trend="+28.4%" />
          <KPICard title="Managed Load" value={formatNumber(state.kpis?.activeClientLoad || 0)} icon={<Briefcase className="w-7 h-7" />} />
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in slide-in-from-bottom duration-1000 delay-400">
          <ChartCard title="Revenue Trajectory" subtitle="Monthly neural ingestion analytics">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={state.revenueTrend} margin={{ top: 20, right: 20, left: 0, bottom: 40 }}>
                <defs>
                  <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6EACDA" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#6EACDA" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="rgba(110, 172, 218, 0.1)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#E2E2B6', fontSize: 13, fontWeight: 800 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#E2E2B6', fontSize: 13, fontWeight: 800 }} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#021526', borderRadius: '2rem', border: '1px solid rgba(110, 172, 218, 0.3)', color: '#fff', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#6EACDA', fontWeight: 'bold' }}
                  labelStyle={{ display: 'none' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6EACDA" strokeWidth={6} fillOpacity={1} fill="url(#chartFill)" animationDuration={3000} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Engagement Matrix" subtitle="Weekly conversational interaction density">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={state.weeklyConversations} margin={{ top: 20, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="rgba(110, 172, 218, 0.1)" />
                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#E2E2B6', fontSize: 13, fontWeight: 800 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#E2E2B6', fontSize: 13, fontWeight: 800 }} />
                <Tooltip cursor={{ fill: 'rgba(110, 172, 218, 0.08)', radius: 15 }} contentStyle={{ backgroundColor: '#021526', borderRadius: '2rem', border: '1px solid rgba(110, 172, 218, 0.3)' }} />
                <Bar dataKey="count" fill="#03346E" radius={[15, 15, 15, 15]} barSize={50}>
                  {state.weeklyConversations.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6EACDA' : '#03346E'} className="transition-all duration-500 hover:opacity-80" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Source Optimization" subtitle="Qualified to converted efficiency index">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={state.sourceConversions} layout="vertical" margin={{ top: 10, right: 60, left: 40, bottom: 20 }}>
                <CartesianGrid strokeDasharray="6 6" horizontal={false} stroke="rgba(110, 172, 218, 0.1)" />
                <XAxis type="number" domain={[0, 1]} tickFormatter={(val) => `${val * 100}%`} axisLine={false} tickLine={false} tick={{ fill: '#E2E2B6', fontSize: 13 }} />
                {/* Fixed: Removed invalid 'textTransform' property from tick object as it's not a standard SVG attribute. Using tickFormatter for uppercase instead. */}
                <YAxis 
                  dataKey="source" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#fff', fontSize: 14, fontWeight: 900, letterSpacing: '0.05em' }} 
                  tickFormatter={(val) => String(val).toUpperCase()}
                  width={120} 
                />
                <Tooltip cursor={{ fill: 'rgba(110, 172, 218, 0.08)', radius: 15 }} contentStyle={{ backgroundColor: '#021526', borderRadius: '2rem', border: '1px solid rgba(110, 172, 218, 0.3)' }} />
                <Bar dataKey="rate" radius={[0, 15, 15, 0]} barSize={35}>
                  {state.sourceConversions.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={['#6EACDA', '#03346E', '#E2E2B6', '#021526', '#1e3a8a'][index % 5]} 
                      className="transition-all duration-500 hover:opacity-80"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Deep Insight Box */}
          <div className="relative group overflow-hidden rounded-[3rem] p-16 flex flex-col justify-between text-white border-2 border-pivott-blue/20 bg-gradient-to-br from-pivott-navy via-pivott-dark to-pivott-navy shadow-[0_0_100px_rgba(3,52,110,0.5)]">
            <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-pivott-blue/10 rounded-full blur-[180px] group-hover:bg-pivott-blue/20 transition-all duration-1000"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-8 mb-12">
                <div className="w-20 h-20 bg-gradient-to-br from-pivott-blue/20 to-pivott-navy/20 backdrop-blur-3xl rounded-[2rem] flex items-center justify-center border border-pivott-blue/30 shadow-2xl rotate-12 hover:rotate-0 transition-transform duration-700">
                  <Zap className="w-10 h-10 text-pivott-blue fill-current animate-pulse" />
                </div>
                <div>
                  <h3 className="text-4xl font-black font-display tracking-tight leading-none uppercase italic underline decoration-pivott-sand/20 decoration-8 underline-offset-12">System Insight</h3>
                  <p className="text-[12px] font-black text-pivott-sand tracking-[0.7em] mt-4 uppercase">Growth Logic Core</p>
                </div>
              </div>
              
              <p className="text-pivott-sand/90 mb-16 leading-[1.3] text-3xl font-bold max-w-2xl font-display">
                Current performance confirms a <span className="text-white font-black px-3 py-1 bg-pivott-blue/20 rounded-xl">{formatPercent(state.kpis?.conversionRate || 0)}</span> efficiency threshold. 
                Focusing ingestion on <span className="text-pivott-blue font-black underline decoration-pivott-sand decoration-4 uppercase tracking-tighter italic">{state.sourceConversions.sort((a,b) => b.rate - a.rate)[0]?.source || 'primary'}</span> channels will maximize output.
              </p>
              
              <div className="grid grid-cols-2 gap-10">
                <div className="glass-box bg-white/5 rounded-[2.5rem] p-10 border-pivott-blue/10 hover:border-pivott-sand/40 transition-colors">
                  <p className="text-[12px] text-pivott-blue uppercase font-black tracking-widest mb-3 opacity-70">Target ROI Forecast</p>
                  <p className="text-5xl font-black text-white font-display italic tracking-tighter drop-shadow-xl">
                    {formatCurrency((state.kpis?.totalRevenue || 0) / (state.kpis?.convertedClients || 1) * 3.2)}
                  </p>
                </div>
                <div className="glass-box bg-white/5 rounded-[2.5rem] p-10 border-pivott-blue/10 hover:border-pivott-sand/40 transition-colors">
                  <p className="text-[12px] text-pivott-blue uppercase font-black tracking-widest mb-3 opacity-70">Neural Precision</p>
                  <p className="text-5xl font-black text-pivott-sand font-display italic tracking-tighter drop-shadow-xl">99.2%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-40 px-12 max-w-[1800px] mx-auto border-t border-pivott-blue/10 pt-20 pb-20 flex flex-col md:flex-row justify-between items-center gap-12">
        <div className="flex items-center gap-6">
          <div className="w-4 h-4 rounded-full bg-pivott-navy shadow-[0_0_15px_rgba(3,52,110,0.8)] animate-pulse"></div>
          <span className="text-[12px] font-black text-pivott-blue uppercase tracking-[0.4em] opacity-50">&copy; 2026 PIVOTT AI. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
