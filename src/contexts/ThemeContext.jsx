import { createContext, useContext, useState, useEffect } from 'react'
import { getAllThemes, getTheme, applyTheme, getSavedTheme } from '../utils/themes'
import googleDriveSync from '../utils/googleDriveSync'

const ThemeContext = createContext()

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => getSavedTheme())
  const [availableThemes] = useState(() => getAllThemes())

  useEffect(() => {
    // Apply the initial theme
    applyTheme(currentTheme)
  }, [])

  const changeTheme = async (themeId) => {
    const newTheme = getTheme(themeId)
    setCurrentTheme(newTheme)
    applyTheme(newTheme)
    
    // If signed in to Google Drive, automatically backup the theme change
    try {
      if (googleDriveSync.getSignInStatus()) {
        // Get current habits data for backup (we need to include it in the backup)
        const { getAllHabits } = await import('../utils/indexedDB')
        const habitsData = await getAllHabits()
        await googleDriveSync.uploadHabits(habitsData)
        console.log('✅ Theme preference backed up to Google Drive')
      }
    } catch (error) {
      console.error('⚠️ Failed to backup theme to Google Drive:', error)
      // Don't throw - theme change should still work locally
    }
  }

  // Function to restore settings from backup (called during app initialization)
  const restoreSettingsFromBackup = (backupData) => {
    if (backupData?.settings?.selectedTheme) {
      const restoredTheme = getTheme(backupData.settings.selectedTheme)
      setCurrentTheme(restoredTheme)
      applyTheme(restoredTheme)
      console.log('✅ Theme restored from Google Drive backup:', restoredTheme.name)
    }
  }

  const value = {
    currentTheme,
    availableThemes,
    changeTheme,
    restoreSettingsFromBackup
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}