import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Overview from './pages/Overview'
import Habits from './pages/Habits'
import History from './pages/History'
import Settings from './pages/Settings'
import { initDB, hasSyncedToday, setLastSyncDate, restoreHabitsFromBackup } from './utils/indexedDB'
import googleDriveSync from './utils/googleDriveSync'

function App() {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize the database first
        await initDB()
        console.log('✅ Database initialized')
        
        // Check if auto-sync is needed
        console.log('🔄 Checking for auto-sync opportunity...')
        const autoSyncResult = await googleDriveSync.autoSyncIfNeeded(hasSyncedToday, setLastSyncDate)
        
        if (autoSyncResult.initiated && autoSyncResult.backupData) {
          console.log('🔄 Auto-sync initiated, restoring data...')
          try {
            const result = await restoreHabitsFromBackup(autoSyncResult.backupData, 'merge')
            await setLastSyncDate()
            console.log('✅ Auto-sync completed:', result)
            
            // Show a subtle notification that data was synced
            if (result.added > 0 || result.updated > 0) {
              console.log(`📱 Auto-sync: ${result.added} habits added, ${result.updated} habits updated`)
            }
          } catch (error) {
            console.error('❌ Auto-sync restore failed:', error)
          }
        } else if (autoSyncResult.skipped) {
          console.log('ℹ️ Auto-sync skipped:', autoSyncResult.skipped)
        } else if (autoSyncResult.error) {
          console.error('❌ Auto-sync error:', autoSyncResult.error)
        }
      } catch (error) {
        console.error('Failed to initialize app:', error)
      }
    }
    
    initializeApp()
  }, [])

  return (
    <Router>
      <div className="min-h-screen bg-surface-variant">
        <Navbar />
        <main className="py-8">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
