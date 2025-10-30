# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Orca Note plugin template project. Orca Note is a note-taking application that supports a plugin system for extending functionality. This template provides a minimal starting point for developing new plugins.

## Build and Development Commands

### Core Commands
- `npm run dev` - Start development server with Vite
- `npm run build` - Build plugin for production (TypeScript compilation + Vite build)
- `npm run preview` - Preview built plugin

### Build Process
The build process consists of:
1. TypeScript compilation with `NODE_ENV=production`
2. Vite bundling to create `dist/index.js` (ES module format)
3. External dependencies (React, Valtio) are treated as peer dependencies and not bundled

## Architecture

### Plugin System Structure
Orca Note plugins follow a specific lifecycle:
- **Loading Phase**: Plugin discovered but not enabled
- **Enable Phase**: `load()` function called - main initialization point
- **Disable Phase**: `unload()` function called - cleanup resources

### Entry Points
- `src/main.ts` - Main plugin entry with required `load()` and `unload()` exports
- Plugin name is determined by the folder name and passed to `load()` function

### Core Dependencies
- **React 18** (peer dependency) - UI components, available globally as `window.React`
- **Valtio** (peer dependency) - State management, available globally as `window.Valtio`
- **TypeScript** - Type safety and development experience

### Plugin API Structure
The global `orca` object provides access to all plugin functionality:
- `orca.state` - Application state (blocks, panels, settings, locale)
- `orca.commands` - Command registration and execution
- `orca.renderers` - Custom block and inline content renderers
- `orca.converters` - Format converters for block content
- `orca.toolbar` / `orca.headbar` - UI extension points
- `orca.plugins` - Plugin settings and data storage
- `orca.invokeBackend()` - Communication with Orca backend systems

### Key Data Models
- **Blocks**: Basic structural units with content, metadata, and hierarchical relationships
- **Panels**: UI organization units with different view types (journal, block)
- **Content Fragments**: Rich text representation with type-value pairs

### Internationalization
Built-in l10n support with:
- `src/libs/l10n.ts` - Translation utilities (`t()` function, `setupL10N()`)
- `src/translations/` - Translation files (currently has zhCN.ts)
- Uses `orca.state.locale` for current language detection

### Configuration Files
- `vite.config.ts` - Build configuration with React SWC plugin and external globals
- `tsconfig.json` - TypeScript configuration targeting ESNext with React JSX
- Plugin builds as ES module library with external React/Valtio dependencies

### Documentation
Comprehensive plugin documentation available in `plugin-docs/`:
- Quick Start guide with examples
- Core commands reference
- Backend API documentation
- Custom renderer development guide
- Type definitions and constants

## Development Notes

### Plugin Deployment
To deploy a plugin:
1. Build with `npm run build`
2. Ensure `dist/index.js` and `icon.png` exist in plugin folder
3. Place plugin folder in `orca/plugins` directory

### Naming Conventions
- Use plugin-specific prefixes for all identifiers (e.g., `myplugin.commandName`)
- Avoid names starting with `_` (reserved for system use)
- Use descriptive, consistent naming for commands, renderers, and settings

### State Management
Plugins can access and react to Orca's state through `orca.state` using Valtio's reactivity system. State changes can be monitored via Valtio's `subscribe` function.