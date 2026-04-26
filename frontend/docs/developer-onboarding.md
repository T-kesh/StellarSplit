# StellarSplit Frontend — Developer Onboarding Guide

This document is a deep-dive reference for developers contributing to the
StellarSplit frontend. It goes beyond the README to cover architecture
decisions, patterns, and workflows used across the codebase.

---

## Tech Stack

| Technology            | Purpose                           |
| --------------------- | --------------------------------- |
| React 18              | UI framework                      |
| Vite                  | Build tool and dev server         |
| TypeScript            | Type safety across all components |
| React Router v6       | Client-side routing               |
| Axios                 | HTTP client for API calls         |
| Vitest                | Unit and component testing        |
| React Testing Library | Component interaction testing     |
| WalletConnect         | Crypto wallet integration         |
| Prettier + ESLint     | Code formatting and linting       |

---

## Architecture Overview

StellarSplit's frontend follows a **feature-adjacent** structure where
components, hooks, and services are organised by shared domain rather than
strict feature folders. This keeps related files close without forcing deep
nesting.
