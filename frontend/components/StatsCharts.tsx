'use client';

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';

interface StatsChartsProps {
  bySource: Record<string, number>;
  applied: number;
  pending: number;
  failed: number;
  total: number;
  weeklyActivity?: { day: string; applications: number }[];
}

const COLORS = ['#00FFA3', '#00D9FF', '#FF4655', '#FFE500', '#FF7F00', '#8B5CF6', '#EC4899'];

export default function StatsCharts({ bySource, applied, pending, failed, total, weeklyActivity }: StatsChartsProps) {
  // Prepare pie chart data
  const statusData = [
    { name: 'Applied', value: applied, color: '#00FFA3' },
    { name: 'Pending', value: pending, color: '#FFE500' },
    { name: 'Failed', value: failed, color: '#FF4655' },
  ].filter(d => d.value > 0);

  // Prepare bar chart data from sources
  const sourceData = Object.entries(bySource)
    .map(([name, value]) => ({ name: name.toUpperCase(), value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6); // Top 6 sources

  // Use provided weekly data or fallback to empty array (should be handled by loading state in parent)
  const weeklyData = weeklyActivity || [
    { day: 'Mon', applications: 0 },
    { day: 'Tue', applications: 0 },
    { day: 'Wed', applications: 0 },
    { day: 'Thu', applications: 0 },
    { day: 'Fri', applications: 0 },
    { day: 'Sat', applications: 0 },
    { day: 'Sun', applications: 0 },
  ];

  return (
    <div className="grid grid-cols-2 gap-6 mb-6">
      {/* Status Distribution */}
      <div className="tech-border bg-[var(--valo-gray)] rounded-lg p-5">
        <h4 className="font-display text-lg font-bold text-[var(--valo-text)] mb-4">
          MISSION STATUS
        </h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#ECE8E1',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="flex justify-center gap-4 mt-2">
          {statusData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-xs text-[var(--valo-text-dim)]">
                {entry.name}: {entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sources Bar Chart */}
      <div className="tech-border bg-[var(--valo-gray)] rounded-lg p-5">
        <h4 className="font-display text-lg font-bold text-[var(--valo-text)] mb-4">
          INTEL SOURCES
        </h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sourceData} layout="vertical" margin={{ left: 60 }}>
              <XAxis type="number" stroke="#8A8F98" fontSize={10} />
              <YAxis type="category" dataKey="name" stroke="#8A8F98" fontSize={10} width={60} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#ECE8E1',
                }}
              />
              <Bar dataKey="value" fill="#00D9FF" radius={[0, 4, 4, 0]}>
                {sourceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly Activity */}
      <div className="tech-border bg-[var(--valo-gray)] rounded-lg p-5 col-span-2">
        <h4 className="font-display text-lg font-bold text-[var(--valo-text)] mb-4">
          WEEKLY ACTIVITY
        </h4>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FFA3" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00FFA3" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="#8A8F98" fontSize={10} />
              <YAxis stroke="#8A8F98" fontSize={10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#ECE8E1',
                }}
              />
              <Area
                type="monotone"
                dataKey="applications"
                stroke="#00FFA3"
                strokeWidth={2}
                fill="url(#colorApps)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
