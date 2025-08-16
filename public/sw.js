// Service Worker for Better Habits
// Handles background notifications and PWA functionality

const CACHE_NAME = 'better-habits-v1'
const urlsToCache = [
  '/',
  '/manifest.json',
  '/habit-icon.svg'
]

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker installing...')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('💾 Caching essential files')
        return cache.addAll(urlsToCache)
      })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          return response
        }
        
        // Otherwise fetch from network
        return fetch(event.request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }

          // Clone the response for caching
          const responseToCache = response.clone()
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache)
            })

          return response
        })
      })
      .catch(() => {
        // Return offline page if available
        if (event.request.destination === 'document') {
          return caches.match('/')
        }
      })
  )
})

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.notification.tag)
  
  event.notification.close()
  
  // Focus or open the app when notification is clicked
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url === self.registration.scope && 'focus' in client) {
            return client.focus()
          }
        }
        
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow('/')
        }
      })
  )
})

// Handle background sync for when the app regains connectivity
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag)
  
  if (event.tag === 'daily-reminder-check') {
    event.waitUntil(checkDailyReminder())
  } else if (event.tag === 'daily-backup') {
    event.waitUntil(performDailyBackup())
  }
})

// Message handling from main app
self.addEventListener('message', (event) => {
  const { type, data } = event.data

  switch (type) {
    case 'SCHEDULE_DAILY_BACKUP':
      scheduleDailyBackup(data)
      break
    case 'CANCEL_DAILY_BACKUP':
      cancelDailyBackup()
      break
    case 'PERFORM_BACKUP_NOW':
      event.waitUntil(performDailyBackup())
      break
    case 'STORE_AUTH_TOKEN':
      storeAuthToken(data)
      break
  }
})

// Function to check if daily reminder should be sent
async function checkDailyReminder() {
  try {
    // Get reminder settings from IndexedDB or message the main thread
    const reminderEnabled = await getStorageValue('reminderEnabled')
    
    if (!reminderEnabled) return
    
    // Check if any habits are completed today
    const hasCompleted = await checkHabitsCompleted()
    
    if (!hasCompleted) {
      // Send notification
      self.registration.showNotification('Daily Habit Reminder', {
        body: "Don't forget to track your habits today!",
        icon: '/habit-icon.svg',
        badge: '/habit-icon.svg',
        tag: 'daily-reminder',
        requireInteraction: false,
        actions: [
          {
            action: 'open',
            title: 'Open App'
          }
        ]
      })
    }
  } catch (error) {
    console.error('❌ Error in daily reminder check:', error)
  }
}

// Helper function to get values from localStorage via messaging
function getStorageValue(key) {
  return new Promise((resolve) => {
    // For now, we'll use a simple approach
    // In a full implementation, you'd message the main thread
    resolve(key === 'reminderEnabled' ? true : null)
  })
}

// Helper function to check if habits are completed
function checkHabitsCompleted() {
  return new Promise((resolve) => {
    // For now, return false to trigger notifications
    // In a full implementation, you'd check IndexedDB or message the main thread
    resolve(false)
  })
}

// Daily backup functionality
let dailyBackupTimer = null

async function scheduleDailyBackup(settings = {}) {
  const { enabled = true, time = '23:59' } = settings
  
  if (!enabled) {
    cancelDailyBackup()
    return
  }

  console.log('⏰ Scheduling daily backup at', time)
  
  // Clear existing timer
  if (dailyBackupTimer) {
    clearTimeout(dailyBackupTimer)
  }

  // Calculate time until next backup
  const now = new Date()
  const [hours, minutes] = time.split(':').map(Number)
  
  const targetTime = new Date()
  targetTime.setHours(hours, minutes, 0, 0)
  
  // If target time has passed today, schedule for tomorrow
  if (targetTime <= now) {
    targetTime.setDate(targetTime.getDate() + 1)
  }
  
  const timeUntilBackup = targetTime.getTime() - now.getTime()
  
  console.log(`📅 Next backup scheduled for: ${targetTime.toLocaleString()}`)
  console.log(`⏳ Time until backup: ${Math.round(timeUntilBackup / 1000 / 60)} minutes`)
  
  // Schedule the backup
  dailyBackupTimer = setTimeout(async () => {
    await performDailyBackup()
    // Reschedule for next day
    scheduleDailyBackup(settings)
  }, timeUntilBackup)
  
  // Store settings for persistence
  await storeBackupSettings(settings)
}

function cancelDailyBackup() {
  if (dailyBackupTimer) {
    clearTimeout(dailyBackupTimer)
    dailyBackupTimer = null
    console.log('❌ Daily backup cancelled')
  }
}

// Perform the actual backup
async function performDailyBackup() {
  try {
    console.log('🔄 Starting automatic daily backup...')
    
    // Check if auto-backup is enabled
    const settings = await getBackupSettings()
    if (!settings || !settings.enabled) {
      console.log('ℹ️ Auto-backup is disabled, skipping')
      return
    }

    // Get habits from IndexedDB
    const habits = await getHabitsFromDB()
    if (!habits || habits.length === 0) {
      console.log('ℹ️ No habits to backup')
      return
    }

    // Check if user is signed in to Google Drive
    const authToken = await getStoredAuthToken()
    if (!authToken?.accessToken) {
      console.log('⚠️ Not signed in to Google Drive, skipping backup')
      return
    }

    // Perform backup
    await uploadHabitsToGoogleDrive(habits, authToken.accessToken)
    
    console.log('✅ Automatic daily backup completed successfully')
    
    // Notify main app if it's open
    notifyMainApp('BACKUP_COMPLETED', { 
      timestamp: new Date().toISOString(),
      habitsCount: habits.length 
    })
    
  } catch (error) {
    console.error('❌ Daily backup failed:', error)
    notifyMainApp('BACKUP_FAILED', { 
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

// IndexedDB helpers
async function getHabitsFromDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('BetterHabitsDB', 2)
    
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['habits'], 'readonly')
      const store = transaction.objectStore('habits')
      
      const getAllRequest = store.getAll()
      getAllRequest.onsuccess = () => {
        resolve(getAllRequest.result)
      }
      getAllRequest.onerror = () => reject(getAllRequest.error)
    }
    
    request.onerror = () => reject(request.error)
  })
}

// Upload to Google Drive
async function uploadHabitsToGoogleDrive(habits, accessToken) {
  const fileName = `better-habits-backup-${new Date().toISOString().split('T')[0]}.json`
  const fileContent = JSON.stringify({
    exportDate: new Date().toISOString(),
    version: '1.0',
    habits: habits,
    metadata: {
      totalHabits: habits.length,
      exportSource: 'Better Habits App (Auto-backup)',
      backupType: 'automatic'
    }
  }, null, 2)

  // Get or create better-habits folder
  const folderId = await ensureBetterHabitsFolder(accessToken)
  
  // Create file metadata
  const metadata = {
    name: fileName,
    description: 'Better Habits automatic daily backup',
    mimeType: 'application/json',
    parents: [folderId]
  }

  // Create multipart upload
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', new Blob([fileContent], { type: 'application/json' }))

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: form
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
  }

  const result = await response.json()
  console.log('✅ Auto-backup uploaded to Google Drive:', result.id)
  return result
}

// Helper to ensure better-habits folder exists
async function ensureBetterHabitsFolder(accessToken) {
  // Search for existing folder
  const searchResponse = await fetch('https://www.googleapis.com/drive/v3/files?' + 
    new URLSearchParams({
      q: "name='better-habits' and mimeType='application/vnd.google-apps.folder'",
      fields: 'files(id,name)'
    }), {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })

  const searchResult = await searchResponse.json()
  const folders = searchResult.files || []
  
  if (folders.length > 0) {
    return folders[0].id
  }

  // Create folder
  const folderResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'better-habits',
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Better Habits app backup folder'
    })
  })

  const folderResult = await folderResponse.json()
  return folderResult.id
}

// Storage helpers for settings and auth tokens
async function storeBackupSettings(settings) {
  return new Promise((resolve) => {
    const request = indexedDB.open('BetterHabitsSettings', 1)
    
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }
    }
    
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['settings'], 'readwrite')
      const store = transaction.objectStore('settings')
      
      store.put({ key: 'autoBackup', value: settings })
      transaction.oncomplete = () => resolve()
    }
  })
}

async function getBackupSettings() {
  return new Promise((resolve) => {
    const request = indexedDB.open('BetterHabitsSettings', 1)
    
    request.onsuccess = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('settings')) {
        resolve(null)
        return
      }
      
      const transaction = db.transaction(['settings'], 'readonly')
      const store = transaction.objectStore('settings')
      const getRequest = store.get('autoBackup')
      
      getRequest.onsuccess = () => {
        resolve(getRequest.result?.value || null)
      }
      getRequest.onerror = () => resolve(null)
    }
    
    request.onerror = () => resolve(null)
  })
}

async function storeAuthToken(authData) {
  return new Promise((resolve) => {
    const request = indexedDB.open('BetterHabitsSettings', 1)
    
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }
    }
    
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['settings'], 'readwrite')
      const store = transaction.objectStore('settings')
      
      store.put({ key: 'googleAuth', value: authData })
      transaction.oncomplete = () => resolve()
    }
  })
}

async function getStoredAuthToken() {
  return new Promise((resolve) => {
    const request = indexedDB.open('BetterHabitsSettings', 1)
    
    request.onsuccess = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('settings')) {
        resolve(null)
        return
      }
      
      const transaction = db.transaction(['settings'], 'readonly')
      const store = transaction.objectStore('settings')
      const getRequest = store.get('googleAuth')
      
      getRequest.onsuccess = () => {
        resolve(getRequest.result?.value || null)
      }
      getRequest.onerror = () => resolve(null)
    }
    
    request.onerror = () => resolve(null)
  })
}

// Notify main app
function notifyMainApp(type, data) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type, data })
    })
  })
}

console.log('🚀 Service Worker loaded successfully')