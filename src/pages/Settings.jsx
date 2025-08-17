import { useState, useEffect } from 'react'
import { notificationService } from '../utils/notificationService'
import GoogleDriveSync from '../components/GoogleDriveSync'
import { useTheme } from '../contexts/ThemeContext'
import { getVersionInfo } from '../utils/version'

function Settings() {
  const { currentTheme, availableThemes, changeTheme } = useTheme()
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminderTime, setReminderTime] = useState('09:00')
  const [notificationPermission, setNotificationPermission] = useState('default')

  useEffect(() => {
    // Load saved preferences
    const savedReminderEnabled = localStorage.getItem('reminderEnabled') === 'true'
    const savedReminderTime = localStorage.getItem('reminderTime') || '09:00'
    
    setReminderEnabled(savedReminderEnabled)
    setReminderTime(savedReminderTime)
    
    // Check current notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
    }

    // PWA install prompt handler
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('✅ PWA installed successfully')
    } else {
      console.log('❌ PWA installation declined')
    }

    setDeferredPrompt(null)
    setIsInstallable(false)
  }

  const handleReminderToggle = async (enabled) => {
    if (enabled && notificationPermission !== 'granted') {
      // Request notification permission
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      
      if (permission !== 'granted') {
        alert('Notifications are required for daily reminders. Please enable them in your browser settings.')
        return
      }
    }
    
    setReminderEnabled(enabled)
    localStorage.setItem('reminderEnabled', enabled.toString())
    
    if (enabled) {
      console.log('✅ Daily reminders enabled at', reminderTime)
      await notificationService.scheduleReminder(reminderTime)
    } else {
      console.log('❌ Daily reminders disabled')
      notificationService.cancelReminder()
    }
  }

  const handleTimeChange = async (time) => {
    setReminderTime(time)
    localStorage.setItem('reminderTime', time)
    
    if (reminderEnabled) {
      console.log('⏰ Reminder time updated to', time)
      await notificationService.scheduleReminder(time)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      
      <div className="space-y-6">
        {/* Theme Selection */}
        <div className="card p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-primary-100 rounded-3xl flex items-center justify-center">
              <span className="material-symbols-outlined text-primary-600 text-2xl">palette</span>
            </div>
            <div>
              <h2 className="text-2xl font-medium text-neutral-900">Appearance</h2>
              <p className="text-neutral-600">Choose a theme that fits your style</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableThemes.map((theme) => (
              <div
                key={theme.id}
                onClick={() => changeTheme(theme.id)}
                className={`
                  relative cursor-pointer p-6 rounded-2xl border-2 transition-all
                  ${currentTheme.id === theme.id 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-neutral-200 bg-white hover:border-primary-300 hover:bg-primary-25'
                  }
                `}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-2xl">{theme.icon}</div>
                  <div>
                    <h3 className="font-medium text-neutral-900">{theme.name}</h3>
                    <p className="text-sm text-neutral-600">{theme.description}</p>
                  </div>
                  {currentTheme.id === theme.id && (
                    <div className="ml-auto">
                      <span className="material-symbols-outlined text-primary-600">check_circle</span>
                    </div>
                  )}
                </div>
                
                {/* Theme color preview */}
                <div className="flex gap-2">
                  <div 
                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: theme.colors['primary-500'] }}
                  ></div>
                  <div 
                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: theme.colors['secondary-500'] || theme.colors['primary-300'] }}
                  ></div>
                  <div 
                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: theme.colors['tertiary-500'] || theme.colors['primary-700'] }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-primary-100 rounded-3xl flex items-center justify-center">
              <span className="material-symbols-outlined text-primary-600 text-2xl">notifications</span>
            </div>
            <div>
              <h2 className="text-2xl font-medium text-neutral-900">Reminders</h2>
              <p className="text-neutral-600">Set up daily habit notifications</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Daily Reminder Time
              </label>
              <input 
                type="time" 
                className="input-field max-w-xs"
                value={reminderTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                disabled={!reminderEnabled}
              />
              <p className="text-xs text-neutral-500 mt-1">
                {reminderEnabled ? 'Reminder will trigger if no habits are completed by this time' : 'Enable reminders to set a time'}
              </p>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-4 bg-neutral-50 rounded-2xl cursor-pointer hover:bg-primary-50 transition-colors">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500" 
                  checked={reminderEnabled}
                  onChange={(e) => handleReminderToggle(e.target.checked)}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-900">Enable daily reminders</span>
                    {notificationPermission === 'denied' && (
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-full">
                        Blocked
                      </span>
                    )}
                    {notificationPermission === 'granted' && reminderEnabled && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-600 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-600">
                    Get notified if no habits are completed by the set time
                  </p>
                  {notificationPermission === 'denied' && (
                    <p className="text-xs text-red-600 mt-1">
                      Notifications blocked. Enable in browser settings to use reminders.
                    </p>
                  )}
                </div>
              </label>
              
            </div>
          </div>
        </div>

        <div className="card p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-3xl flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600 text-2xl">cloud</span>
            </div>
            <div>
              <h2 className="text-2xl font-medium text-neutral-900">Cloud Sync</h2>
              <p className="text-neutral-600">Cloud backup and sync for your habit data</p>
            </div>
          </div>
          
          <GoogleDriveSync />
        </div>

        {/* PWA Install Section */}
        <div className="card p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-primary-100 rounded-3xl flex items-center justify-center">
              <span className="material-symbols-outlined text-primary-600 text-2xl">
                smartphone
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-medium text-neutral-900">Install App</h2>
              <p className="text-neutral-600">Get Better Habits as a native app</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {isInstallable ? (
              <button
                onClick={handleInstall}
                className="btn-primary flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">
                  download
                </span>
                Install Better Habits
              </button>
            ) : (
              <div className="p-4 bg-neutral-100 rounded-2xl">
                <p className="text-neutral-600 text-sm">
                  📱 To install this app:
                </p>
                <ul className="text-neutral-600 text-sm mt-2 space-y-1">
                  <li>• Visit this page twice (5+ minutes apart)</li>
                  <li>• Look for install icon in browser address bar</li>
                  <li>• Or use browser menu → "Install Better Habits"</li>
                  <li>• On mobile: Share → "Add to Home Screen"</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* App Version Section */}
        <div className="card p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-3xl flex items-center justify-center">
              <span className="material-symbols-outlined text-purple-600 text-2xl">
                info
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-medium text-neutral-900">About</h2>
              <p className="text-neutral-600">App version and information</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-neutral-50 rounded-2xl">
              <div className="flex justify-between items-center">
                <span className="text-neutral-600 font-medium">Version</span>
                <span className="text-neutral-900 font-mono text-lg">{getVersionInfo().fullVersion}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings