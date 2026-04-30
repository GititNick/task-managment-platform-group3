export default function AddTask({
  newTask,
  setNewTask,
  handleAddTask,
  disabled = false,
}) {
  const onInputKeyDown = (e) => {
    if (e.key === "Enter" && !disabled) {
      handleAddTask();
    }
  };

  return (
    <div style={{ margin: "20px 0", display: "flex", gap: "10px" }}>
      <input
        type="text"
        placeholder="Enter new task..."
        value={newTask}
        onChange={(e) => setNewTask(e.target.value)}
        onKeyDown={onInputKeyDown}
        disabled={disabled}
        style={{
          padding: "10px",
          borderRadius: "6px",
          border: "1px solid var(--border)",
          flex: 1,
          opacity: disabled ? 0.7 : 1,
        }}
      />

      <button
        type="button"
        onClick={() => handleAddTask()}
        disabled={disabled}
        style={{
          backgroundColor: "var(--primary)",
          color: "white",
          border: "none",
          padding: "10px 14px",
          borderRadius: "6px",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.7 : 1,
        }}
      >
        Add Task
      </button>
    </div>
  );
}
