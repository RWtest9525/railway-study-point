import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTheme } from '../contexts/ThemeContext';
import { getCategories, getExams } from '../lib/firestore';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function AdminDashboardCharts() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#9ca3af' : '#6b7280';
  const gridColor = isDark ? '#374151' : '#e5e7eb';

  const [revenueData, setRevenueData] = useState<{date: string, amount: number}[]>([]);
  const [categoryData, setCategoryData] = useState<{name: string, value: number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Revenue Data (Last 7 days)
        const transSnapshot = await getDocs(collection(db, 'transactions'));
        
        const last7Days = Array.from({length: 7}, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        });
        
        const revenueMap: Record<string, number> = {};
        last7Days.forEach(d => revenueMap[d] = 0);

        transSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if ((data.status === 'success' || data.status === 'completed') && data.amount > 0) {
              const dateObj = data.created_at ? new Date(data.created_at) : new Date();
              const dateStr = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
              if (revenueMap[dateStr] !== undefined) {
                 revenueMap[dateStr] += data.amount;
              }
          }
        });

        setRevenueData(last7Days.map(date => ({ date, amount: revenueMap[date] })));

        // 2. Fetch Category Data
        const allExams = await getExams();
        const categories = await getCategories();
        
        const catMap = new Map<string, number>();
        allExams.forEach(exam => {
             const catName = categories.find(c => c.id === exam.category_id)?.name || 'Other';
             catMap.set(catName, (catMap.get(catName) || 0) + 1);
        });

        const activePieData = Array.from(catMap.entries()).map(([name, value]) => ({ name, value }));
        
        if (activePieData.length === 0) {
           activePieData.push({ name: 'No Exams Yet', value: 1 });
        }
        setCategoryData(activePieData);

      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) {
     return (
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
         <div className="animate-pulse h-72 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full"></div>
         <div className="animate-pulse h-72 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full"></div>
       </div>
     );
  }

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
