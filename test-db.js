// Simple test script to debug IndexedDB operations
const DB_NAME = 'BetterHabitsDB'
const DB_VERSION = 2
const HABITS_STORE = 'habits'

let db = null

const initDB = () => {
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
        const transaction = event.target.transaction
        const store = transaction.objectStore(HABITS_STORE)
        if (!store.indexNames.contains('sortOrder')) {
          store.createIndex('sortOrder', 'sortOrder', { unique: false })
          console.log('✅ sortOrder index added')
        }
      }
    }
  })
}

const addTestHabit = async (name, sortOrder = null) => {
  if (!db) await initDB()
  
  const habit = {
    id: Date.now().toString() + Math.random(),
    name,
    createdAt: new Date().toISOString(),
    completedDates: [],
    failedDates: [],
    sortOrder: sortOrder !== null ? sortOrder : Date.now(),
    icon: 'fitness_center'
  }
  
  const transaction = db.transaction([HABITS_STORE], 'readwrite')
  const store = transaction.objectStore(HABITS_STORE)
  
  return new Promise((resolve, reject) => {
    const request = store.add(habit)
    request.onsuccess = () => {
      console.log(`➕ Added habit: ${habit.name} (sortOrder: ${habit.sortOrder})`)
      resolve(habit)
    }
    request.onerror = () => reject(request.error)
  })
}

const getAllHabits = async () => {
  if (!db) await initDB()
  
  const transaction = db.transaction([HABITS_STORE], 'readonly')
  const store = transaction.objectStore(HABITS_STORE)
  
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => {
      const habits = request.result
      habits.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      console.log('📚 Current habits in database:')
      habits.forEach((h, i) => {
        console.log(`  ${i + 1}. ${h.name} (sortOrder: ${h.sortOrder})`)
      })
      resolve(habits)
    }
    request.onerror = () => reject(request.error)
  })
}

const updateHabitsOrder = async (habits) => {
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
    
    console.log('🔄 Updating habits order...')
    habits.forEach((habit, index) => {
      const updatedHabit = { ...habit, sortOrder: index }
      console.log(`📝 Setting ${habit.name} to order ${index}`)
      const request = store.put(updatedHabit)
      
      request.onsuccess = () => {
        completed++
        console.log(`✅ Updated ${habit.name} (${completed}/${total})`)
        if (completed === total) {
          console.log('🎉 All habits updated')
          resolve()
        }
      }
      
      request.onerror = () => {
        console.error('❌ Error updating:', request.error)
        reject(request.error)
      }
    })
  })
}

const testReordering = async () => {
  console.log('🧪 Starting reorder test...')
  
  // Get current habits
  let habits = await getAllHabits()
  
  if (habits.length < 2) {
    console.log('⚠️ Need at least 2 habits to test reordering')
    return
  }
  
  console.log('📋 Original order:')
  habits.forEach((h, i) => console.log(`  ${i}: ${h.name}`))
  
  // Reverse the order
  const reorderedHabits = [...habits].reverse()
  console.log('🔄 Reordering to:')
  reorderedHabits.forEach((h, i) => console.log(`  ${i}: ${h.name}`))
  
  // Update order
  await updateHabitsOrder(reorderedHabits)
  
  // Wait a bit and check if it persisted
  setTimeout(async () => {
    console.log('🔍 Checking persistence...')
    const newHabits = await getAllHabits()
    console.log('✅ Order after reload:')
    newHabits.forEach((h, i) => console.log(`  ${i}: ${h.name}`))
  }, 100)
}

// Export for use in browser console
window.testDB = {
  initDB,
  addTestHabit,
  getAllHabits,
  updateHabitsOrder,
  testReordering
}

console.log('🎯 Database test utilities loaded. Use window.testDB in console.')