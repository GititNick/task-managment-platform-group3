import { useAuth0 } from "@auth0/auth0-react";
import { useState } from "react";
import TaskList from "../components/TaskList";
import AddTask from "../components/AddTask";

export default function Dashboard() {
  const { loginWithRedirect, logout, isAuthenticated, user, isLoading } = useAuth0();

  const [tasks, setTasks] = useState([
    { id: 1, title: "Finish Auth setup", status: "Done" },
    { id: 2, title: "Build dashboard UI", status: "In Progress" }
  ]);

  const [newTask, setNewTask] = useState("");

  const handleAddTask = () => {
    if (!newTask.trim()) return;

    const task = {
      id: Date.now(),
      title: newTask,
      status: "Todo"
    };

    setTasks([...tasks, task]);
    setNewTask("");
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>Task Management Dashboard</h1>

      {!isAuthenticated ? (
        <button onClick={() => loginWithRedirect()}>Log In</button>
      ) : (
        <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
          Log Out
        </button>
      )}

      <hr />

      {isAuthenticated && (
        <>
          <h2>Welcome {user.email}</h2>

          <AddTask
            newTask={newTask}
            setNewTask={setNewTask}
            handleAddTask={handleAddTask}
          />

          <TaskList tasks={tasks} />
        </>
      )}
    </div>
  );
}