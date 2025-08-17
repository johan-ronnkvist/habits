import { NavLink } from 'react-router-dom'

function Navbar() {
  return (
    <nav className="bg-primary-600 shadow-elevation-2">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-medium text-white">Better Habits</h1>
          </div>
          
          <div className="flex space-x-2">
            <NavLink 
              to="/" 
              className={({ isActive }) => 
                isActive 
                  ? 'w-10 h-10 flex items-center justify-center rounded-xl text-primary-700 bg-surface shadow-elevation-1' 
                  : 'w-10 h-10 flex items-center justify-center rounded-xl text-primary-100 hover:text-white hover:bg-primary-500 transition-all duration-200'
              }
              title="Overview"
            >
              <span className="material-symbols-outlined text-xl">
                dashboard
              </span>
            </NavLink>
            
            <NavLink 
              to="/habits" 
              className={({ isActive }) => 
                isActive 
                  ? 'w-10 h-10 flex items-center justify-center rounded-xl text-primary-700 bg-surface shadow-elevation-1' 
                  : 'w-10 h-10 flex items-center justify-center rounded-xl text-primary-100 hover:text-white hover:bg-primary-500 transition-all duration-200'
              }
              title="Habits"
            >
              <span className="material-symbols-outlined text-xl">
                task_alt
              </span>
            </NavLink>
            
            <NavLink 
              to="/history" 
              className={({ isActive }) => 
                isActive 
                  ? 'w-10 h-10 flex items-center justify-center rounded-xl text-primary-700 bg-surface shadow-elevation-1' 
                  : 'w-10 h-10 flex items-center justify-center rounded-xl text-primary-100 hover:text-white hover:bg-primary-500 transition-all duration-200'
              }
              title="History"
            >
              <span className="material-symbols-outlined text-xl">
                calendar_month
              </span>
            </NavLink>
            
            <NavLink 
              to="/settings" 
              className={({ isActive }) => 
                isActive 
                  ? 'w-10 h-10 flex items-center justify-center rounded-xl text-primary-700 bg-surface shadow-elevation-1' 
                  : 'w-10 h-10 flex items-center justify-center rounded-xl text-primary-100 hover:text-white hover:bg-primary-500 transition-all duration-200'
              }
              title="Settings"
            >
              <span className="material-symbols-outlined text-xl">
                settings
              </span>
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar