export default function AddTask({ newTask, setNewTask, handleAddTask }) {
  return (
    <div style={{ margin: "20px 0", display: "flex", gap: "10px" }}>
      <input
        type="text"
        placeholder="Enter new task..."
        value={newTask}
        onChange={(e) => setNewTask(e.target.value)}
        style={{
          padding: "8px",
          borderRadius: "5px",
          border: "1px solid #ccc",
          flex: 1
        }}
      />

      <button
        onClick={handleAddTask}
        style={{
          backgroundColor: "#22c55e",
          color: "white",
          border: "none",
          padding: "8px 12px",
          borderRadius: "5px",
          cursor: "pointer"
        }}
      >
        Add Task
      </button>
    </div>
  );
}