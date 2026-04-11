import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';

const revenueData = [
  { date: '1 Apr', amount: 1250 },
  { date: '2 Apr', amount: 1890 },
  { date: '3 Apr', amount: 1340 },
  { date: '4 Apr', amount: 2780 },
  { date: '5 Apr', amount: 2120 },
  { date: '6 Apr', amount: 3450 },
  { date: '7 Apr', amount: 2870 },
];

const categoryData = [
  { name: 'Mathematics', value: 35 },
  { name: 'Reasoning', value: 28 },
  { name: 'General Science', value: 22 },
  { name: 'GK', value: 15 },
];

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

export function AdminDashboardCharts() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#9ca3af' : '#6b7280';
  const gridColor = isDark ? '#374151' : '#e5e7eb';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 shadow-lg`}>
        <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          📈 Daily Revenue Trend
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis 
              dataKey="date" 
              tick={{ fill: textColor, fontSize: 12 }} 
              axisLine={{ stroke: gridColor }}
            />
            <YAxis 
              tick={{ fill: textColor, fontSize: 12 }} 
              axisLine={{ stroke: gridColor }}
              tickFormatter={(value) => `₹${value}`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                border: `1px solid ${gridColor}`,
                borderRadius: '8px',
                color: isDark ? '#ffffff' : '#111827'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="amount" 
              stroke="#10b981" 
              strokeWidth={3}
              dot={{ fill: '#10b981', r: 4 }}
              activeDot={{ r: 6, fill: '#059669' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 shadow-lg`}>
        <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          📊 Active Exams by Category
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={categoryData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              innerRadius={40}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : '0'}%`}
            >
              {categoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                border: `1px solid ${gridColor}`,
                borderRadius: '8px',
                color: isDark ? '#ffffff' : '#111827'
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
