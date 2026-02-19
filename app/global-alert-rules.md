# Global Alert Rules

- Use the global alert system for cross-page success, warning, error, and info messages.
- Access it via the `useAlert` hook from `src/contexts/AlertContext.tsx`.
- Call `showAlert({ type, title?, message, durationMs? })` to display an alert.
- Supported `type` values: `success`, `warning`, `error`, `info`.
- Alerts appear in the top-right corner with a blurred background shader.
- Prefer short, action-focused messages and optional concise titles.
- Avoid using alerts for long-form content; use dialogs or dedicated pages instead.
