import { useState, useEffect } from 'react'
import googleDriveSync from '../utils/googleDriveSync'
import { getAllHabits, restoreHabitsFromBackup, setLastSyncDate } from '../utils/indexedDB'

function GoogleDriveSync() {
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [userEmail, setUserEmail] = useState(null)
  const [syncStatus, setSyncStatus] = useState(null) // 'success', 'error', null
  const [lastSyncDate, setLastSyncDate] = useState(null)
  const [error, setError] = useState(null)
  const [backupFiles, setBackupFiles] = useState([])
  const [restoreStatus, setRestoreStatus] = useState(null) // 'success', 'error', null
  const [showBackupList, setShowBackupList] = useState(false)
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false)
  const [autoBackupTime, setAutoBackupTime] = useState('23:59')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteStatus, setDeleteStatus] = useState(null) // 'success', 'error', null
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [pendingBackupData, setPendingBackupData] = useState(null)

  useEffect(() => {
    // Load last sync date from localStorage
    const saved = localStorage.getItem('lastGoogleDriveSync')
    if (saved) {
      setLastSyncDate(new Date(saved))
    }

    // Load auto-backup settings
    const autoBackupSetting = localStorage.getItem('autoBackupEnabled') === 'true'
    const autoBackupTimeSetting = localStorage.getItem('autoBackupTime') || '23:59'
    setAutoBackupEnabled(autoBackupSetting)
    setAutoBackupTime(autoBackupTimeSetting)

    // Load last known Google Drive state for immediate UI update
    const lastSignInState = localStorage.getItem('googleDriveSignedIn') === 'true'
    const lastUserEmail = localStorage.getItem('googleDriveUserEmail')
    
    if (lastSignInState) {
      console.log('📋 Restoring last known Google Drive state: signed in')
      setIsSignedIn(true)
      setUserEmail(lastUserEmail || 'Google Account')
    } else {
      console.log('📋 Restoring last known Google Drive state: not signed in')
      setIsSignedIn(false)
      setUserEmail(null)
    }

    // Listen for Service Worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)
    }

    // Still check actual status in background to verify/update the cached state
    const timer = setTimeout(() => {
      checkSignInStatus()
    }, 1000) // Wait 1 second for libraries to load

    return () => {
      clearTimeout(timer)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
      }
    }
  }, [])

  const checkSignInStatus = async () => {
    try {
      console.log('🔍 Checking actual Google Drive sign-in status...')
      await googleDriveSync.init()
      
      // The googleDriveSync now automatically restores tokens from localStorage
      const actualSignedIn = googleDriveSync.getSignInStatus()
      const cachedSignedIn = localStorage.getItem('googleDriveSignedIn') === 'true'
      
      // Check if cached state differs from actual state
      if (actualSignedIn !== cachedSignedIn) {
        console.log(`🔄 Cached state was incorrect (cached: ${cachedSignedIn}, actual: ${actualSignedIn}), updating...`)
      } else {
        console.log(`✅ Cached state was correct (${actualSignedIn})`)
      }
      
      // Update UI with actual state
      setIsSignedIn(actualSignedIn)
      
      if (actualSignedIn) {
        const userEmail = googleDriveSync.getUserEmail()
        setUserEmail(userEmail)
        console.log('✅ Confirmed signed in to Google Drive (with valid token)')
        
        // Save current state to localStorage
        localStorage.setItem('googleDriveSignedIn', 'true')
        localStorage.setItem('googleDriveUserEmail', userEmail || 'Google Account')
        
        // Auto-check for newer backups when signed in
        setTimeout(() => {
          handleAutoSync()
        }, 2000)
        
        // Send auth token to Service Worker for background backups
        sendMessageToServiceWorker('STORE_AUTH_TOKEN', {
          accessToken: googleDriveSync.accessToken,
          signedIn: true
        })
      } else {
        console.log('ℹ️ Not signed in or token expired')
        setUserEmail(null)
        
        // Clear cached state
        localStorage.setItem('googleDriveSignedIn', 'false')
        localStorage.removeItem('googleDriveUserEmail')
      }
      setError(null) // Clear any previous errors
    } catch (err) {
      console.error('Failed to check sign-in status:', err)
      setError(`Google Drive setup error: ${err.message}`)
      
      // If check fails, assume not signed in and clear cache
      setIsSignedIn(false)
      setUserEmail(null)
      localStorage.setItem('googleDriveSignedIn', 'false')
      localStorage.removeItem('googleDriveUserEmail')
    }
  }

  const handleSignIn = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      await googleDriveSync.signIn()
      const userEmail = googleDriveSync.getUserEmail()
      setIsSignedIn(true)
      setUserEmail(userEmail)
      setSyncStatus(null)
      
      // Save sign-in state to localStorage
      localStorage.setItem('googleDriveSignedIn', 'true')
      localStorage.setItem('googleDriveUserEmail', userEmail || 'Google Account')
      
      // Check for existing backup and compare with local data
      console.log('🔄 Checking for existing backup...')
      try {
        const latestBackup = await googleDriveSync.getLatestBackup()
        if (latestBackup) {
          console.log('📥 Found existing backup, comparing with local data...')
          
          // Get current local habits
          const localHabits = await getAllHabits()
          
          // Compare backup data with local data
          const hasSignificantDifferences = await compareHabitsData(localHabits, latestBackup.habits || [])
          
          if (hasSignificantDifferences) {
            console.log('🔍 Found significant differences, showing restore modal...')
            setPendingBackupData(latestBackup)
            setShowRestoreModal(true)
          } else {
            console.log('✅ Backup data matches local data, no restore needed')
          }
        } else {
          console.log('ℹ️ No existing backup found after sign-in')
        }
      } catch (checkErr) {
        console.error('❌ Failed to check for backup after sign-in:', checkErr)
        // Don't show error for backup check failure, just log it
      }
    } catch (err) {
      console.error('Sign in failed:', err)
      setError(err.message || 'Failed to sign in to Google Drive')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    setIsLoading(true)
    
    try {
      await googleDriveSync.signOut()
      setIsSignedIn(false)
      setUserEmail(null)
      setSyncStatus(null)
      setError(null)
      
      // Clear sign-in state from localStorage
      localStorage.setItem('googleDriveSignedIn', 'false')
      localStorage.removeItem('googleDriveUserEmail')
    } catch (err) {
      console.error('Sign out failed:', err)
      setError('Failed to sign out')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSync = async () => {
    if (!isSignedIn) {
      await handleSignIn()
      if (!googleDriveSync.getSignInStatus()) {
        return
      }
    }

    setIsLoading(true)
    setError(null)
    setSyncStatus(null)

    try {
      // Get all habits data
      const habits = await getAllHabits()
      
      if (habits.length === 0) {
        setError('No habits to sync. Create some habits first.')
        return
      }

      // Upload to Google Drive
      const result = await googleDriveSync.uploadHabits(habits)
      
      if (result.success) {
        setSyncStatus('success')
        const now = new Date()
        setLastSyncDate(now)
        localStorage.setItem('lastGoogleDriveSync', now.toISOString())
        // Track sync date in IndexedDB for auto-sync logic
        await setLastSyncDate()
        console.log(`✅ Successfully synced ${habits.length} habits to Google Drive`)
      }
    } catch (err) {
      console.error('Sync failed:', err)
      setSyncStatus('error')
      setError(err.message || 'Failed to sync with Google Drive')
    } finally {
      setIsLoading(false)
    }
  }

  const handleListBackups = async () => {
    if (!isSignedIn) {
      await handleSignIn()
      if (!googleDriveSync.getSignInStatus()) {
        return
      }
    }

    setIsLoading(true)
    setError(null)

    try {
      const files = await googleDriveSync.listBackupFiles()
      setBackupFiles(files)
      setShowBackupList(true)
      console.log(`📁 Found ${files.length} backup files`)
    } catch (err) {
      console.error('Failed to list backups:', err)
      setError(err.message || 'Failed to list backup files')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestore = async (fileId, strategy = 'merge') => {
    setIsLoading(true)
    setError(null)
    setRestoreStatus(null)

    try {
      const backupData = await googleDriveSync.downloadBackup(fileId)
      const result = await restoreHabitsFromBackup(backupData, strategy)
      
      setRestoreStatus('success')
      setShowBackupList(false)
      console.log(`✅ Successfully restored habits:`, result)
      
      // Track sync date in IndexedDB for auto-sync logic
      await setLastSyncDate()
      
      // Trigger a page refresh to show updated habits
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err) {
      console.error('Restore failed:', err)
      setRestoreStatus('error')
      setError(err.message || 'Failed to restore from backup')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAutoSync = async () => {
    if (!isSignedIn) return

    try {
      const latestBackup = await googleDriveSync.getLatestBackup()
      if (!latestBackup) {
        console.log('ℹ️ No backups found for auto-sync')
        return
      }

      const lastLocalSync = localStorage.getItem('lastGoogleDriveSync')
      const backupDate = new Date(latestBackup.exportDate)
      const localSyncDate = lastLocalSync ? new Date(lastLocalSync) : new Date(0)

      if (backupDate > localSyncDate) {
        console.log('🔄 Found newer backup, auto-restoring...')
        await handleRestore(latestBackup.fileId, 'merge')
      }
    } catch (err) {
      console.log('⚠️ Auto-sync failed:', err.message)
    }
  }

  // Service Worker communication
  const sendMessageToServiceWorker = (type, data) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type, data })
    }
  }

  const handleServiceWorkerMessage = (event) => {
    const { type, data } = event.data
    
    switch (type) {
      case 'BACKUP_COMPLETED':
        console.log('✅ Background backup completed:', data)
        setSyncStatus('success')
        setLastSyncDate(new Date(data.timestamp))
        localStorage.setItem('lastGoogleDriveSync', data.timestamp)
        break
      case 'BACKUP_FAILED':
        console.error('❌ Background backup failed:', data)
        setSyncStatus('error')
        setError(`Auto-backup failed: ${data.error}`)
        break
    }
  }

  // Auto-backup controls
  const handleAutoBackupToggle = (enabled) => {
    setAutoBackupEnabled(enabled)
    localStorage.setItem('autoBackupEnabled', enabled.toString())
    
    if (enabled && isSignedIn) {
      // Schedule daily backup
      sendMessageToServiceWorker('SCHEDULE_DAILY_BACKUP', {
        enabled: true,
        time: autoBackupTime
      })
      console.log(`⏰ Auto-backup enabled for ${autoBackupTime}`)
    } else {
      // Cancel daily backup
      sendMessageToServiceWorker('CANCEL_DAILY_BACKUP')
      console.log('❌ Auto-backup disabled')
    }
  }

  const handleAutoBackupTimeChange = (time) => {
    setAutoBackupTime(time)
    localStorage.setItem('autoBackupTime', time)
    
    if (autoBackupEnabled && isSignedIn) {
      // Reschedule with new time
      sendMessageToServiceWorker('SCHEDULE_DAILY_BACKUP', {
        enabled: true,
        time: time
      })
      console.log(`⏰ Auto-backup time updated to ${time}`)
    }
  }

  // Handle restore modal actions
  const handleRestoreFromModal = async (strategy = 'merge') => {
    if (!pendingBackupData) return

    setIsLoading(true)
    setError(null)
    setRestoreStatus(null)
    setShowRestoreModal(false)

    try {
      const result = await restoreHabitsFromBackup(pendingBackupData, strategy)
      
      setRestoreStatus('success')
      console.log(`✅ Successfully restored habits from modal:`, result)
      
      // Track sync date in IndexedDB for auto-sync logic
      await setLastSyncDate()
      
      // Refresh the page to show updated habits
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err) {
      console.error('Restore from modal failed:', err)
      setRestoreStatus('error')
      setError(err.message || 'Failed to restore from backup')
    } finally {
      setIsLoading(false)
      setPendingBackupData(null)
    }
  }

  const handleSkipRestore = () => {
    setShowRestoreModal(false)
    setPendingBackupData(null)
    console.log('ℹ️ User chose to skip restore after sign-in')
  }

  // Delete all backups functionality
  const handleDeleteAllBackups = async () => {
    if (!isSignedIn) {
      setError('Please sign in to Google Drive first')
      return
    }

    setIsLoading(true)
    setError(null)
    setDeleteStatus(null)

    try {
      const result = await googleDriveSync.deleteAllBackups()
      
      if (result.deletedCount === 0) {
        setDeleteStatus('success')
        setError('No backup files found to delete')
      } else if (result.errors.length > 0) {
        setDeleteStatus('error')
        setError(`Deleted ${result.deletedCount}/${result.totalFiles} files. Errors: ${result.errors.join(', ')}`)
      } else {
        setDeleteStatus('success')
        console.log(`✅ Successfully deleted ${result.deletedCount} backup files`)
      }
      
      setShowDeleteConfirm(false)
      
      // Clear backup list if it was showing
      setBackupFiles([])
      setShowBackupList(false)
    } catch (err) {
      console.error('Delete all backups failed:', err)
      setDeleteStatus('error')
      setError(err.message || 'Failed to delete backup files')
      setShowDeleteConfirm(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Compare local habits with backup habits to determine if restore is needed
  const compareHabitsData = async (localHabits, backupHabits) => {
    try {
      // If number of habits is different, there are significant differences
      if (localHabits.length !== backupHabits.length) {
        console.log(`📊 Different habit counts: local(${localHabits.length}) vs backup(${backupHabits.length})`)
        return true
      }
      
      // If no habits locally but backup has habits, significant difference
      if (localHabits.length === 0 && backupHabits.length > 0) {
        return true
      }
      
      // If no habits in backup but local has habits, no need to restore
      if (backupHabits.length === 0) {
        return false
      }
      
      // Create maps for easier comparison
      const localHabitsMap = new Map(localHabits.map(h => [h.id, h]))
      const backupHabitsMap = new Map(backupHabits.map(h => [h.id, h]))
      
      // Check for habits that exist in backup but not locally
      for (const backupHabit of backupHabits) {
        if (!localHabitsMap.has(backupHabit.id)) {
          console.log(`📊 Backup has habit not in local: ${backupHabit.name}`)
          return true
        }
      }
      
      // Check for habits that exist locally but not in backup
      for (const localHabit of localHabits) {
        if (!backupHabitsMap.has(localHabit.id)) {
          console.log(`📊 Local has habit not in backup: ${localHabit.name}`)
          return true
        }
      }
      
      // Check for differences in completion data for matching habits
      for (const localHabit of localHabits) {
        const backupHabit = backupHabitsMap.get(localHabit.id)
        if (backupHabit) {
          // Compare completion dates
          const localCompleted = new Set(localHabit.completedDates || [])
          const backupCompleted = new Set(backupHabit.completedDates || [])
          
          // Compare failed dates
          const localFailed = new Set(localHabit.failedDates || [])
          const backupFailed = new Set(backupHabit.failedDates || [])
          
          // Check if completion data differs significantly
          const completedDiff = localCompleted.size !== backupCompleted.size ||
            ![...localCompleted].every(date => backupCompleted.has(date)) ||
            ![...backupCompleted].every(date => localCompleted.has(date))
            
          const failedDiff = localFailed.size !== backupFailed.size ||
            ![...localFailed].every(date => backupFailed.has(date)) ||
            ![...backupFailed].every(date => localFailed.has(date))
          
          if (completedDiff || failedDiff) {
            console.log(`📊 Completion data differs for habit: ${localHabit.name}`)
            return true
          }
          
          // Check if habit properties differ (name, description, icon)
          if (localHabit.name !== backupHabit.name || 
              localHabit.description !== backupHabit.description ||
              localHabit.icon !== backupHabit.icon) {
            console.log(`📊 Habit properties differ for: ${localHabit.name}`)
            return true
          }
        }
      }
      
      console.log('✅ No significant differences found between local and backup data')
      return false
    } catch (err) {
      console.error('❌ Error comparing habits data:', err)
      // If comparison fails, show restore modal to be safe
      return true
    }
  }

  const formatDate = (date) => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusIcon = () => {
    if (syncStatus === 'success') {
      return (
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    }
    if (syncStatus === 'error') {
      return (
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Google Drive Connection Status */}
      <div className="space-y-4">
        {!isSignedIn ? (
          <div className="p-4 bg-neutral-50 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-blue-600 text-2xl">cloud_sync</span>
              <h4 className="font-medium text-neutral-900">Google Drive Sync</h4>
            </div>
            <p className="text-sm text-neutral-600 mb-4">
              Connect your Google Drive to backup your habit data to the cloud.
            </p>
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Connect Google Drive
            </button>
          </div>
        ) : (
          <div className="p-4 bg-green-50 rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <h4 className="font-medium text-green-900">Connected to Google Drive</h4>
                  <p className="text-sm text-green-700">{userEmail}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-1 text-sm text-green-700 hover:text-green-900 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {isLoading ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sync Controls - Only show when signed in */}
      {isSignedIn && (
        <div className="space-y-4">
          <button
            onClick={handleSync}
            disabled={isLoading}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            )}
            {isLoading ? 'Syncing...' : 'Backup to Google Drive'}
          </button>

          {/* Restore Controls */}
          <button
            onClick={handleListBackups}
            disabled={isLoading}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
            Restore from Google Drive
          </button>

          {/* Delete All Backups Button */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isLoading}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 text-red-600 border-red-200 hover:bg-red-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete All Backups
          </button>

          {/* Automatic Backup Controls */}
          <div className="p-4 bg-blue-50 rounded-2xl space-y-4">
            <h4 className="font-medium text-blue-900 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Automatic Daily Backup
            </h4>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoBackupEnabled}
                  onChange={(e) => handleAutoBackupToggle(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-blue-900">
                    Enable automatic daily backup
                  </span>
                  <p className="text-xs text-blue-700">
                    Automatically backup your habits to Google Drive every day
                  </p>
                </div>
              </label>
              
              {autoBackupEnabled && (
                <div className="ml-7">
                  <label className="block text-xs font-medium text-blue-800 mb-1">
                    Backup Time
                  </label>
                  <input
                    type="time"
                    value={autoBackupTime}
                    onChange={(e) => handleAutoBackupTimeChange(e.target.value)}
                    className="text-sm px-3 py-1 border border-blue-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-blue-600 mt-1">
                    Backup will run daily at {autoBackupTime}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      <div className="space-y-4">
        {syncStatus === 'success' && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
            {getStatusIcon()}
            <span>Successfully backed up to Google Drive!</span>
          </div>
        )}

        {restoreStatus === 'success' && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Successfully restored habits from Google Drive! Refreshing...</span>
          </div>
        )}

        {deleteStatus === 'success' && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>All backup files have been permanently deleted from Google Drive!</span>
          </div>
        )}

        {(syncStatus === 'error' || restoreStatus === 'error' || error) && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            {getStatusIcon()}
            <span>{error}</span>
          </div>
        )}

        {lastSyncDate && (
          <p className="text-xs text-neutral-500">
            Last backup: {formatDate(lastSyncDate)}
          </p>
        )}
      </div>

      {/* Backup Files List */}
      {showBackupList && backupFiles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-neutral-900">Available Backups</h4>
              <button 
                onClick={() => setShowBackupList(false)}
                className="text-sm text-neutral-500 hover:text-neutral-700"
              >
                Cancel
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {backupFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <div>
                    <div className="font-medium text-sm text-neutral-900">
                      {file.name.replace('better-habits-backup-', '').replace('.json', '')}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {new Date(file.createdTime).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRestore(file.id, 'merge')}
                      disabled={isLoading}
                      className="text-xs px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                    >
                      Merge
                    </button>
                    <button
                      onClick={() => handleRestore(file.id, 'replace')}
                      disabled={isLoading}
                      className="text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      Replace
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
              <strong>Merge:</strong> Combines your current habits with backup data<br/>
              <strong>Replace:</strong> Deletes all current habits and uses only backup data
            </div>
          </div>
        )}

      {showBackupList && backupFiles.length === 0 && (
          <div className="p-4 bg-neutral-50 rounded-lg text-center">
            <p className="text-sm text-neutral-600">No backup files found in your Google Drive.</p>
            <button 
              onClick={() => setShowBackupList(false)}
              className="text-sm text-primary-600 hover:text-primary-700 mt-2"
            >
              Close
            </button>
          </div>
        )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900">Delete All Backups</h3>
                  <p className="text-sm text-neutral-600">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <p className="text-sm text-neutral-700">
                  This will permanently delete <strong>all backup files</strong> from your Google Drive better-habits folder.
                </p>
                <div className="p-3 bg-red-50 rounded-lg">
                  <ul className="text-xs text-red-800 space-y-1">
                    <li>• All automatic and manual backup files will be deleted</li>
                    <li>• You will not be able to restore data from deleted backups</li>
                    <li>• Your local app data will remain unchanged</li>
                    <li>• This only affects files stored in Google Drive</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAllBackups}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? 'Deleting...' : 'Delete All'}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Restore Modal */}
      {showRestoreModal && pendingBackupData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">Restore from Google Drive</h3>
                <p className="text-sm text-neutral-600">We found existing habit data</p>
              </div>
            </div>
            
            <div className="space-y-3 mb-6">
              <p className="text-sm text-neutral-700">
                We found a backup with <strong>{pendingBackupData.habits?.length || 0} habits</strong> from {new Date(pendingBackupData.exportDate).toLocaleDateString()}.
              </p>
              <p className="text-sm text-neutral-700">
                Would you like to restore this data?
              </p>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Merge:</strong> Combines your current habits with backup data<br/>
                  <strong>Replace:</strong> Deletes all current habits and uses only backup data<br/>
                  <strong>Skip:</strong> Keep only your current local data
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => handleRestoreFromModal('merge')}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? 'Restoring...' : 'Merge'}
                </button>
                <button
                  onClick={() => handleRestoreFromModal('replace')}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? 'Restoring...' : 'Replace'}
                </button>
              </div>
              <button
                onClick={handleSkipRestore}
                disabled={isLoading}
                className="w-full px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 disabled:opacity-50 transition-colors"
              >
                Skip - Keep Local Data Only
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default GoogleDriveSync