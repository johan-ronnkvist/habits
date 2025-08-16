// Notification service for daily habit reminders
import { getAllHabits, getHabitState } from './indexedDB'

class NotificationService {
  constructor() {
    this.reminderTimeoutId = null
    this.checkInterval = null
  }

  // Check if any habits are completed for today
  async hasCompletedHabitsToday() {
    try {
      const habits = await getAllHabits()
      if (habits.length === 0) return false

      const today = new Date().toISOString().split('T')[0]
      
      // Check if any habit is marked as completed today
      return habits.some(habit => getHabitState(habit, today) === 'completed')
    } catch (error) {
      console.error('Error checking habit completion:', error)
      return false
    }
  }

  // Show the daily reminder notification
  async showDailyReminder() {
    if (Notification.permission !== 'granted') {
      console.warn('⚠️ Notification permission not granted')
      return
    }

    try {
      // Try to use service worker for better reliability
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        if (registration.showNotification) {
          await registration.showNotification('Daily Habit Reminder', {
            body: "Don't forget to track your habits today!",
            icon: '/habit-icon.svg',
            badge: '/habit-icon.svg',
            tag: 'daily-reminder',
            requireInteraction: false,
            silent: false,
            actions: [
              {
                action: 'open',
                title: 'Open App'
              }
            ]
          })
          console.log('🔔 Daily reminder notification sent via service worker')
          return
        }
      }
      
      // Fallback to regular notification
      new Notification('Daily Habit Reminder', {
        body: "Don't forget to track your habits today!",
        icon: '/habit-icon.svg',
        badge: '/habit-icon.svg',
        tag: 'daily-reminder',
        requireInteraction: false,
        silent: false
      })
      
      console.log('🔔 Daily reminder notification sent via Notification API')
    } catch (error) {
      console.error('❌ Error sending notification:', error)
    }
  }

  // Calculate milliseconds until the target time today (or tomorrow if passed)
  getTimeUntilReminder(timeString) {
    const now = new Date()
    const [hours, minutes] = timeString.split(':').map(Number)
    
    const targetTime = new Date()
    targetTime.setHours(hours, minutes, 0, 0)
    
    // If the time has already passed today, schedule for tomorrow
    if (targetTime <= now) {
      targetTime.setDate(targetTime.getDate() + 1)
    }
    
    return targetTime.getTime() - now.getTime()
  }

  // Schedule the daily reminder check
  async scheduleReminder(timeString) {
    this.cancelReminder()
    
    const scheduleNext = async () => {
      const delay = this.getTimeUntilReminder(timeString)
      
      this.reminderTimeoutId = setTimeout(async () => {
        console.log('⏰ Checking for daily reminder...')
        
        // Check if any habits are completed
        const hasCompleted = await this.hasCompletedHabitsToday()
        
        if (!hasCompleted) {
          console.log('📋 No habits completed today - sending reminder')
          this.showDailyReminder()
        } else {
          console.log('✅ Habits already completed today - skipping reminder')
        }
        
        // Schedule the next reminder for tomorrow
        scheduleNext()
      }, delay)
      
      const targetDate = new Date(Date.now() + delay)
      console.log('⏲️ Next reminder scheduled for:', targetDate.toLocaleString())
    }
    
    await scheduleNext()
  }

  // Cancel the current reminder
  cancelReminder() {
    if (this.reminderTimeoutId) {
      clearTimeout(this.reminderTimeoutId)
      this.reminderTimeoutId = null
      console.log('❌ Daily reminder cancelled')
    }
  }

  // Initialize the notification service with saved settings
  async initialize() {
    console.log('🔄 Initializing notification service...')
    
    const reminderEnabled = localStorage.getItem('reminderEnabled') === 'true'
    const reminderTime = localStorage.getItem('reminderTime') || '09:00'
    
    if (reminderEnabled && Notification.permission === 'granted') {
      console.log('🔄 Initializing daily reminders at', reminderTime)
      await this.scheduleReminder(reminderTime)
    } else if (reminderEnabled) {
      console.log('⚠️ Reminders enabled but notification permission not granted')
    }
  }
}

// Create a singleton instance
export const notificationService = new NotificationService()

// Auto-initialize when the module loads
if (typeof window !== 'undefined') {
  // Wait for page load to ensure service worker is registered
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => notificationService.initialize(), 1000)
    })
  } else {
    setTimeout(() => notificationService.initialize(), 1000)
  }
}

export default notificationService