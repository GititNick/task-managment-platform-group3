export default function TaskCard({
  task,
  onDelete,
  onStatusChange,
  onAssignChange
}) {
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
      <h4>{task.title}</h4>

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
    </div>
  );
}