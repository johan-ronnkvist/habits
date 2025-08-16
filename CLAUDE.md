# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the "better-habits" project - a habit tracking application built as a static site. The app allows users to create, track, and manage daily habits with completion status.

## Technology Stack

- **Frontend**: React 18 with Vite
- **Styling**: Tailwind CSS
- **Data Storage**: Local Storage (browser-based persistence)
- **Build Tool**: Vite
- **Package Manager**: npm

## Development Setup

### Prerequisites
- Node.js (latest LTS recommended)
- npm

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Architecture Notes

- **State Management**: React useState for local component state
- **Data Persistence**: IndexedDB for habit data
- **Styling**: Utility-first CSS with Tailwind
- **Component Structure**: Single App component with inline logic (suitable for this simple app)

## Features

- Add new habits
- Mark habits as complete/incomplete for the day
- Delete habits
- Persistent storage across browser sessions
- Responsive design for mobile and desktop

## Common Commands

- `npm install` - Install dependencies
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## Notes for Claude Code

- This is a single-page application focused on simplicity and usability
- Data is stored locally - no backend required
- Follow React best practices and Tailwind utility classes
- Keep the UI clean and mobile-responsive
- Maintain the minimal, focused feature set

## Learning Instructions
- User is new to frontend development and wants to learn
- Provide technical explanations with basic concepts explained
- Be brief initially, user will ask follow-up questions
- Reference TECHNICAL_OVERVIEW.md for key concepts and choices
- Explain rationale behind technical decisions
- before attempting to start the dev server, check if it's already running. It's common for developers to have the server running dev mode from a separate terminal