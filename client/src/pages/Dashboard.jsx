import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import TaskList from "../components/TaskList";
import AddTask from "../components/AddTask";

export default function Dashboard() {
  const { isAuthenticated, user, isLoading } = useAuth0();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [userId, setUserId] = useState(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch user ID from database when user authenticates
  useEffect(() => {
    if (isAuthenticated && user?.sub) {
      fetchUserId();
    }
  }, [isAuthenticated, user?.sub]);

  // Fetch tasks when userId is available
  useEffect(() => {
    if (userId) {
      fetchUserTasks();
    }
  }, [userId]);

  const fetchUserId = async () => {
    try {
      const response = await fetch(`/api/users/auth0/${user.sub}`);
      if (response.ok) {
        const data = await response.json();
        setUserId(data.user.id);
      } else {
        console.error("User not found in database");
        setError("User not found. Please refresh the page.");
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      setError("Error loading user data");
    }
  };

  const fetchUserTasks = async () => {
    try {
      setTasksLoading(true);
      const response = await fetch(`/api/tasks/user/${userId}`);
      if (response.ok) {
        const data = await response.json();
        // Map database tasks to frontend format
        const formattedTasks = data.tasks.map(task => ({
          id: task.id,
          title: task.title,
          status: task.status || "Todo",
          assignedTo: "You",
          description: task.description,
          due_date: task.due_date
        }));
        setTasks(formattedTasks);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setError("Error loading tasks");
    } finally {
      setTasksLoading(false);
    }
  };

  // ➕ Add task to database
  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    if (!userId) {
      setError("User ID not available. Please refresh the page.");
      return;
    }

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          title: newTask,
          description: "",
          status: "pending"
        })
      });

      if (response.ok) {
        const data = await response.json();
        const task = data.task;
        
        // Add to local state
        setTasks([...tasks, {
          id: task.id,
          title: task.title,
          status: task.status || "Todo",
          assignedTo: "You",
          description: task.description
        }]);
        setNewTask("");
        setError("");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Error creating task");
      }
    } catch (error) {
      console.error("Error adding task:", error);
      setError("Error creating task");
    }
  };

  // ❌ Delete task from database
  const handleDeleteTask = async (id) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "DELETE"
      });

      if (response.ok) {
        setTasks(tasks.filter(task => task.id !== id));
        setError("");
      } else {
        setError("Error deleting task");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      setError("Error deleting task");
    }
  };

  // 🔄 Update task status in database
  const handleStatusChange = async (id, newStatus) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus
        })
      });

      if (response.ok) {
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === id ? { ...task, status: newStatus } : task
          )
        );
        setError("");
      } else {
        setError("Error updating task");
      }
    } catch (error) {
      console.error("Error updating task:", error);
      setError("Error updating task");
    }
  };

  // 👤 Assign user (for now, just update local state as backend doesn't have assignment field)
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

      {error && (
        <div style={{ color: "red", marginBottom: "10px", padding: "10px", backgroundColor: "#ffe0e0", borderRadius: "5px" }}>
          {error}
        </div>
      )}

      {!isAuthenticated && (
        <p>Please log in using the button in the top right.</p>
      )}

      {isAuthenticated && (
        <>
          <h2>Welcome {user?.email}</h2>

          {tasksLoading ? (
            <p>Loading tasks...</p>
          ) : (
            <>
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
        </>
      )}
    </div>
  );
}