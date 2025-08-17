function AppIcon({ className = "w-8 h-8" }) {
  return (
    <svg 
      width="256" 
      height="256" 
      viewBox="0 0 256 256" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" className="[stop-color:var(--color-secondary-500)]" />
          <stop offset="100%" className="[stop-color:var(--color-secondary-600)]" />
        </linearGradient>
      </defs>
      
      {/* Material Design rounded square background */}
      <rect 
        x="32" 
        y="32" 
        width="192" 
        height="192" 
        rx="48" 
        ry="48" 
        fill="url(#bg-gradient)" 
      />
      
      {/* Subtle elevation shadow */}
      <rect 
        x="32" 
        y="32" 
        width="192" 
        height="192" 
        rx="48" 
        ry="48" 
        fill="none" 
        stroke="rgba(0,0,0,0.12)" 
        strokeWidth="1" 
      />
      
      {/* Material Design repeat/refresh icon representing habits */}
      <path 
        d="M128 80 C150 80 170 100 170 122 L170 134 L158 122 L170 110 M128 176 C106 176 86 156 86 134 L86 122 L98 134 L86 146" 
        stroke="rgb(var(--color-surface))"
        strokeWidth="10" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        fill="none" 
      />
    </svg>
  )
}

export default AppIcon