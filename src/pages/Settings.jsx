function Settings() {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-neutral-900 mb-2">Settings</h1>
        <p className="text-neutral-600 text-lg">Customize your habit tracking experience</p>
      </div>
      
      <div className="space-y-6">
        <div className="card p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-primary-100 rounded-3xl flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.828 7l2.828 2.828L5.828 12l-2.828-2.828L4.828 7zM14 7l3 3-3 3M6 7l3 3-3 3" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-medium text-neutral-900">Preferences</h2>
              <p className="text-neutral-600">Customize how you track your habits</p>
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
                defaultValue="09:00"
              />
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-4 bg-surface-variant rounded-2xl cursor-pointer hover:bg-primary-50 transition-colors">
                <input type="checkbox" className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500" />
                <div>
                  <span className="font-medium text-neutral-900">Enable daily reminders</span>
                  <p className="text-sm text-neutral-600">Get notified to check in on your habits</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-4 bg-surface-variant rounded-2xl cursor-pointer hover:bg-primary-50 transition-colors">
                <input type="checkbox" className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500" />
                <div>
                  <span className="font-medium text-neutral-900">Week starts on Monday</span>
                  <p className="text-sm text-neutral-600">Choose your preferred week start day</p>
                </div>
              </label>
            </div>
          </div>
        </div>
        
        <div className="card p-8">
          <h3 className="text-2xl font-medium text-neutral-900 mb-6">Data & Privacy</h3>
          <div className="space-y-4">
            <button className="btn-secondary">
              Export Data
            </button>
            <button className="btn-secondary ml-4">
              Clear All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings