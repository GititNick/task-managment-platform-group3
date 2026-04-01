export default function TaskCard({
  task,
  onDelete,
  onStatusChange,
  onAssignChange
}) {
  const getStatusColor = (status) => {
    if (status === "Todo") return "#3b82f6";
    if (status === "In Progress") return "#f59e0b";
    if (status === "Done") return "#10b981";
  };

  return (
    <div style={{
      border: "1px solid #ddd",
      padding: "15px",
      marginBottom: "10px",
      borderRadius: "10px",
      backgroundColor: "#f9fafb"
    }}>
      <h4>{task.title}</h4>

      {/* STATUS DROPDOWN */}
      <div style={{ marginBottom: "10px" }}>
        <label>Status: </label>
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value)}
          style={{ color: getStatusColor(task.status) }}
        >
          <option value="Todo">Todo</option>
          <option value="In Progress">In Progress</option>
          <option value="Done">Done</option>
        </select>
      </div>

      {/* ASSIGN DROPDOWN */}
      <div style={{ marginBottom: "10px" }}>
        <label>Assign: </label>
        <select
          value={task.assignedTo}
          onChange={(e) => onAssignChange(task.id, e.target.value)}
        >
          <option value="You">You</option>
          <option value="Teammate">Teammate</option>
          <option value="Team Lead">Team Lead</option>
        </select>
      </div>

      {/* DELETE BUTTON */}
      <button
        onClick={() => onDelete(task.id)}
        style={{
          backgroundColor: "#ef4444",
          color: "white",
          border: "none",
          padding: "6px 10px",
          borderRadius: "5px",
          cursor: "pointer"
        }}
      >
        Delete
      </button>
    </div>
  );
}