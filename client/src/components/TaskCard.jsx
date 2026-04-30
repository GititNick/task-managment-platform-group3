import { useState } from "react";

export default function TaskCard({
  task,
  onDelete,
  onStatusChange,
  onAssignChange,
  onAddSubtask,
  isSubtask = false
}) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const submitSubtask = async () => {
    if (!newSubtaskTitle.trim() || !onAddSubtask) return;
    await onAddSubtask(task.id, newSubtaskTitle);
    setNewSubtaskTitle("");
  };

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        padding: "15px",
        marginBottom: "10px",
        borderRadius: "10px",
        backgroundColor: "var(--card)"
      }}
      >
      <h4 style={{ marginTop: 0 }}>
        {isSubtask ? "Subtask: " : ""}
        {task.title}
      </h4>

      <div style={{ marginBottom: "10px" }}>
        <label>Status: </label>
        <select
          value={task.status}
          onChange={(e) =>
            onStatusChange(task.id, e.target.value)
          }
        >
          <option value="Todo">Todo</option>
          <option value="In Progress">In Progress</option>
          <option value="Done">Done</option>
        </select>
      </div>

      <div style={{ marginBottom: "10px" }}>
        <label>Assign: </label>
        <select
          value={task.assignedTo}
          onChange={(e) =>
            onAssignChange(task.id, e.target.value)
          }
        >
          <option value="You">You</option>
          <option value="Teammate">Teammate</option>
          <option value="Team Lead">Team Lead</option>
        </select>
      </div>

      <button
        onClick={() => onDelete(task.id)}
        style={{
          backgroundColor: "var(--danger)",
          color: "white",
          border: "none",
          padding: "6px 10px",
          borderRadius: "5px"
        }}
      >
        Delete
      </button>

      {!isSubtask && (
        <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            placeholder="Add subtask..."
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid var(--border)"
            }}
          />
          <button
            type="button"
            onClick={submitSubtask}
            style={{
              backgroundColor: "var(--primary)",
              color: "white",
              border: "none",
              padding: "8px 10px",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            Add Subtask
          </button>
        </div>
      )}
    </div>
  );
}
