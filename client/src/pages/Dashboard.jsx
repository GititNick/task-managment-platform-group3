import { useAuth0 } from "@auth0/auth0-react";
import { useState } from "react";
import TaskList from "../components/TaskList";
import AddTask from "../components/AddTask";

export default function Dashboard() {
  const { isAuthenticated, user, isLoading } = useAuth0();

  const [tasks, setTasks] = useState([
    { id: 1, title: "Finish Auth setup", status: "Todo", assignedTo: "You" },
    { id: 2, title: "Build dashboard UI", status: "In Progress", assignedTo: "Teammate" }
  ]);

  const [newTask, setNewTask] = useState("");

  // ➕ Add task
  const handleAddTask = () => {
    if (!newTask.trim()) return;

    const task = {
      id: Date.now(),
      title: newTask,
      status: "Todo",
      assignedTo: "You"
    };

    setTasks([...tasks, task]);
    setNewTask("");
  };

  // ❌ Delete
  const handleDeleteTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  // 🔄 Update status
  const handleStatusChange = (id, newStatus) => {
  setTasks(prevTasks =>
    prevTasks.map(task =>
      task.id === id ? { ...task, status: newStatus } : task
    )
  );
};

  // 👤 Assign user
  const handleAssignChange = (id, userName) => {
  setTasks(prevTasks =>
    prevTasks.map(task =>
      task.id === id ? { ...task, assignedTo: userName } : task
    )
  );
};

  if (isLoading) return <div>Loading...</div>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>Task Management Dashboard</h1>

      <hr />

      {!isAuthenticated && (
        <p>Please log in using the button in the top right.</p>
      )}

      {isAuthenticated && (
        <>
          <h2>Welcome {user?.email}</h2>

          <AddTask
            newTask={newTask}
            setNewTask={setNewTask}
            handleAddTask={handleAddTask}
          />

          <TaskList
            tasks={tasks}
            onDelete={handleDeleteTask}
            onStatusChange={handleStatusChange}
            onAssignChange={handleAssignChange}
          />
        </>
      )}
    </div>
  );
}