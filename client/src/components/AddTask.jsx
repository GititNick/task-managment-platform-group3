export default function AddTask({
  newTask,
  setNewTask,
  handleAddTask
}) {
  return (
    <div style={{ margin: "20px 0", display: "flex", gap: "10px" }}>
      <input
        type="text"
        placeholder="Enter new task..."
        value={newTask}
        onChange={(e) => setNewTask(e.target.value)}
        style={{
          padding: "10px",
          borderRadius: "6px",
          border: "1px solid var(--border)",
          flex: 1
        }}
      />

      <button
        onClick={handleAddTask}
        style={{
          backgroundColor: "var(--primary)",
          color: "white",
          border: "none",
          padding: "10px 14px",
          borderRadius: "6px"
        }}
      >
        Add Task
      </button>
    </div>
  );
}