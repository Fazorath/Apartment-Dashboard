import { useState, useEffect } from 'react'
import { X, User, Bell, Palette, Database, Shield } from 'lucide-react'

const SettingsModal = ({ onClose }) => {
  const [settings, setSettings] = useState({
    // User preferences
    username: '',
    email: '',
    
    // Notification settings
    emailNotifications: true,
    pushNotifications: false,
    reminderFrequency: 'daily', // daily, weekly, never
    
    // Display preferences
    theme: 'dark', // dark, light, auto
    showCompletedTasks: true,
    defaultView: 'all', // all, overdue, soon
    
    // Task settings
    defaultFrequency: 7, // days
    autoArchiveCompleted: false,
    
    // Data settings
    exportData: false,
    deleteAccount: false
  })

  const [activeTab, setActiveTab] = useState('profile')

  const handleSave = () => {
    // TODO: Implement settings save functionality
    console.log('Saving settings:', settings)
    onClose()
  }

  const handleReset = () => {
    // Reset to default settings
    setSettings({
      username: '',
      email: '',
      emailNotifications: true,
      pushNotifications: false,
      reminderFrequency: 'daily',
      theme: 'dark',
      showCompletedTasks: true,
      defaultView: 'all',
      defaultFrequency: 7,
      autoArchiveCompleted: false,
      exportData: false,
      deleteAccount: false
    })
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'display', label: 'Display', icon: Palette },
    { id: 'tasks', label: 'Tasks', icon: Database },
    { id: 'data', label: 'Data', icon: Shield }
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#0b0c10] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="h-5 w-5 text-zinc-400" />
          </button>
        </div>

        <div className="flex h-[600px]">
          {/* Sidebar */}
          <div className="w-64 border-r border-white/10 bg-white/[0.02] p-4">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/30'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Profile Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        value={settings.username}
                        onChange={(e) => setSettings(prev => ({ ...prev, username: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-white placeholder:text-zinc-500 focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20"
                        placeholder="Enter your username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={settings.email}
                        onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-white placeholder:text-zinc-500 focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Notification Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-zinc-300">Email Notifications</label>
                        <p className="text-xs text-zinc-500">Receive email updates about task deadlines</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.emailNotifications}
                          onChange={(e) => setSettings(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-zinc-300">Push Notifications</label>
                        <p className="text-xs text-zinc-500">Browser notifications for urgent tasks</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.pushNotifications}
                          onChange={(e) => setSettings(prev => ({ ...prev, pushNotifications: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Reminder Frequency
                      </label>
                      <select
                        value={settings.reminderFrequency}
                        onChange={(e) => setSettings(prev => ({ ...prev, reminderFrequency: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-white focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="never">Never</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'display' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Display Preferences</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Theme
                      </label>
                      <select
                        value={settings.theme}
                        onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-white focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20"
                      >
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-zinc-300">Show Completed Tasks</label>
                        <p className="text-xs text-zinc-500">Display recently completed tasks in the list</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.showCompletedTasks}
                          onChange={(e) => setSettings(prev => ({ ...prev, showCompletedTasks: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Default View
                      </label>
                      <select
                        value={settings.defaultView}
                        onChange={(e) => setSettings(prev => ({ ...prev, defaultView: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-white focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20"
                      >
                        <option value="all">All Tasks</option>
                        <option value="overdue">Overdue</option>
                        <option value="soon">Due Soon</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Task Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Default Frequency (days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={settings.defaultFrequency}
                        onChange={(e) => setSettings(prev => ({ ...prev, defaultFrequency: parseInt(e.target.value) || 7 }))}
                        className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-white placeholder:text-zinc-500 focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-zinc-300">Auto-archive Completed</label>
                        <p className="text-xs text-zinc-500">Automatically hide tasks completed more than 30 days ago</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.autoArchiveCompleted}
                          onChange={(e) => setSettings(prev => ({ ...prev, autoArchiveCompleted: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Data & Privacy</h3>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-white/[0.03] border border-white/10">
                      <h4 className="text-sm font-medium text-zinc-300 mb-2">Export Data</h4>
                      <p className="text-xs text-zinc-500 mb-3">Download all your tasks and settings as a JSON file</p>
                      <button className="px-4 py-2 rounded-lg bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 hover:bg-indigo-500/25 transition-colors">
                        Export Data
                      </button>
                    </div>
                    <div className="p-4 rounded-lg bg-white/[0.03] border border-white/10">
                      <h4 className="text-sm font-medium text-zinc-300 mb-2">Delete Account</h4>
                      <p className="text-xs text-zinc-500 mb-3">Permanently delete your account and all associated data</p>
                      <button className="px-4 py-2 rounded-lg bg-rose-500/20 text-rose-200 border border-rose-400/30 hover:bg-rose-500/25 transition-colors">
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-zinc-300 hover:bg-white/[0.08] transition-colors"
          >
            Reset to Defaults
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-zinc-300 hover:bg-white/[0.08] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 hover:bg-indigo-500/25 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal
