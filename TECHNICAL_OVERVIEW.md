# Technical Overview - Better Habits

This document explains the technical choices and concepts used in this project for learning purposes.

## Core Technologies

### Node.js & npm
- **npm** (Node Package Manager) is the standard package manager for JavaScript
- Manages dependencies (external code libraries) your project needs
- Commands like `npm install` download and install packages
- `package.json` lists all your project's dependencies and scripts

### React
- **JavaScript library** for building user interfaces
- Uses **components** - reusable pieces of UI (like LEGO blocks)
- **State management** - React tracks data that can change (like your habits list)
- **Hooks** (`useState`, `useEffect`) - functions that let you use React features
- **JSX** - lets you write HTML-like code inside JavaScript

### Vite
- **Build tool** that bundles your code for production
- Provides fast development server with **hot reload** (changes appear instantly)
- Replaces older tools like Create React App
- Optimizes code for better performance

### Tailwind CSS
- **Utility-first CSS framework** - instead of writing custom CSS, you use pre-built classes
- Example: `bg-blue-500 text-white px-4 py-2` creates a blue button
- **Responsive design** built-in with prefixes like `md:` for medium screens
- Smaller final CSS file because unused styles are removed

## Project Structure

### File Organization
```
src/
  App.jsx       - Main component with all functionality
  main.jsx      - Entry point that renders App
  index.css     - Global styles (just Tailwind imports)
public/         - Static files served directly
package.json    - Project configuration and dependencies
```

## Key Concepts

### Components
- Functions that return JSX (HTML-like code)
- Can accept **props** (data passed from parent components)
- Can have internal **state** (data that can change)

### State Management
- **useState** hook stores data that can change (habits array, input value)
- When state changes, React automatically re-renders the UI
- **useEffect** hook runs code when component mounts or state changes

### Event Handling
- Functions that respond to user actions (clicks, typing, etc.)
- Example: `onClick={() => addHabit()}` runs addHabit when button is clicked

### Local Storage
- Browser API that saves data locally (persists after page refresh)
- `localStorage.setItem()` saves data as strings
- `JSON.stringify()` converts JavaScript objects to strings for storage

## Why These Choices?

### React + Vite
- **Fast development** with instant updates
- **Component-based** architecture scales well
- **Large ecosystem** with many available packages
- **Modern JavaScript** features supported

### Tailwind CSS
- **Rapid prototyping** - no need to write custom CSS
- **Consistent design** - pre-defined spacing, colors, etc.
- **Responsive by default** - mobile-first approach
- **Small production bundle** - unused styles are removed

### Local Storage
- **No backend required** - perfect for static sites
- **Instant data persistence** - no network delays
- **Works offline** - app functions without internet
- **Simple implementation** - no database setup needed

## Development Workflow

### Development Mode
- `npm run dev` starts development server
- Changes auto-refresh in browser
- Error messages show in browser console

### Production Build
- `npm run build` creates optimized files
- Minifies code for faster loading
- Can be deployed to any static hosting service

## Learning Resources

- **React**: Official React docs (react.dev)
- **Tailwind**: Official docs (tailwindcss.com)
- **JavaScript**: MDN Web Docs (developer.mozilla.org)
- **Vite**: Official docs (vitejs.dev)

---
*This document will be updated as the project evolves. Ask follow-up questions about any concept!*