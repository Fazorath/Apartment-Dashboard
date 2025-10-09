import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { 
  Database, 
  Users, 
  Building, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Copy, 
  Check,
  AlertCircle,
  TrendingUp,
  Calendar,
  Shield
} from 'lucide-react'

// Use the same axios configuration as the rest of the app
// This ensures we use Vite's proxy in development
const adminAxios = axios.create()

// Add auth token interceptor
adminAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

const AdminDashboard = () => {
  const { user, logout } = useAuth()
  const [apartments, setApartments] = useState([])
  const [databaseStatus, setDatabaseStatus] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedApartment, setSelectedApartment] = useState(null)
  const [showPasswords, setShowPasswords] = useState({})
  const [copiedItems, setCopiedItems] = useState({})

  useEffect(() => {
    if (user?.isAdmin) {
      fetchAdminData()
    }
  }, [user?.isAdmin])

  const fetchAdminData = async () => {
    try {
      setLoading(true)
      setError('')
      
      const [apartmentsRes, dbRes, statsRes] = await Promise.all([
        adminAxios.get('/api/admin/apartments'),
        adminAxios.get('/api/admin/database-status'),
        adminAxios.get('/api/admin/stats')
      ])

      setApartments(apartmentsRes.data.apartments)
      setDatabaseStatus(dbRes.data)
      setStats(statsRes.data.stats)
    } catch (err) {
      console.error('Admin data fetch error:', err)
      setError(`Failed to load admin data: ${err.response?.data?.error || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchApartmentDetails = async (apartmentCode) => {
    try {
      const response = await adminAxios.get(`/api/admin/apartment/${apartmentCode}`)
      setSelectedApartment(response.data.apartment)
    } catch (err) {
      console.error('Apartment details fetch error:', err)
    }
  }

  const togglePasswordVisibility = (userId) => {
    setShowPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }))
  }

  const copyToClipboard = async (text, itemId) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedItems(prev => ({ ...prev, [itemId]: true }))
      setTimeout(() => {
        setCopiedItems(prev => ({ ...prev, [itemId]: false }))
      }, 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleString()
  }

  const getConnectionStatus = (status) => {
    switch (status) {
      case 1: return { text: 'Connected', color: 'text-green-500' }
      case 2: return { text: 'Connecting', color: 'text-yellow-500' }
      case 3: return { text: 'Disconnecting', color: 'text-orange-500' }
      default: return { text: 'Disconnected', color: 'text-red-500' }
    }
  }

  // Show loading if user is not loaded yet or if we're fetching admin data
  if (!user || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-300">
            {!user ? 'Loading user...' : 'Loading admin dashboard...'}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={fetchAdminData}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-emerald-500" />
              <div>
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-gray-400">System Administration Panel</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400">Logged in as: {user?.username}</span>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'apartments', label: 'Apartments', icon: Building },
              { id: 'databases', label: 'Databases', icon: Database },
              { id: 'users', label: 'Users', icon: Users }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center">
                  <Building className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-400">Total Apartments</p>
                    <p className="text-2xl font-bold">{stats?.totalApartments || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-400">Total Users</p>
                    <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center">
                  <Shield className="h-8 w-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-400">Admin Users</p>
                    <p className="text-2xl font-bold">{stats?.totalAdmins || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center">
                  <Database className="h-8 w-8 text-orange-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-400">Active DBs</p>
                    <p className="text-2xl font-bold">{databaseStatus?.totalConnections || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Recent Users
                </h3>
                <div className="space-y-3">
                  {stats?.recentUsers?.map((user, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700">
                      <div>
                        <p className="font-medium">{user.username}</p>
                        <p className="text-sm text-gray-400">{user.apartmentCode}</p>
                      </div>
                      <p className="text-sm text-gray-500">{formatDate(user.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Recent Logins
                </h3>
                <div className="space-y-3">
                  {stats?.recentLogins?.map((user, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700">
                      <div>
                        <p className="font-medium">{user.username}</p>
                        <p className="text-sm text-gray-400">{user.apartmentCode}</p>
                      </div>
                      <p className="text-sm text-gray-500">{formatDate(user.lastLogin)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Apartments Tab */}
        {activeTab === 'apartments' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Apartment Management</h2>
              <button
                onClick={fetchAdminData}
                className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Apartment List */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">All Apartments</h3>
                <div className="space-y-3">
                  {apartments.map((apartment) => (
                    <div
                      key={apartment.code}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedApartment?.code === apartment.code
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                      onClick={() => fetchApartmentDetails(apartment.code)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{apartment.name}</h4>
                          <p className="text-sm text-gray-400">Code: {apartment.code}</p>
                          <p className="text-sm text-gray-500">{apartment.totalUsers} users</p>
                        </div>
                        <span className="text-xs text-gray-500">{formatDate(apartment.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Apartment Details */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Apartment Details</h3>
                {selectedApartment ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg">{selectedApartment.name}</h4>
                      <p className="text-gray-400">Code: {selectedApartment.code}</p>
                      <p className="text-sm text-gray-500">
                        {selectedApartment.users?.length || 0} users • {selectedApartment.tasks?.length || 0} tasks
                      </p>
                    </div>

                    <div>
                      <h5 className="font-medium mb-2">Users</h5>
                      <div className="space-y-2">
                        {selectedApartment.users?.map((user) => (
                          <div key={user.id} className="bg-gray-700 rounded p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{user.username}</p>
                                <p className="text-sm text-gray-400">{user.email}</p>
                                {user.isAdmin && (
                                  <span className="inline-block px-2 py-1 text-xs bg-purple-600 text-white rounded mt-1">
                                    Admin
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => togglePasswordVisibility(user.id)}
                                  className="text-gray-400 hover:text-white"
                                >
                                  {showPasswords[user.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                                <button
                                  onClick={() => copyToClipboard(user.password, `password-${user.id}`)}
                                  className="text-gray-400 hover:text-white"
                                >
                                  {copiedItems[`password-${user.id}`] ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                            {showPasswords[user.id] && (
                              <div className="mt-2 p-2 bg-gray-600 rounded text-sm font-mono">
                                {user.password}
                              </div>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              Created: {formatDate(user.createdAt)}
                              {user.lastLogin && ` • Last login: ${formatDate(user.lastLogin)}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedApartment.tasks?.length > 0 && (
                      <div>
                        <h5 className="font-medium mb-2">Tasks</h5>
                        <div className="space-y-1">
                          {selectedApartment.tasks?.map((task) => (
                            <div key={task.id} className="bg-gray-700 rounded p-2 text-sm">
                              <p className="font-medium">{task.name}</p>
                              <p className="text-gray-400">
                                Assigned to: {task.assignedTo} • Every {task.frequencyDays} days
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400">Select an apartment to view details</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Databases Tab */}
        {activeTab === 'databases' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Database Status</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Main Database</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>apartment-dashboard</span>
                    <span className={`font-medium ${getConnectionStatus(databaseStatus?.mainDatabase?.status).color}`}>
                      {getConnectionStatus(databaseStatus?.mainDatabase?.status).text}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Apartment Databases</h3>
                <div className="space-y-3">
                  {databaseStatus?.apartmentDatabases?.map((db) => (
                    <div key={db.apartmentCode} className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">{db.apartmentCode}</span>
                        <p className="text-sm text-gray-400">{db.databaseName}</p>
                      </div>
                      <span className={`font-medium ${getConnectionStatus(db.status).color}`}>
                        {getConnectionStatus(db.status).text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">All Users</h2>
            
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Apartment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Password
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Role
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {apartments.flatMap(apt => apt.users || []).map((user) => (
                      <tr key={user.id} className="hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium">{user.username}</div>
                            <div className="text-sm text-gray-400">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {user.apartmentCode}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => togglePasswordVisibility(user.id)}
                              className="text-gray-400 hover:text-white"
                            >
                              {showPasswords[user.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                            {showPasswords[user.id] && (
                              <span className="text-sm font-mono bg-gray-600 px-2 py-1 rounded">
                                {user.password}
                              </span>
                            )}
                            <button
                              onClick={() => copyToClipboard(user.password, `password-${user.id}`)}
                              className="text-gray-400 hover:text-white"
                            >
                              {copiedItems[`password-${user.id}`] ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.isAdmin ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-600 text-white">
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-600 text-white">
                              User
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default AdminDashboard
