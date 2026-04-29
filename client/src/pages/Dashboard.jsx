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

  // UI ADDITION: background color picker
  const [bgColor, setBgColor] = useState("#0f172a");

  // search + filter
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("none");

  useEffect(() => {
    if (isAuthenticated && user?.sub) {
      fetchUserId();
    }
  }, [isAuthenticated, user?.sub]);

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
        setError("User not found. Please refresh the page.");
      }
    } catch (error) {
      setError("Error loading user data");
    }
  };

  const fetchUserTasks = async () => {
    try {
      setTasksLoading(true);
      const response = await fetch(`/api/tasks/user/${userId}`);
      if (response.ok) {
        const data = await response.json();
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
      setError("Error loading tasks");
    } finally {
      setTasksLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    if (!userId) {
      setError("User ID not available. Please refresh the page.");
      return;
    }

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      setError("Error creating task");
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "DELETE"
      });

      if (response.ok) {
        setTasks(tasks.filter(task => task.id !== id));
      } else {
        setError("Error deleting task");
      }
    } catch (error) {
      setError("Error deleting task");
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setTasks(prev =>
          prev.map(task =>
            task.id === id ? { ...task, status: newStatus } : task
          )
        );
      } else {
        setError("Error updating task");
      }
    } catch (error) {
      setError("Error updating task");
    }
  };

  const handleAssignChange = (id, userName) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === id ? { ...task, assignedTo: userName } : task
      )
    );
  };

  // FILTER LOGIC
  let filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (filterType === "alphabetical") {
    filteredTasks.sort((a, b) => a.title.localeCompare(b.title));
  }

  if (filterType === "status") {
    const statusOrder = { pending: 1, Todo: 2, completed: 3 };
    filteredTasks.sort(
      (a, b) =>
        (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99)
    );
  }

  if (isLoading) return <div>Loading...</div>;

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "30px",
        background: bgColor,
        color: "white",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <h1>Task Management Dashboard</h1>

        {/* 🎨 COLOR PICKER UI */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{ marginRight: "10px" }}>
            Pick Background Color:
          </label>
          <input
            type="color"
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
          />
        </div>

        <hr />

        {error && (
          <div style={{ color: "red", marginBottom: "10px" }}>
            {error}
          </div>
        )}

        {!isAuthenticated && <p>Please log in using the button.</p>}

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

                {/* SEARCH + FILTER UI */}
                <div style={{ margin: "10px 0" }}>
                  <input
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ marginRight: "10px", padding: "5px" }}
                  />

                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    style={{ padding: "5px" }}
                  >
                    <option value="none">No Filter</option>
                    <option value="alphabetical">A-Z</option>
                    <option value="status">Status</option>
                  </select>
                </div>

                <TaskList
                  tasks={filteredTasks}
                  onDelete={handleDeleteTask}
                  onStatusChange={handleStatusChange}
                  onAssignChange={handleAssignChange}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}