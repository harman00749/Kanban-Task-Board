import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import './App.css'

const STORAGE_KEY = 'kanban-task-board-state'

const COLUMNS = [
  { id: 'todo', title: 'To Do', hint: 'Ideas and incoming work' },
  { id: 'progress', title: 'In Progress', hint: 'Active tasks' },
  { id: 'done', title: 'Done', hint: 'Completed work' },
]

const EMPTY_BOARD = {
  todo: [],
  progress: [],
  done: [],
}

const SAMPLE_BOARD = {
  todo: [
    {
      id: 'task-1',
      title: 'Create task board layout',
      priority: 'High',
      createdAt: Date.now() - 3000,
    },
    {
      id: 'task-2',
      title: 'Add localStorage persistence',
      priority: 'Medium',
      createdAt: Date.now() - 2000,
    },
  ],
  progress: [
    {
      id: 'task-3',
      title: 'Wire up drag and drop',
      priority: 'High',
      createdAt: Date.now() - 1000,
    },
  ],
  done: [
    {
      id: 'task-4',
      title: 'Set up Vite React project',
      priority: 'Low',
      createdAt: Date.now(),
    },
  ],
}

const priorityOptions = ['High', 'Medium', 'Low']

function loadBoard() {
  try {
    const savedBoard = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (!savedBoard) {
      return SAMPLE_BOARD
    }

    return COLUMNS.reduce((board, column) => {
      board[column.id] = Array.isArray(savedBoard[column.id])
        ? savedBoard[column.id]
        : []
      return board
    }, {})
  } catch {
    return SAMPLE_BOARD
  }
}

function createTask(title, priority) {
  return {
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `task-${Date.now()}`,
    title,
    priority,
    createdAt: Date.now(),
  }
}

function findColumnByTask(board, taskId) {
  return COLUMNS.find((column) =>
    board[column.id].some((task) => task.id === taskId),
  )?.id
}

function getTaskById(board, taskId) {
  for (const column of COLUMNS) {
    const task = board[column.id].find((item) => item.id === taskId)
    if (task) {
      return task
    }
  }
  return null
}

function App() {
  const [board, setBoard] = useState(loadBoard)
  const [taskText, setTaskText] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [searchTerm, setSearchTerm] = useState('')
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [activeTaskId, setActiveTaskId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(board))
  }, [board])

  const activeTask = activeTaskId ? getTaskById(board, activeTaskId) : null

  const filteredBoard = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) {
      return board
    }

    return COLUMNS.reduce((filtered, column) => {
      filtered[column.id] = board[column.id].filter((task) =>
        task.title.toLowerCase().includes(query),
      )
      return filtered
    }, {})
  }, [board, searchTerm])

  const taskCounts = COLUMNS.reduce((total, column) => {
    total[column.id] = board[column.id].length
    return total
  }, {})

  function handleAddTask(event) {
    event.preventDefault()
    const title = taskText.trim()
    if (!title) {
      return
    }

    setBoard((currentBoard) => ({
      ...currentBoard,
      todo: [createTask(title, priority), ...currentBoard.todo],
    }))
    setTaskText('')
    setPriority('Medium')
  }

  function deleteTask(taskId) {
    setBoard((currentBoard) =>
      COLUMNS.reduce((updatedBoard, column) => {
        updatedBoard[column.id] = currentBoard[column.id].filter(
          (task) => task.id !== taskId,
        )
        return updatedBoard
      }, {}),
    )
  }

  function updateTaskTitle(taskId, title) {
    const nextTitle = title.trim()
    if (!nextTitle) {
      deleteTask(taskId)
      return
    }

    setBoard((currentBoard) =>
      COLUMNS.reduce((updatedBoard, column) => {
        updatedBoard[column.id] = currentBoard[column.id].map((task) =>
          task.id === taskId ? { ...task, title: nextTitle } : task,
        )
        return updatedBoard
      }, {}),
    )
  }

  function moveTask(taskId, direction) {
    setBoard((currentBoard) => {
      const fromColumn = findColumnByTask(currentBoard, taskId)
      if (!fromColumn) {
        return currentBoard
      }

      const fromIndex = COLUMNS.findIndex((column) => column.id === fromColumn)
      const targetIndex = fromIndex + direction
      const targetColumn = COLUMNS[targetIndex]?.id
      if (!targetColumn) {
        return currentBoard
      }

      const task = currentBoard[fromColumn].find((item) => item.id === taskId)
      return {
        ...currentBoard,
        [fromColumn]: currentBoard[fromColumn].filter(
          (item) => item.id !== taskId,
        ),
        [targetColumn]: [task, ...currentBoard[targetColumn]],
      }
    })
  }

  function clearBoard() {
    setBoard(EMPTY_BOARD)
    setEditingTaskId(null)
  }

  function handleDragStart(event) {
    setActiveTaskId(event.active.id)
  }

  function handleDragEnd(event) {
    const { active, over } = event
    setActiveTaskId(null)

    if (!over) {
      return
    }

    setBoard((currentBoard) => {
      const activeColumn = findColumnByTask(currentBoard, active.id)
      const overColumn = COLUMNS.some((column) => column.id === over.id)
        ? over.id
        : findColumnByTask(currentBoard, over.id)

      if (!activeColumn || !overColumn) {
        return currentBoard
      }

      if (activeColumn === overColumn) {
        const activeIndex = currentBoard[activeColumn].findIndex(
          (task) => task.id === active.id,
        )
        const overIndex = currentBoard[overColumn].findIndex(
          (task) => task.id === over.id,
        )

        if (activeIndex === overIndex || overIndex === -1) {
          return currentBoard
        }

        return {
          ...currentBoard,
          [activeColumn]: arrayMove(
            currentBoard[activeColumn],
            activeIndex,
            overIndex,
          ),
        }
      }

      const movingTask = currentBoard[activeColumn].find(
        (task) => task.id === active.id,
      )
      const targetIndex = currentBoard[overColumn].findIndex(
        (task) => task.id === over.id,
      )
      const nextTargetTasks = [...currentBoard[overColumn]]
      nextTargetTasks.splice(
        targetIndex === -1 ? nextTargetTasks.length : targetIndex,
        0,
        movingTask,
      )

      return {
        ...currentBoard,
        [activeColumn]: currentBoard[activeColumn].filter(
          (task) => task.id !== active.id,
        ),
        [overColumn]: nextTargetTasks,
      }
    })
  }

  return (
    <main className="app-shell">
      <section className="topbar" aria-labelledby="app-title">
        <div>
          <p className="eyebrow">React + Vite Kanban Board</p>
          <h1 id="app-title">Task Management Board</h1>
        </div>
        <div className="metrics" aria-label="Board task counts">
          {COLUMNS.map((column) => (
            <span key={column.id}>
              {column.title}: <strong>{taskCounts[column.id]}</strong>
            </span>
          ))}
        </div>
      </section>

      <section className="controls" aria-label="Task controls">
        <form className="task-form" onSubmit={handleAddTask}>
          <label className="task-input">
            <span>New Task</span>
            <input
              value={taskText}
              onChange={(event) => setTaskText(event.target.value)}
              placeholder="Write a task and press Add"
              type="text"
            />
          </label>

          <label>
            <span>Priority</span>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
            >
              {priorityOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <button type="submit">Add Task</button>
        </form>

        <div className="filter-panel">
          <label>
            <span>Search Tasks</span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Filter by task name"
              type="search"
            />
          </label>
          <button className="ghost-button" type="button" onClick={clearBoard}>
            Clear Board
          </button>
        </div>
      </section>

      <DndContext
        collisionDetection={closestCorners}
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <section className="board" aria-label="Kanban task columns">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={filteredBoard[column.id]}
              fullTaskCount={board[column.id].length}
              editingTaskId={editingTaskId}
              onDelete={deleteTask}
              onEditStart={setEditingTaskId}
              onEditSave={updateTaskTitle}
              onEditCancel={() => setEditingTaskId(null)}
              onMove={moveTask}
            />
          ))}
        </section>

        <DragOverlay>
          {activeTask ? <TaskPreview task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>
    </main>
  )
}

function KanbanColumn({
  column,
  tasks,
  fullTaskCount,
  editingTaskId,
  onDelete,
  onEditStart,
  onEditSave,
  onEditCancel,
  onMove,
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <article
      className={`column ${isOver ? 'is-over' : ''}`}
      ref={setNodeRef}
      aria-label={`${column.title} column`}
    >
      <header className="column-header">
        <div>
          <h2>{column.title}</h2>
          <p>{column.hint}</p>
        </div>
        <span>{fullTaskCount}</span>
      </header>

      <SortableContext
        items={tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="task-list">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              columnId={column.id}
              isEditing={editingTaskId === task.id}
              onDelete={onDelete}
              onEditStart={onEditStart}
              onEditSave={onEditSave}
              onEditCancel={onEditCancel}
              onMove={onMove}
            />
          ))}

          {tasks.length === 0 ? (
            <div className="empty-state">No tasks match this column.</div>
          ) : null}
        </div>
      </SortableContext>
    </article>
  )
}

function TaskCard({
  task,
  columnId,
  isEditing,
  onDelete,
  onEditStart,
  onEditSave,
  onEditCancel,
  onMove,
}) {
  const [draftTitle, setDraftTitle] = useState(task.title)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: isEditing })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  function submitEdit(event) {
    event.preventDefault()
    onEditSave(task.id, draftTitle)
    onEditCancel()
  }

  function startEdit() {
    setDraftTitle(task.title)
    onEditStart(task.id)
  }

  function cancelEdit() {
    setDraftTitle(task.title)
    onEditCancel()
  }

  return (
    <article
      className={`task-card priority-${task.priority.toLowerCase()} ${
        isDragging ? 'is-dragging' : ''
      }`}
      ref={setNodeRef}
      style={style}
    >
      <div
        className="drag-handle"
        {...attributes}
        {...listeners}
        aria-label={`Drag ${task.title}`}
        title="Drag task"
      >
        <span></span>
        <span></span>
        <span></span>
      </div>

      <div className="card-content">
        <div className="priority-row">
          <span className="priority-pill">{task.priority}</span>
          <button
            className="icon-button"
            type="button"
            onClick={() => onDelete(task.id)}
            aria-label={`Delete ${task.title}`}
            title="Delete task"
          >
            x
          </button>
        </div>

        {isEditing ? (
          <form className="edit-form" onSubmit={submitEdit}>
            <input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              autoFocus
            />
            <div className="edit-actions">
              <button type="submit">Save</button>
              <button
                className="ghost-button"
                type="button"
                onClick={cancelEdit}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            className="task-title"
            type="button"
            onClick={startEdit}
          >
            {task.title}
          </button>
        )}

        <div className="move-actions" aria-label="Move task controls">
          <button
            className="ghost-button"
            type="button"
            disabled={columnId === 'todo'}
            onClick={() => onMove(task.id, -1)}
          >
            Previous
          </button>
          <button
            className="ghost-button"
            type="button"
            disabled={columnId === 'done'}
            onClick={() => onMove(task.id, 1)}
          >
            Next
          </button>
        </div>
      </div>
    </article>
  )
}

function TaskPreview({ task }) {
  return (
    <article
      className={`task-card task-preview priority-${task.priority.toLowerCase()}`}
    >
      <div className="drag-handle" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div className="card-content">
        <div className="priority-row">
          <span className="priority-pill">{task.priority}</span>
        </div>
        <p className="preview-title">{task.title}</p>
      </div>
    </article>
  )
}

export default App
