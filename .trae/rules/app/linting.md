---
alwaysApply: false
applyMode: intelligence
description: Linting tools, ignored directories, and coding standards for the frontend app.
---
# Linting & Coding Standards

This document defines the linting rules and coding standards for the Pyramid Solver project.

## 1. Linting Tool
- We use **ESLint** (v9+) with **Flat Config** (`eslint.config.js`).
- The linting command is: `npm run lint`.
- CI/CD pipelines enforce this check.

## 2. Configuration Rules
### Base Configuration
- **React**: Uses `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`.
- **Files**: Currently targets `**/*.{js,jsx}` (See "Future Improvements").

### Ignored Directories
Build artifacts and generated files must be ignored:
- `dist/` (Production build)
- `dev-dist/` (Service Worker / PWA generation)
- `mcp-gateway/dist/` (Gateway build)

## 3. Coding Standards
### General
- **Zero Errors**: The codebase must be free of linting errors.
- **Unused Variables**: Must be removed or prefixed with `_` (e.g., `_unusedVar`).
- **No Console Logs**: Avoid `console.log` in production code (use a logger service).

### React
- **Hooks**: Must follow the [Rules of Hooks](https://reactjs.org/docs/hooks-rules.html).
- **Dependencies**: Effects must declare all dependencies (`exhaustive-deps`).

## 4. Maintenance
- When adding new generated directories, update `eslint.config.js` in the `globalIgnores` section.
- Run `npm run lint` locally before pushing changes.

## 5. Future Improvements
- **TypeScript Linting**: Currently, the ESLint config only targets JS files. We should install `typescript-eslint` and update the config to lint `**/*.{ts,tsx}` files to fully leverage TypeScript safety.
