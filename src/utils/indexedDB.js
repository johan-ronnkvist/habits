const DB_NAME = 'BetterHabitsDB'
const DB_VERSION = 1
const HABITS_STORE = 'habits'

let db = null

export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = event.target.result
      
      if (!database.objectStoreNames.contains(HABITS_STORE)) {
        const store = database.createObjectStore(HABITS_STORE, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt', { unique: false })
        store.createIndex('name', 'name', { unique: false })
      }
    }
  })
}

export const addHabit = async (habit) => {
  if (!db) await initDB()
  
  const transaction = db.transaction([HABITS_STORE], 'readwrite')
  const store = transaction.objectStore(HABITS_STORE)
  
  const habitWithDefaults = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    completedDates: [],
    failedDates: [],
    streak: 0,
    ...habit
  }
  
  return new Promise((resolve, reject) => {
    const request = store.add(habitWithDefaults)
    request.onsuccess = () => resolve(habitWithDefaults)
    request.onerror = () => reject(request.error)
  })
}

export const getAllHabits = async () => {
  if (!db) await initDB()
  
  const transaction = db.transaction([HABITS_STORE], 'readonly')
  const store = transaction.objectStore(HABITS_STORE)
  
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => {
      const habits = request.result.map(habit => ({
        ...habit,
        failedDates: habit.failedDates || [] // Ensure failedDates exists for existing habits
      }))
      resolve(habits)
    }
    request.onerror = () => reject(request.error)
  })
}

export const updateHabit = async (id, updates) => {
  if (!db) await initDB()
  
  const transaction = db.transaction([HABITS_STORE], 'readwrite')
  const store = transaction.objectStore(HABITS_STORE)
  
  return new Promise((resolve, reject) => {
    const getRequest = store.get(id)
    getRequest.onsuccess = () => {
      const habit = getRequest.result
      if (habit) {
        const updatedHabit = { ...habit, ...updates }
        const putRequest = store.put(updatedHabit)
        putRequest.onsuccess = () => resolve(updatedHabit)
        putRequest.onerror = () => reject(putRequest.error)
      } else {
        reject(new Error('Habit not found'))
      }
    }
    getRequest.onerror = () => reject(getRequest.error)
  })
}

export const deleteHabit = async (id) => {
  if (!db) await initDB()
  
  const transaction = db.transaction([HABITS_STORE], 'readwrite')
  const store = transaction.objectStore(HABITS_STORE)
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export const setHabitState = async (id, date = new Date().toISOString().split('T')[0], state = 'none') => {
  if (!db) await initDB()
  
  const habit = await new Promise((resolve, reject) => {
    const transaction = db.transaction([HABITS_STORE], 'readonly')
    const store = transaction.objectStore(HABITS_STORE)
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  
  if (!habit) throw new Error('Habit not found')
  
  const completedDates = [...habit.completedDates]
  const failedDates = [...(habit.failedDates || [])]
  
  // Remove date from both arrays first
  const completedIndex = completedDates.indexOf(date)
  const failedIndex = failedDates.indexOf(date)
  
  if (completedIndex > -1) completedDates.splice(completedIndex, 1)
  if (failedIndex > -1) failedDates.splice(failedIndex, 1)
  
  // Add to appropriate array based on state
  if (state === 'completed') {
    completedDates.push(date)
    completedDates.sort()
  } else if (state === 'failed') {
    failedDates.push(date)
    failedDates.sort()
  }
  
  const streak = calculateStreak(completedDates)
  
  return updateHabit(id, { completedDates, failedDates, streak })
}

export const getHabitState = (habit, date = new Date().toISOString().split('T')[0]) => {
  const completedDates = habit.completedDates || []
  const failedDates = habit.failedDates || []
  
  if (completedDates.includes(date)) return 'completed'
  if (failedDates.includes(date)) return 'failed'
  return 'none'
}

export const toggleHabitCompletion = async (id, date = new Date().toISOString().split('T')[0]) => {
  if (!db) await initDB()
  
  const habit = await new Promise((resolve, reject) => {
    const transaction = db.transaction([HABITS_STORE], 'readonly')
    const store = transaction.objectStore(HABITS_STORE)
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  
  if (!habit) throw new Error('Habit not found')
  
  const currentState = getHabitState(habit, date)
  const newState = currentState === 'completed' ? 'none' : 'completed'
  
  return setHabitState(id, date, newState)
}

const calculateStreak = (completedDates) => {
  if (completedDates.length === 0) return 0
  
  const sortedDates = [...completedDates].sort().reverse()
  const today = new Date().toISOString().split('T')[0]
  let streak = 0
  
  for (let i = 0; i < sortedDates.length; i++) {
    const currentDate = sortedDates[i]
    const expectedDate = new Date()
    expectedDate.setDate(expectedDate.getDate() - i)
    const expectedDateStr = expectedDate.toISOString().split('T')[0]
    
    if (currentDate === expectedDateStr || (i === 0 && currentDate === today)) {
      streak++
    } else {
      break
    }
  }
  
  return streak
}