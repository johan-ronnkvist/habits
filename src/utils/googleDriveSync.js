// Google Drive API integration for syncing habit data
// This module handles authentication and file upload to Google Drive using Google Identity Services

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
const SCOPES = 'https://www.googleapis.com/auth/drive.file'

class GoogleDriveSync {
  constructor() {
    this.gapi = null
    this.isInitialized = false
    this.isSignedIn = false
    this.accessToken = null
    this.tokenClient = null
    this.refreshToken = null
    this.tokenExpiry = null
    
    // Try to restore tokens from localStorage on init
    this.restoreTokensFromStorage()
  }
  
  // Store tokens in localStorage for persistence
  storeTokens(accessToken, expiresIn, refreshToken = null) {
    this.accessToken = accessToken
    this.tokenExpiry = Date.now() + (expiresIn * 1000) // Convert seconds to milliseconds
    
    localStorage.setItem('google_access_token', accessToken)
    localStorage.setItem('google_token_expiry', this.tokenExpiry.toString())
    
    // Store refresh token if provided (for longer persistence)
    if (refreshToken) {
      this.refreshToken = refreshToken
      localStorage.setItem('google_refresh_token', refreshToken)
      console.log('💾 Stored access token and refresh token in localStorage')
    } else {
      console.log('💾 Stored access token in localStorage (no refresh token)')
    }
  }
  
  // Restore tokens from localStorage
  restoreTokensFromStorage() {
    const storedToken = localStorage.getItem('google_access_token')
    const storedExpiry = localStorage.getItem('google_token_expiry')
    const storedRefreshToken = localStorage.getItem('google_refresh_token')
    
    if (storedToken && storedExpiry) {
      const expiry = parseInt(storedExpiry)
      const now = Date.now()
      
      // Check if token is still valid (with 5 minute buffer)
      if (expiry > now + (5 * 60 * 1000)) {
        this.accessToken = storedToken
        this.tokenExpiry = expiry
        this.refreshToken = storedRefreshToken
        this.isSignedIn = true
        
        // Set the token in gapi client for API calls
        if (window.gapi?.client?.setToken) {
          window.gapi.client.setToken({
            access_token: storedToken
          })
          console.log('✅ Restored valid access token from localStorage and set in gapi client')
        } else {
          console.log('✅ Restored valid access token from localStorage')
        }
        return true
      } else {
        console.log('⚠️ Stored access token has expired')
        // If we have a refresh token, try to refresh instead of clearing all tokens
        if (storedRefreshToken) {
          this.refreshToken = storedRefreshToken
          console.log('🔄 Will attempt to refresh expired token using refresh token')
          return 'needs_refresh'
        } else {
          console.log('❌ No refresh token available, will need to re-authenticate')
          this.clearStoredTokens()
        }
      }
    }
    return false
  }
  
  // Clear stored tokens
  clearStoredTokens() {
    this.accessToken = null
    this.tokenExpiry = null
    this.refreshToken = null
    this.isSignedIn = false
    
    localStorage.removeItem('google_access_token')
    localStorage.removeItem('google_token_expiry')
    localStorage.removeItem('google_refresh_token')
    
    console.log('🗑️ Cleared stored tokens')
  }
  
  // Check if current token is valid and not expired
  isTokenValid() {
    if (!this.accessToken || !this.tokenExpiry) {
      return false
    }
    
    // Check if token expires in next 5 minutes
    const now = Date.now()
    const bufferTime = 5 * 60 * 1000 // 5 minutes
    
    return this.tokenExpiry > (now + bufferTime)
  }

  // Refresh access token using refresh token
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      console.log('🔄 Refreshing access token...')
      
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
      if (!clientId) {
        throw new Error('Google Client ID not configured')
      }

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token'
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Token refresh failed: ${response.status} ${errorData.error || response.statusText}`)
      }

      const tokenData = await response.json()
      
      // Store the new access token (refresh token usually stays the same)
      const expiresIn = tokenData.expires_in || 3600
      this.storeTokens(tokenData.access_token, expiresIn, this.refreshToken)
      this.isSignedIn = true
      
      console.log('✅ Successfully refreshed access token')
      return true
    } catch (error) {
      console.error('❌ Failed to refresh access token:', error)
      // If refresh fails, clear tokens and require re-authentication
      this.clearStoredTokens()
      throw error
    }
  }

  // Initialize Google API using new Google Identity Services
  async init() {
    if (this.isInitialized) {
      // Check if we need to refresh token after initialization
      const tokenStatus = this.restoreTokensFromStorage()
      if (tokenStatus === 'needs_refresh') {
        try {
          await this.refreshAccessToken()
        } catch {
          console.log('❌ Token refresh failed during init, will require sign-in')
        }
      }
      return true
    }

    try {
      console.log('🔄 Starting Google Drive API initialization with GIS...')
      
      // Wait for both gapi and google.accounts to load
      if (typeof window.gapi === 'undefined') {
        throw new Error('Google APIs library not loaded. Please check your internet connection.')
      }
      
      // Wait for Google Identity Services to load (it's async)
      let retries = 0
      const maxRetries = 50 // 5 seconds max wait
      while (typeof window.google?.accounts === 'undefined' && retries < maxRetries) {
        console.log(`⏳ Waiting for Google Identity Services to load... (${retries + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, 100))
        retries++
      }
      
      if (typeof window.google?.accounts === 'undefined') {
        throw new Error('Google Identity Services library failed to load after waiting. Please refresh the page.')
      }
      console.log('✅ Google APIs and GIS libraries loaded')

      // Load gapi client
      console.log('🔄 Loading gapi client...')
      await new Promise((resolve, reject) => {
        window.gapi.load('client', {
          callback: resolve,
          onerror: (error) => {
            console.error('Failed to load gapi client:', error)
            reject(new Error(`Failed to load Google API client: ${error}`))
          }
        })
      })
      console.log('✅ gapi client loaded')

      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
      console.log('🔍 Client ID check:', clientId ? `Present (${clientId.substring(0, 20)}...)` : 'Missing')
      if (!clientId) {
        throw new Error('Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID environment variable.')
      }

      // Initialize gapi client
      console.log('🔄 Initializing gapi client...')
      await window.gapi.client.init({
        discoveryDocs: [DISCOVERY_DOC]
      })
      console.log('✅ gapi client initialized')

      // Initialize Google Identity Services token client
      console.log('🔄 Initializing GIS token client...')
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        include_granted_scopes: true,
        callback: (response) => {
          if (response.error) {
            console.error('Token response error:', response.error)
            return
          }
          
          // Store tokens with expiry information
          const expiresIn = response.expires_in || 3600 // Default 1 hour
          this.storeTokens(response.access_token, expiresIn)
          
          // Set the token in gapi client for API calls
          window.gapi.client.setToken({
            access_token: response.access_token
          })
          
          this.isSignedIn = true
          console.log('✅ Access token received, stored, and set in gapi client')
        }
      })
      
      // Note: Using token client (implicit flow) for browser security
      // Refresh tokens require server-side implementation with client secret
      console.log('✅ GIS token client initialized')
      
      this.isInitialized = true
      console.log('✅ Google Drive API initialized successfully with GIS')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize Google Drive API:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ? 'Present' : 'Missing',
        gapiAvailable: typeof window.gapi !== 'undefined',
        gisAvailable: typeof window.google?.accounts !== 'undefined'
      })
      this.isInitialized = false
      throw error
    }
  }


  // Sign in to Google using new GIS
  async signIn(requestRefreshToken = true) {
    if (!this.isInitialized) {
      await this.init()
    }

    try {
      // Check if we have a valid stored token
      if (this.isSignedIn && this.isTokenValid()) {
        console.log('✅ Using existing valid token, already signed in')
        return true
      }
      
      // Try to refresh token if available
      if (this.refreshToken && !this.isTokenValid()) {
        try {
          console.log('🔄 Attempting to refresh expired token...')
          await this.refreshAccessToken()
          return true
        } catch {
          console.log('❌ Token refresh failed, proceeding with new sign-in')
          this.clearStoredTokens()
        }
      }

      console.log('🔄 Starting Google sign-in flow with GIS...')
      
      // Use token flow (implicit flow) - more suitable for browser apps
      {
        return new Promise((resolve, reject) => {
          this.tokenClient.callback = (response) => {
            if (response.error) {
              console.error('Token response error:', response.error)
              reject(new Error(`Google sign-in failed: ${response.error}`))
              return
            }
            
            // Store tokens with expiry information
            const expiresIn = response.expires_in || 3600 // Default 1 hour
            this.storeTokens(response.access_token, expiresIn, this.refreshToken)
            this.isSignedIn = true
            console.log('✅ Successfully signed in to Google Drive with GIS')
            resolve(true)
          }
          
          // Request access token (will prompt user if needed)
          this.tokenClient.requestAccessToken({ prompt: '' })
        })
      }
    } catch (error) {
      console.error('❌ Failed to sign in to Google Drive:', error)
      throw new Error(`Google sign-in failed: ${error.message}`)
    }
  }

  // Sign out from Google
  async signOut() {
    try {
      if (this.accessToken) {
        // Revoke the access token
        window.google.accounts.oauth2.revoke(this.accessToken)
        console.log('🔐 Revoked access token')
      }
      
      // Clear all stored tokens and state
      this.clearStoredTokens()
      console.log('✅ Successfully signed out from Google Drive')
    } catch (error) {
      console.error('❌ Failed to sign out from Google Drive:', error)
      // Even if revocation fails, clear local tokens
      this.clearStoredTokens()
      throw error
    }
  }

  // Check if user is currently signed in
  getSignInStatus() {
    return this.isSignedIn && this.isTokenValid()
  }

  // Ensure we have a valid token before making API calls
  async ensureValidToken() {
    if (!this.isSignedIn || !this.isTokenValid()) {
      console.log('🔄 Token invalid or expired, attempting to refresh...')
      
      // Try to refresh first if we have a refresh token
      if (this.refreshToken) {
        try {
          await this.refreshAccessToken()
          return this.isTokenValid()
        } catch {
          console.log('❌ Token refresh failed, requiring new sign-in')
          // Fall back to sign-in
          await this.signIn()
        }
      } else {
        // No refresh token, need to sign in
        await this.signIn()
      }
    }
    return this.isTokenValid()
  }

  // Get current user's email (note: with token-based auth, email isn't directly available)
  getUserEmail() {
    // With the new GIS, we don't get user info automatically
    // We'd need to make a separate API call to get profile info
    // For now, return a placeholder or make an API call if needed
    return this.isSignedIn ? 'Google Account' : null
  }

  // Get or create the better-habits folder
  async ensureBetterHabitsFolder() {
    try {
      console.log('📁 Checking for better-habits folder...')
      
      // Search for existing folder
      const response = await window.gapi.client.drive.files.list({
        q: "name='better-habits' and mimeType='application/vnd.google-apps.folder'",
        fields: 'files(id,name)'
      })

      const folders = response.result.files || []
      
      if (folders.length > 0) {
        console.log('✅ Found existing better-habits folder:', folders[0].id)
        return folders[0].id
      }

      // Create folder if it doesn't exist
      console.log('📁 Creating better-habits folder...')
      const folderMetadata = {
        name: 'better-habits',
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Better Habits app backup folder'
      }

      const createResponse = await window.gapi.client.drive.files.create({
        resource: folderMetadata,
        fields: 'id'
      })

      const folderId = createResponse.result.id
      console.log('✅ Created better-habits folder:', folderId)
      return folderId
    } catch (error) {
      console.error('❌ Failed to ensure better-habits folder:', error)
      throw error
    }
  }

  // Upload habit data and settings to Google Drive (single file approach)
  async uploadHabits(habitsData) {
    await this.ensureValidToken()
    
    if (!this.isSignedIn) {
      throw new Error('Please sign in to Google Drive first')
    }

    try {
      // Ensure the better-habits folder exists
      const folderId = await this.ensureBetterHabitsFolder()
      
      const fileName = 'better-habits-backup.json'
      
      // Collect user settings
      const settings = {
        selectedTheme: localStorage.getItem('selectedTheme'),
        reminderEnabled: localStorage.getItem('reminderEnabled'),
        reminderTime: localStorage.getItem('reminderTime')
      }
      
      const fileContent = JSON.stringify({
        exportDate: new Date().toISOString(),
        version: '1.1',
        habits: habitsData,
        settings: settings,
        metadata: {
          totalHabits: habitsData.length,
          exportSource: 'Better Habits App'
        }
      }, null, 2)

      // Check if backup file already exists
      const existingFileResponse = await window.gapi.client.drive.files.list({
        q: `'${folderId}' in parents and name='${fileName}'`,
        fields: 'files(id,name)'
      })

      const existingFiles = existingFileResponse.result.files || []
      
      if (existingFiles.length > 0) {
        // Update existing file
        const fileId = existingFiles[0].id
        console.log('🔄 Updating existing backup file:', fileId)
        
        const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: fileContent
        })

        if (!response.ok) {
          throw new Error(`Update failed: ${response.status} ${response.statusText}`)
        }

        const result = await response.json()
        console.log('✅ Successfully updated backup file:', result)
        
        return {
          success: true,
          fileId: result.id || fileId,
          fileName: fileName,
          uploadDate: new Date().toISOString(),
          operation: 'updated'
        }
      } else {
        // Create new file
        console.log('📁 Creating new backup file')
        
        const metadata = {
          name: fileName,
          description: 'Better Habits app data backup',
          mimeType: 'application/json',
          parents: [folderId]
        }

        const form = new FormData()
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
        form.append('file', new Blob([fileContent], { type: 'application/json' }))

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          },
          body: form
        })

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
        }

        const result = await response.json()
        console.log('✅ Successfully created backup file:', result)
        
        return {
          success: true,
          fileId: result.id,
          fileName: fileName,
          uploadDate: new Date().toISOString(),
          operation: 'created'
        }
      }
    } catch (error) {
      console.error('❌ Failed to upload habits to Google Drive:', error)
      throw error
    }
  }

  // Get backup file from Google Drive (single file approach)
  async listBackupFiles() {
    await this.ensureValidToken()
    
    if (!this.isSignedIn) {
      throw new Error('Please sign in to Google Drive first')
    }

    try {
      console.log('🔍 Looking for backup file in better-habits folder...')
      
      // Find the better-habits folder first
      const folderResponse = await window.gapi.client.drive.files.list({
        q: "name='better-habits' and mimeType='application/vnd.google-apps.folder'",
        fields: 'files(id,name)'
      })

      const folders = folderResponse.result.files || []
      if (folders.length === 0) {
        console.log('ℹ️ No better-habits folder found')
        return []
      }

      const folderId = folders[0].id
      
      // Look for the single backup file
      const response = await window.gapi.client.drive.files.list({
        q: `'${folderId}' in parents and name='better-habits-backup.json'`,
        fields: 'files(id,name,modifiedTime,size)',
        orderBy: 'modifiedTime desc'
      })

      const files = response.result.files || []
      console.log(`📁 Found ${files.length} backup file in better-habits folder:`, files.map(f => f.name))
      return files
    } catch (error) {
      console.error('❌ Failed to list backup files:', error)
      throw error
    }
  }

  // Download and parse a backup file from Google Drive
  async downloadBackup(fileId) {
    if (!this.isSignedIn) {
      throw new Error('Please sign in to Google Drive first')
    }

    try {
      console.log('📥 Downloading backup file:', fileId)
      
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`)
      }

      const content = await response.text()
      const backupData = JSON.parse(content)
      
      console.log('✅ Successfully downloaded backup:', {
        exportDate: backupData.exportDate,
        version: backupData.version,
        habitsCount: backupData.habits?.length || 0
      })

      return backupData
    } catch (error) {
      console.error('❌ Failed to download backup:', error)
      throw error
    }
  }

  // Get the most recent backup file
  async getLatestBackup() {
    const files = await this.listBackupFiles()
    if (files.length === 0) {
      return null
    }
    
    const latestFile = files[0] // Files are ordered by modifiedTime desc
    return await this.downloadBackup(latestFile.id)
  }

  // Alias for getLatestBackup (used by auto-sync)
  async getMostRecentBackup() {
    return await this.getLatestBackup()
  }

  // Delete backup file from Google Drive
  async deleteAllBackups() {
    await this.ensureValidToken()
    
    if (!this.isSignedIn) {
      throw new Error('Please sign in to Google Drive first')
    }

    try {
      console.log('🗑️ Starting to delete backup file...')
      
      // Get the backup file
      const files = await this.listBackupFiles()
      
      if (files.length === 0) {
        console.log('ℹ️ No backup file found to delete')
        return { deletedCount: 0, errors: [] }
      }

      const file = files[0]
      console.log(`🗑️ Deleting backup file: ${file.name}`)
      
      try {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to delete ${file.name}: ${response.status} ${response.statusText}`)
        }

        console.log(`✅ Deleted backup file: ${file.name}`)
        return {
          deletedCount: 1,
          totalFiles: 1,
          errors: []
        }
      } catch (error) {
        console.error(`❌ Failed to delete ${file.name}:`, error)
        return {
          deletedCount: 0,
          totalFiles: 1,
          errors: [`${file.name}: ${error.message}`]
        }
      }
    } catch (error) {
      console.error('❌ Failed to delete backup file:', error)
      throw error
    }
  }

  // Check if user is currently signed in and return status
  async checkSignInStatus() {
    try {
      if (!this.isInitialized) {
        await this.init()
      }
      return this.isSignedIn
    } catch (error) {
      console.error('❌ Failed to check sign-in status:', error)
      return false
    }
  }

  // Auto-sync: download and restore most recent backup if user is signed in and hasn't synced today
  async autoSyncIfNeeded(hasSyncedToday, setLastSyncDate) {
    try {
      console.log('🔄 Checking if auto-sync is needed...')
      
      // Check if we're signed in
      const isSignedIn = await this.checkSignInStatus()
      if (!isSignedIn) {
        console.log('ℹ️ Not signed in to Google Drive, skipping auto-sync')
        return { skipped: 'not_signed_in' }
      }

      // Check if we've already synced today
      if (await hasSyncedToday()) {
        console.log('ℹ️ Already synced today, skipping auto-sync')
        return { skipped: 'already_synced_today' }
      }

      console.log('🔄 Auto-sync conditions met, attempting to restore from Google Drive...')
      
      // Try to get the most recent backup
      const mostRecentBackup = await this.getMostRecentBackup()
      
      if (!mostRecentBackup) {
        console.log('ℹ️ No backups found on Google Drive')
        // Still mark as synced to avoid repeated attempts
        await setLastSyncDate()
        return { skipped: 'no_backups_found' }
      }

      console.log('📥 Found recent backup, attempting to restore...')
      return { initiated: true, backupData: mostRecentBackup }
      
    } catch (error) {
      console.error('❌ Auto-sync failed:', error)
      return { error: error.message }
    }
  }
}

// Create singleton instance
const googleDriveSync = new GoogleDriveSync()

export default googleDriveSync