const DB_NAME = 'BetterHabitsDB'
const DB_VERSION = 2 // Increment version to support sortOrder
const HABITS_STORE = 'habits'

let db = null

export const initDB = () => {
  return new Promise((resolve, reject) => {
    console.log(`🗄️ Opening database ${DB_NAME} version ${DB_VERSION}`)
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      console.log('✅ Database opened successfully')
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      console.log(`🔧 Database upgrade needed: ${event.oldVersion} -> ${event.newVersion}`)
      const database = event.target.result
      const oldVersion = event.oldVersion
      
      if (!database.objectStoreNames.contains(HABITS_STORE)) {
        console.log('📦 Creating habits store')
        const store = database.createObjectStore(HABITS_STORE, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt', { unique: false })
        store.createIndex('name', 'name', { unique: false })
        store.createIndex('sortOrder', 'sortOrder', { unique: false })
      } else if (oldVersion < 2) {
        console.log('🔧 Adding sortOrder index to existing store')
        // Add sortOrder index for existing databases
        const transaction = event.target.transaction
        const store = transaction.objectStore(HABITS_STORE)
        if (!store.indexNames.contains('sortOrder')) {
          store.createIndex('sortOrder', 'sortOrder', { unique: false })
          console.log('✅ sortOrder index added')
        } else {
          console.log('ℹ️ sortOrder index already exists')
        }
      }
    }
  })
}

export const addHabit = async (habit) => {
  if (!db) await initDB()
  
  const habitWithDefaults = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    completedDates: [],
    failedDates: [],
    streak: 0,
    sortOrder: Date.now(), // Use timestamp as default sortOrder
    ...habit
  }
  
  const transaction = db.transaction([HABITS_STORE], 'readwrite')
  const store = transaction.objectStore(HABITS_STORE)
  
  return new Promise((resolve, reject) => {
    const request = store.add(habitWithDefaults)
    request.onsuccess = () => {
      console.log(`➕ Added new habit: ${habitWithDefaults.name} with sortOrder ${habitWithDefaults.sortOrder}`)
      resolve(habitWithDefaults)
    }
    request.onerror = () => {
      console.error('❌ Error adding habit:', request.error)
      reject(request.error)
    }
  })
}


export const getAllHabits = async () => {
  if (!db) await initDB()
  
  // First, read all habits
  const transaction = db.transaction([HABITS_STORE], 'readonly')
  const store = transaction.objectStore(HABITS_STORE)
  
  const habits = await new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => {
      const result = request.result.map(habit => ({
        ...habit,
        failedDates: habit.failedDates || [], // Ensure failedDates exists for existing habits
      }))
      resolve(result)
    }
    request.onerror = () => reject(request.error)
  })
  
  // Check if any habits are missing sortOrder and fix them
  const habitsNeedingSortOrder = habits.filter(h => h.sortOrder == null)
  if (habitsNeedingSortOrder.length > 0) {
    console.log('🔄 Migrating habits to add sortOrder:', habitsNeedingSortOrder.map(h => h.name))
    
    // Assign sortOrder based on creation date for missing ones
    habits.forEach((habit, index) => {
      if (habit.sortOrder == null) {
        const createdTime = Date.parse(habit.createdAt)
        habit.sortOrder = isNaN(createdTime) ? Date.now() + index : createdTime
        console.log(`📝 Assigning sortOrder ${habit.sortOrder} to ${habit.name}`)
      }
    })
    
    // Update all habits with missing sortOrder
    try {
      await updateHabitsOrder(habits)
      console.log('✅ Migration complete - all habits now have sortOrder')
    } catch (error) {
      console.error('❌ Migration failed:', error)
    }
  }
  
  // Sort by sortOrder
  habits.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  console.log('📚 Loading habits from database:')
  habits.forEach((h, i) => {
    console.log(`  ${i + 1}. ${h.name} (sortOrder: ${h.sortOrder})`)
  })
  
  return habits
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

export const updateHabitsOrder = async (habits) => {
  if (!db) await initDB()
  
  const transaction = db.transaction([HABITS_STORE], 'readwrite')
  const store = transaction.objectStore(HABITS_STORE)
  
  return new Promise((resolve, reject) => {
    let completed = 0
    const total = habits.length
    
    if (total === 0) {
      resolve()
      return
    }
    
    console.log('🔄 Starting habit order update...')
    console.log('Updating habit order:', habits.map((h, i) => ({ name: h.name, oldOrder: h.sortOrder, newOrder: i })))
    
    habits.forEach((habit, index) => {
      const updatedHabit = { ...habit, sortOrder: index }
      console.log(`📝 Setting ${habit.name} to order ${index} (was ${habit.sortOrder})`)
      const request = store.put(updatedHabit)
      
      request.onsuccess = () => {
        completed++
        console.log(`✅ Successfully updated ${habit.name} (${completed}/${total})`)
        if (completed === total) {
          console.log('🎉 All habits order updated successfully')
          
          // Verify the update by reading back the data
          const verifyRequest = store.getAll()
          verifyRequest.onsuccess = () => {
            const updatedHabits = verifyRequest.result
            console.log('🔍 Verification - habits in database:', updatedHabits.map(h => ({ name: h.name, sortOrder: h.sortOrder })))
            resolve()
          }
        }
      }
      
      request.onerror = () => {
        console.error('❌ Error updating habit order:', request.error)
        reject(request.error)
      }
    })
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