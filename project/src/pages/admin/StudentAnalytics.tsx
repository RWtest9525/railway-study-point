import { useEffect, useState } from 'react';
import { getAttempts, getUsers, Exam, getExams } from '../../lib/firestore';
import { Search, Filter, Download, Eye, TrendingUp, TrendingDown, Clock, Monitor, AlertTriangle, CheckCircle, XCircle, BarChart3, Users, Award } from 'lucide-react';
import { formatDate, formatDateTime, formatDuration, formatTimePerQuestion } from '../../lib/dateUtils';

interface AnalyticsUser {
  id: string;
  name: string;
  email: string;
  attempts: number;
  avgScore: number;
  lastAttempt: string;
  deviceInfo?: { type: string; browser: string; os: string };
  ipAddress?: string;
}

export function StudentAnalytics() {
  const [users, setUsers] = useState<AnalyticsUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userAttempts, setUserAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [exams, setExams] = useState<Exam[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, examsData] = await Promise.all([getUsers(), getExams()]);
      setExams(examsData);
      
      // Mock analytics data since we don't have real user data structure
      const mockUsers: AnalyticsUser[] = [
        { id: '1', name: 'Rahul Kumar', email: 'rahul@example.com', attempts: 15, avgScore: 78.5, lastAttempt: new Date().toISOString(), deviceInfo: { type: 'desktop', browser: 'Chrome', os: 'Windows' }, ipAddress: '192.168.1.100' },
        { id: '2', name: 'Priya Singh', email: 'priya@example.com', attempts: 12, avgScore: 85.2, lastAttempt: new Date(Date.now() - 86400000).toISOString(), deviceInfo: { type: 'mobile', browser: 'Chrome', os: 'Android' }, ipAddress: '192.168.1.101' },
        { id: '3', name: 'Amit Sharma', email: 'amit@example.com', attempts: 8, avgScore: 62.1, lastAttempt: new Date(Date.now() - 172800000).toISOString(), deviceInfo: { type: 'desktop', browser: 'Firefox', os: 'Linux' }, ipAddress: '192.168.1.102' },
      ];
      setUsers(mockUsers);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (userId: string) => {
    setSelectedUser(userId);
    // Load user attempts
    try {
      const attempts = await getAttempts(userId);
      setUserAttempts(attempts);
    } catch (error) {
      console.error('Error loading user attempts:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    if (searchQuery && !user.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !user.email.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Student Analytics</h1>
        <p className="text-gray-400">Detailed performance analysis and monitoring</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Users className="w-4 h-4" />
            Total Students
          </div>
          <div className="text-2xl font-bold text-white">{users.length}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Award className="w-4 h-4" />
            Average Score
          </div>
          <div className="text-2xl font-bold text-green-400">
            {users.length > 0 ? (users.reduce((sum, u) => sum + u.avgScore, 0) / users.length).toFixed(1) : '0'}%
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <BarChart3 className="w-4 h-4" />
            Total Attempts
          </div>
          <div className="text-2xl font-bold text-white">{users.reduce((sum, u) => sum + u.attempts, 0)}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <TrendingUp className="w-4 h-4" />
            Top Performer
          </div>
          <div className="text-lg font-bold text-purple-400">
            {users.length > 0 ? users.reduce((best, u) => u.avgScore > best.avgScore ? u : best).name : '-'}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700"
          />
        </div>
        <select
          value={selectedExam}
          onChange={(e) => setSelectedExam(e.target.value)}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700"
        >
          <option value="">All Exams</option>
          {exams.map(exam => <option key={exam.id} value={exam.id}>{exam.title}</option>)}
        </select>
      </div>

      {/* Students Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden mb-6">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Student</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Attempts</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Avg Score</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Device</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">IP Address</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Last Active</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-700/50">
                <td className="px-6 py-4">
                  <div>
                    <div className="text-white font-medium">{user.name}</div>
                    <div className="text-gray-400 text-sm">{user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-300">{user.attempts}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${user.avgScore >= 80 ? 'text-green-400' : user.avgScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {user.avgScore.toFixed(1)}%
                    </span>
                    {user.avgScore >= 80 ? (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : user.avgScore >= 60 ? (
                      <BarChart3 className="w-4 h-4 text-yellow-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Monitor className="w-4 h-4" />
                    <span className="capitalize">{user.deviceInfo?.type}</span>
                    <span className="text-gray-500">({user.deviceInfo?.browser})</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-400 text-sm font-mono">{user.ipAddress || '-'}</td>
                <td className="px-6 py-4 text-gray-400 text-sm">{formatDateTime(user.lastAttempt)}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleViewDetails(user.id)}
                    className="text-blue-400 hover:text-blue-300 p-2"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Details Panel */}
      {selectedUser && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            Performance Details - {users.find(u => u.id === selectedUser)?.name}
          </h2>
          
          {userAttempts.length === 0 ? (
            <div className="text-gray-400 text-center py-8">No attempts found</div>
          ) : (
            <div className="space-y-4">
              {userAttempts.map((attempt) => (
                <div key={attempt.id} className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-white font-semibold">Exam Attempt</div>
                      <div className="text-gray-400 text-sm">{formatDateTime(attempt.submitted_at)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-400">{attempt.score}</div>
                      <div className="text-gray-400 text-sm">
                        {attempt.correct_answers}/{attempt.total_questions} correct
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDuration(attempt.time_taken_seconds)}
                    </span>
                    <span>Device: {attempt.device_info?.type || 'Unknown'}</span>
                    {attempt.tab_switches && attempt.tab_switches > 0 && (
                      <span className="flex items-center gap-1 text-yellow-400">
                        <AlertTriangle className="w-4 h-4" />
                        {attempt.tab_switches} tab switches
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Growth Graph Placeholder */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-3">Performance Trend</h3>
            <div className="bg-gray-700/30 rounded-lg p-8 text-center text-gray-400">
              Growth graph visualization would appear here
            </div>
          </div>
        </div>
      )}
    </div>
  );
}