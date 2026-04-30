import { useState } from "react";

export default function TaskCard({
  task,
  onDelete,
  onStatusChange,
  onAssignChange,
  onAddSubtask
}) {
  const [subtaskTitle, setSubtaskTitle] = useState("");

  const handleAddSubtask = () => {
    if (!subtaskTitle.trim()) return;
    onAddSubtask(task.id, subtaskTitle);
    setSubtaskTitle("");
  };

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        padding: "15px",
        marginBottom: "10px",
        borderRadius: "10px",
        backgroundColor: "#111111"
      }}
    >
      <h4 style={{ marginTop: 0 }}>{task.title}</h4>

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
          backgroundColor: "#ef4444",
          color: "white",
          border: "none",
          padding: "6px 10px",
          borderRadius: "5px"
        }}
      >
        Delete
      </button>

      <div style={{ marginTop: "16px" }}>
        <h5 style={{ margin: "0 0 10px 0" }}>Subtasks</h5>

        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <input
            type="text"
            value={subtaskTitle}
            placeholder="Add a subtask..."
            onChange={(e) => setSubtaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAddSubtask();
              }
            }}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid #334155",
            }}
          />
          <button
            onClick={handleAddSubtask}
            style={{
              backgroundColor: "#0ea5e9",
              color: "white",
              border: "none",
              padding: "8px 12px",
              borderRadius: "6px"
            }}
          >
            Add Subtask
          </button>
        </div>

        {task.subtasks?.length > 0 ? (
          <div style={{ display: "grid", gap: "8px" }}>
            {task.subtasks.map((subtask) => (
              <div
                key={subtask.id}
                style={{
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  padding: "10px",
                  backgroundColor: "#171717"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                  <strong>{subtask.title}</strong>
                  <button
                    onClick={() => onDelete(subtask.id)}
                    style={{
                      backgroundColor: "#ef4444",
                      color: "white",
                      border: "none",
                      padding: "5px 8px",
                      borderRadius: "5px"
                    }}
                  >
                    Delete
                  </button>
                </div>

                <div style={{ marginTop: "8px" }}>
                  <label>Status: </label>
                  <select
                    value={subtask.status}
                    onChange={(e) => onStatusChange(subtask.id, e.target.value)}
                  >
                    <option value="Todo">Todo</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "#94a3b8", margin: 0 }}>No subtasks yet.</p>
        )}
      </div>
    </div>
  );
}
