
export interface KPIData {
  totalOpportunities: number;
  qualifiedConversations: number;
  convertedClients: number;
  conversionRate: number;
  totalRevenue: number;
  activeClientLoad: number;
}

export interface RevenueTrend {
  month: string;
  revenue: number;
}

export interface WeeklyConversation {
  week: string;
  count: number;
}

export interface SourceConversion {
  source: string;
  qualified: number;
  converted: number;
  rate: number;
  revenue: number; // Added for direct attribution from Dashboard_Calculations
}

export interface DashboardState {
  kpis: KPIData | null;
  revenueTrend: RevenueTrend[];
  weeklyConversations: WeeklyConversation[];
  sourceConversions: SourceConversion[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}
