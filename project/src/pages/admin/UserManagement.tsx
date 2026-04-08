import { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Search, Shield, UserCheck, UserX, Star, Calendar, Gift } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  is_premium: boolean;
  premium_until?: string;
  role: 'admin' | 'student' | 'banned';
  created_at: string;
}

export function UserManagement() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const usersRef = collection(db, 'profiles');
      const snapshot = await getDocs(usersRef);
      const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, role: 'admin' | 'student' | 'banned') => {
    try {
      const userRef = doc(db, 'profiles', userId);
      await updateDoc(userRef, { role });
      loadUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const grantPremium = async (userId: string, days: number) => {
    try {
      const userRef = doc(db, 'profiles', userId);
      const premiumUntil = new Date();
      premiumUntil.setDate(premiumUntil.getDate() + days);
      
      await updateDoc(userRef, {
        is_premium: true,
        premium_until: premiumUntil.toISOString(),
        updated_at: new Date().toISOString()
      });
      loadUsers();
      alert(`Successfully granted ${days} days premium to user!`);
    } catch (error) {
      console.error('Error granting premium:', error);
      alert('Error granting premium');
    }
  };

  const revokePremium = async (userId: string) => {
    try {
      const userRef = doc(db, 'profiles', userId);
      await updateDoc(userRef, {
        is_premium: false,
        premium_until: null,
        updated_at: new Date().toISOString()
      });
      loadUsers();
      alert('Successfully revoked premium from user!');
    } catch (error) {
      console.error('Error revoking premium:', error);
      alert('Error revoking premium');
    }
  };

  const getPremiumStatus = (user: User) => {
    if (!user.is_premium) return { status: 'Free', color: 'text-gray-400' };
    
    if (user.premium_until) {
      const expiryDate = new Date(user.premium_until);
      const now = new Date();
      const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysLeft <= 0) {
        return { status: 'Expired', color: 'text-red-400' };
      } else {
        return { status: `Active (${daysLeft} days left)`, color: 'text-green-400' };
      }
    }
    
    return { status: 'Active (Lifetime)', color: 'text-green-400' };
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(search.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loading...</div>;
  }

  return (
    <div className={`${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen p-6`}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>User Management</h1>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Manage users and permissions</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          <input
            type="text"
            placeholder="Search users by email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 rounded-lg border ${isDark ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'}`}
          />
        </div>
      </div>

      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border overflow-hidden`}>
        <table className="w-full">
          <thead className={`${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <tr>
              <th className={`px-6 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>User</th>
              <th className={`px-6 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Email</th>
              <th className={`px-6 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Role</th>
              <th className={`px-6 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Premium</th>
              <th className={`px-6 py-3 text-right text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {filteredUsers.map((user) => (
              <tr key={user.id} className={`hover:${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <td className="px-6 py-4">
                  <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{user.full_name || 'N/A'}</div>
                </td>
                <td className={`px-6 py-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{user.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    user.role === 'admin' 
                      ? 'bg-purple-600/20 text-purple-400' 
                      : user.role === 'banned'
                      ? 'bg-red-600/20 text-red-400'
                      : 'bg-blue-600/20 text-blue-400'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className={`text-sm ${getPremiumStatus(user).color}`}>
                      {getPremiumStatus(user).status}
                    </span>
                    {user.premium_until && user.is_premium && (
                      <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Expires: {new Date(user.premium_until).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    {/* Premium Management */}
                    {user.role !== 'banned' && user.role !== 'admin' && (
                      <>
                        {!user.is_premium ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => grantPremium(user.id, 7)}
                              className="text-yellow-400 hover:text-yellow-300 p-2"
                              title="Grant 7 Days Premium"
                            >
                              <Gift className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => grantPremium(user.id, 30)}
                              className="text-yellow-400 hover:text-yellow-300 p-2"
                              title="Grant 1 Month Premium"
                            >
                              <Calendar className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => grantPremium(user.id, 365)}
                              className="text-yellow-400 hover:text-yellow-300 p-2"
                              title="Grant 1 Year Premium"
                            >
                              <Star className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => revokePremium(user.id)}
                            className="text-red-400 hover:text-red-300 p-2"
                            title="Revoke Premium"
                          >
                            <UserX className="w-5 h-5" />
                          </button>
                        )}
                      </>
                    )}
                    
                    {/* Role Management */}
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => updateUserRole(user.id, 'admin')}
                        className="text-purple-400 hover:text-purple-300 p-2"
                        title="Make Admin"
                      >
                        <Shield className="w-5 h-5" />
                      </button>
                    )}
                    {user.role !== 'banned' && user.role !== 'admin' && (
                      <button
                        onClick={() => updateUserRole(user.id, 'banned')}
                        className="text-red-400 hover:text-red-300 p-2"
                        title="Ban User"
                      >
                        <UserX className="w-5 h-5" />
                      </button>
                    )}
                    {user.role === 'banned' && (
                      <button
                        onClick={() => updateUserRole(user.id, 'student')}
                        className="text-green-400 hover:text-green-300 p-2"
                        title="Unban User"
                      >
                        <UserCheck className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}