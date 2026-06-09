# Kanban Task Board Sprint Notes

# Sprint Scope

Build a Trello-style task management board using React and Vite.

# Implemented Requirements

- Project initialized with Vite React.
- Component-based board architecture.
- State-driven rendering through React `useState`.
- Three columns: To Do, In Progress, and Done.
- Add task form with priority dropdown.
- Universal delete action on every task card.
- Previous and Next move controls on every task card.
- Inline editing by clicking a task title.
- Priority styling:
  - High: red border.
  - Medium: yellow/orange border.
  - Low: green border.
- localStorage persistence.
- Drag-and-drop task movement through dnd-kit.
- Global real-time search filter.

# QA Demo Checklist

- Add a High priority task and confirm it appears in To Do.
- Move the task using Next and Previous controls.
- Drag a task from To Do to In Progress or Done.
- Click a task title, edit it, and save.
- Delete a task.
- Search for a task and confirm columns filter instantly.
- Refresh the browser and confirm tasks persist.
- Run `npm run build` before deployment.
