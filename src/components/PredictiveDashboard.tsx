import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, AlertTriangle, CheckCircle, ArrowRight, Loader2, BarChart3, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { AnalyticsService } from '../services/analyticsService';
import { toast } from 'sonner';

interface PredictiveDashboardProps {
  userId: string;
  workspaceId: string;
}

export const PredictiveDashboard: React.FC<PredictiveDashboardProps> = ({ userId, workspaceId }) => {
  const [forecastData, setForecastData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForecast = async () => {
      setLoading(true);
      try {
        const result = await AnalyticsService.getFutureForecast(userId, workspaceId);
        setForecastData(result);
      } catch (error) {
        console.error("Failed to fetch forecast", error);
        toast.error("Predictive Analytics Engine failed to load.");
      } finally {
        setLoading(false);
      }
    };

    if (userId && workspaceId) fetchForecast();
  }, [userId, workspaceId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white/5 rounded-3xl border border-white/10 min-h-[400px]">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
        <div className="text-white/60 text-sm font-mono uppercase tracking-widest">
          S+ AI CORE ANALYZING HISTORY...
        </div>
      </div>
    );
  }

  if (forecastData?.status === 'insufficient_data') {
    return (
      <div className="p-8 bg-black/40 rounded-3xl border border-white/10 text-center">
        <BarChart3 className="w-12 h-12 text-white/20 mx-auto mb-4" />
        <h3 className="text-white text-xl font-medium mb-2">Insufficient Data</h3>
        <p className="text-white/60 text-sm max-w-md mx-auto">
          {forecastData.mitigationPlan}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Forecast Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg:col-span-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4 sm:p-8 shadow-2xl"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-white text-xl sm:text-2xl font-medium tracking-tight">Future Forecast</h2>
            <p className="text-white/40 text-xs sm:text-sm">Predictive growth analysis for the next 7 days</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-emerald-400" />
              <span className="text-white/60 text-[10px] sm:text-xs font-mono uppercase">Current</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-indigo-400" />
              <span className="text-white/60 text-[10px] sm:text-xs font-mono uppercase">Predicted</span>
            </div>
          </div>
        </div>

        <div className="h-[200px] sm:h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={Array.isArray(forecastData?.forecast) ? forecastData.forecast : []}>
              <defs>
                <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#ffffff40" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="#ffffff40" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff20', borderRadius: '12px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Area 
                type="monotone" 
                dataKey="current" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorCurrent)" 
              />
              <Area 
                type="monotone" 
                dataKey="predicted" 
                stroke="#818cf8" 
                strokeWidth={3}
                strokeDasharray="5 5"
                fillOpacity={1} 
                fill="url(#colorPredicted)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Insights & Mitigation */}
      <div className="flex flex-col gap-6">
        {/* Growth Rate Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-mono uppercase tracking-widest">Growth Engine</span>
          </div>
          <div className="flex items-end gap-4">
            <div>
              <div className="text-white/40 text-xs uppercase mb-1">Current</div>
              <div className="text-white text-3xl font-medium">{forecastData?.growthRate?.current}</div>
            </div>
            <ArrowRight className="w-6 h-6 text-white/20 mb-2" />
            <div>
              <div className="text-white/40 text-xs uppercase mb-1">Predicted</div>
              <div className="text-white text-3xl font-medium text-emerald-400">{forecastData?.growthRate?.predicted}</div>
            </div>
          </div>
        </motion.div>

        {/* Risk & Mitigation Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-3xl p-6 border ${
            forecastData?.riskLevel === 'high' 
              ? 'bg-red-500/10 border-red-500/20' 
              : 'bg-amber-500/10 border-amber-500/20'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {forecastData?.riskLevel === 'high' ? (
                <AlertTriangle className="w-5 h-5 text-red-400" />
              ) : (
                <Target className="w-5 h-5 text-amber-400" />
              )}
              <span className={`text-sm font-mono uppercase tracking-widest ${
                forecastData?.riskLevel === 'high' ? 'text-red-400' : 'text-amber-400'
              }`}>
                {forecastData?.riskLevel === 'high' ? 'Critical Risk' : 'Strategic Insight'}
              </span>
            </div>
            <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
              forecastData?.riskLevel === 'high' ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'
            }`}>
              {forecastData?.riskLevel}
            </div>
          </div>
          
          <h4 className="text-white font-medium mb-2">{forecastData?.keyInsight}</h4>
          <p className="text-white/60 text-sm mb-4 line-clamp-3">
            {forecastData?.mitigationPlan}
          </p>
          
          <button className="w-full py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
            View Full Mitigation Plan
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </div>
  );
};
