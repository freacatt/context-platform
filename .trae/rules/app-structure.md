---
alwaysApply: true
---
# App Structure & Requirements

This document defines the mandatory structure and requirements for all "Apps" within the platform. An "App" corresponds to a major domain section visible in the Workspace Dashboard (e.g., Pyramid Solver, Product Definition, Technical Architecture).

**Important Note**: This document (`app-structure.md`) defines the **general architecture and minimum requirements** applicable to ALL apps. The specific architecture, added features, and unique rules for each individual app are documented in their respective files within the `.trae/rules/apps/` directory (e.g., `.trae/rules/apps/product-definition.md`). AI-specific apps (like AI Assistant) have their configuration documented under `.trae/rules/apps/ai_apps/`.

## 1. Dashboard Integration
- **Workspace Card**: Every App must have a dedicated card component displayed on the main Workspace Dashboard.
- **Category Metadata**: Each App must declare a `category` in its rule file frontmatter (`.trae/rules/apps/*.md`). The Dashboard groups app cards by this category using simple section titles and dividers.
 
## 2. App Page Requirements
The main page for the App must include:
- **CRUD Operations**:
  - **Create**: A button to create new objects, opening a modal form.
  - **Rename**: Ability to rename existing objects.
  - **Delete**: A secure delete mechanism where the user **must type the name of the object** to confirm deletion.
- **Search**:
  - A search bar or functionality to filter/find objects within the App page.
 
## 3. Global Context Integration
- **Context Category**: The App's domain objects must be registered as a distinct category in the Global Context.
- **Context Usage**: Objects from this App must be selectable and usable within the Global Context (e.g., for AI context or cross-referencing).

## 4. Documentation Maintenance
- **Updates on Need**: If a user prompt requests changes to an App's **logic** or **data structure**, update the corresponding rule file in `.trae/rules/apps/` to reflect these changes.
- **Consistency**: Ensure that the documentation (especially data structures and logic descriptions) stays in sync with the actual code.

## 5. Visual Identity & Colors
- **Canonical Color**: Each App must have a canonical color used as its visual indicator across the UI (dashboard card icon, accent bar, primary actions).
- **Documentation**: This color must be recorded in the App's rule file frontmatter as `primaryColorClass`, using a Tailwind utility class (e.g., `"bg-indigo-600"`).
- **Usage**: Dashboard cards and related UI elements (such as blurred buttons) should use this color or low-opacity variants of it to keep the App's identity consistent.

## Summary of "Must-Haves"
| Feature | Requirement |
| :--- | :--- |
| **Dashboard** | Dedicated Card |
| **Creation** | Modal-based |
| **Deletion** | Requires typing object name |
| **Renaming** | Supported |
| **Local Search** | Filter objects in App Page |
| **Global Context** | Registered as Category & Usable |
| **Documentation** | Update .trae/rules/apps/ on change if need to change (AI apps under .trae/rules/apps/ai_apps/) |
| **Category** | Declared in app rule frontmatter; used for Dashboard grouping |
| **Color Indicator** | Each App defines a canonical color in its rule file and uses it consistently in dashboard UI |

Any additional features are specific to the App, but these base requirements are mandatory for consistency. Refer to the specific app rule file in `.trae/rules/apps/` for detailed implementation guidelines.
