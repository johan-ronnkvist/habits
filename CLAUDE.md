# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a health tracker application called "habits" that stores user data in Google Cloud/Drive storage buckets. The application tracks daily health data including food, exercise, and other health-related metrics in a simple, readable format.

## Development Environment

- **Python Version**: Requires Python >=3.12
- **Package Manager**: Uses `uv` for dependency management
- **Framework**: FastAPI with Pydantic for data validation

## Common Commands

### Setup and Installation
```bash
# Install dependencies
uv sync

# Install development dependencies
uv sync --group dev
```

### Code Quality and Testing
```bash
# Run linting
uv run ruff check .
uv run ruff format .

# Run type checking
uv run mypy .

# Run tests
uv run pytest

# Run tests with async support
uv run pytest --asyncio-mode=auto
```

### Running the Application
```bash
# Run main application
uv run python main.py

# For FastAPI development server (when implemented)
uv run fastapi dev main.py
```

## Architecture Notes

- **Data Storage**: Integrates with Google Cloud/Drive for secure, private user data storage
- **Data Structure**: Daily-based health tracking with simple, human-readable format
- **Web Framework**: Built on FastAPI for API endpoints
- **Validation**: Uses Pydantic for data modeling and validation

## Development Dependencies

- **Linting**: ruff for code formatting and linting
- **Type Checking**: mypy for static type analysis  
- **Testing**: pytest with asyncio support for async testing
- **Build**: hatchling for package building