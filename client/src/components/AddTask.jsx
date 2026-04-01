export default function AddTask({ newTask, setNewTask, handleAddTask }) {
  return (
    <div style={{ margin: "20px 0" }}>
      <input
        type="text"
        placeholder="Enter new task..."
        value={newTask}
        onChange={(e) => setNewTask(e.target.value)}
      />
      <button onClick={handleAddTask}>Add Task</button>
    </div>
  );
}