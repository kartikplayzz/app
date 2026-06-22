"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { useStatsStore } from "@/store/useStatsStore";
import { BarChart3 } from "lucide-react";

export function PerformanceChart() {
  const [mounted, setMounted] = useState(false);
  const { recentTests } = useStatsStore();

  useEffect(() => {
    const timerId = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timerId);
  }, []);

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center border border-dashed border-foreground/10 rounded-xl bg-foreground/[0.02]">
        <p className="text-muted-foreground flex flex-col items-center gap-2">
          <BarChart3 className="w-8 h-8 opacity-50" />
          Chart Data Rendering Engine Initializing...
        </p>
      </div>
    );
  }

  const testSessionsOnly = [...recentTests].filter(test => test.type !== "lesson");

  // If no data, show a beautiful empty state or placeholder
  if (testSessionsOnly.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center border border-dashed border-foreground/10 rounded-xl bg-foreground/[0.02]">
        <div className="flex flex-col items-center gap-2">
          <BarChart3 className="w-10 h-10 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-bold">No Data Yet</h3>
          <p className="text-muted-foreground text-sm">Complete a typing test to see your performance chart here.</p>
        </div>
      </div>
    );
  }

  // Reverse the array to show chronological order (left to right)
  // Take only the last 20 tests for the dashboard view to prevent overcrowding
  const chartData = testSessionsOnly.slice(0, 20).reverse().map((test, index) => {
    const d = new Date(test.timestamp);
    const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return {
      name: `Test ${testSessionsOnly.length - (Math.min(20, testSessionsOnly.length) - 1 - index)}`,
      wpm: test.wpm,
      accuracy: test.accuracy,
      fullTime: `${dateStr} at ${timeStr}`
    };
  });



  return (
    <div className="w-full h-full min-h-[300px] mt-4 flex-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorWpm" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600 }}
            dy={10}
            minTickGap={20}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
            domain={['dataMin - 10', 'dataMax + 10']}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="wpm" 
            stroke="#f97316" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorWpm)" 
            activeDot={{ r: 6, fill: "#f97316", stroke: "#0f111a", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: {
      name: string;
      wpm: number;
      accuracy: number;
      fullTime: string;
    };
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0f111a] border border-white/10 p-4 rounded-xl shadow-2xl flex flex-col gap-3">
        <div className="flex flex-col border-b border-white/5 pb-2">
          <span className="text-foreground font-bold text-sm">{payload[0].payload.name}</span>
          <span className="text-muted-foreground text-[10px] uppercase tracking-wider">{payload[0].payload.fullTime}</span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center gap-6">
            <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Speed</span>
            <span className="text-orange-500 font-black text-lg">{payload[0].value} <span className="text-xs font-normal">WPM</span></span>
          </div>
          <div className="flex justify-between items-center gap-6">
            <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Accuracy</span>
            <span className="text-green-500 font-black text-lg">{payload[0].payload.accuracy}<span className="text-xs font-normal">%</span></span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
