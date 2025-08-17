# Contributing to Better Habits

Thank you for considering contributing to Better Habits! This document provides guidelines for contributing to the project.

## Conventional Commits

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automatic versioning and changelog generation. Please follow this format for your commit messages:

### Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: A new feature for the user
- **fix**: A bug fix for the user
- **docs**: Documentation changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools and libraries
- **ci**: Changes to CI configuration files and scripts
- **build**: Changes that affect the build system or external dependencies
- **revert**: Reverting a previous commit

### Examples

```bash
# Feature (minor version bump)
feat: add dark mode toggle to settings page
feat(auth): implement Google Drive authentication
feat!: redesign navigation structure (BREAKING CHANGE)

# Bug fix (patch version bump)
fix: resolve habit completion state persistence issue
fix(sync): handle Google Drive API rate limiting

# Other types (patch version bump if applicable)
docs: update installation instructions in README
refactor: simplify habit state management logic
perf: optimize database queries for large datasets
chore: update dependencies to latest versions
```

### Version Bumping Rules

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes (`feat!:`, `fix!:`, or commit with `BREAKING CHANGE:` footer)
- **MINOR** (1.0.0 → 1.1.0): New features (`feat:`)
- **PATCH** (1.0.0 → 1.0.1): Bug fixes (`fix:`), performance improvements (`perf:`), refactoring (`refactor:`)
- **NO RELEASE**: Documentation (`docs:`), styles (`style:`), tests (`test:`), chores (`chore:`), CI (`ci:`), build (`build:`)

## Automatic Releases

When you merge a PR to the `main` branch:

1. **GitHub Actions** analyzes your commit messages
2. **Semantic Release** determines the next version number
3. **Package.json** is automatically updated
4. **GitHub Release** is created with generated changelog
5. **CHANGELOG.md** is updated with release notes

## Development Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature-name`
3. **Make** your changes following the code style
4. **Commit** using conventional commit format
5. **Push** to your fork: `git push origin feature/your-feature-name`
6. **Create** a Pull Request

## Code Style

- Follow existing React and JavaScript patterns
- Use Tailwind CSS for styling
- Write descriptive component and function names
- Add JSDoc comments for complex functions
- Ensure responsive design for mobile and desktop

## Testing

- Test your changes manually using `npm run dev`
- Ensure the build works: `npm run build`
- Check for linting errors: `npm run lint`

## Questions?

Feel free to open an issue if you have questions about contributing or need help with the conventional commit format.