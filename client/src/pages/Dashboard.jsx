import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import TaskList from "../components/TaskList";
import AddTask from "../components/AddTask";
import AISuggestions from "../components/AISuggestions";
import { apiUrl } from "../api";

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
      const response = await fetch(apiUrl(`/api/users/auth0/${user.sub}`));
      if (response.ok) {
        const data = await response.json();
        setUserId(data.user.id);
        setError("");
      } else {
        // If the user doesn't exist yet, create/sync them and continue.
        if (response.status === 404) {
          if (!user.email) {
            setError("Your Auth0 profile is missing an email. Enable the email scope/claim and try again.");
            return;
          }

          const syncResponse = await fetch(apiUrl("/api/auth/sync-user"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              auth0_id: user.sub,
              name: user.name || user.nickname || "User",
              email: user.email,
            }),
          });

          if (syncResponse.ok) {
            const syncData = await syncResponse.json();
            setUserId(syncData.user.id);
            setError("");
          } else {
            const syncError = await syncResponse.json();
            console.error("Sync failed:", syncError);
            setError(syncError.error || "Unable to sync user profile.");
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          console.error("User lookup failed:", errData);
          setError(errData.error || "Error loading user data");
        }
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      setError("Error loading user data");
    }
  };

  const fetchUserTasks = async () => {
    try {
      setTasksLoading(true);
      const response = await fetch(apiUrl(`/api/tasks/user/${userId}`));
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
      const response = await fetch(apiUrl("/api/tasks"), {
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
      const response = await fetch(apiUrl(`/api/tasks/${id}`), {
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
      const response = await fetch(apiUrl(`/api/tasks/${id}`), {
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

  // Add AI suggestion as a new task
  const handleAddSuggestion = async (suggestion) => {
    if (!userId) {
      setError("User ID not available. Please refresh the page.");
      return;
    }

    try {
      const response = await fetch(apiUrl("/api/tasks"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          title: suggestion,
          description: "",
          status: "pending"
        })
      });

      if (response.ok) {
        const data = await response.json();
        const task = data.task;
        
        // Add to local state
        setTasks(prevTasks => [...prevTasks, {
          id: task.id,
          title: task.title,
          status: task.status || "Todo",
          assignedTo: "You",
          description: task.description
        }]);
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

  const handleAddAllSuggestions = async (suggestions) => {
    if (!userId) {
      setError("User ID not available. Please refresh the page.");
      return;
    }

    try {
      const responses = await Promise.all(
        suggestions.map((suggestion) =>
          fetch(apiUrl("/api/tasks"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_id: userId,
              title: suggestion,
              description: "",
              status: "pending",
            }),
          })
        )
      );

      const failed = responses.filter((response) => !response.ok);
      if (failed.length > 0) {
        setError(`Added ${responses.length - failed.length} task(s); ${failed.length} failed.`);
      } else {
        setError("");
      }

      const successfulTasks = [];
      for (const response of responses) {
        if (!response.ok) continue;
        const data = await response.json();
        const task = data.task;
        successfulTasks.push({
          id: task.id,
          title: task.title,
          status: task.status || "Todo",
          assignedTo: "You",
          description: task.description,
          due_date: task.due_date,
        });
      }

      if (successfulTasks.length > 0) {
        setTasks((prevTasks) => [...prevTasks, ...successfulTasks]);
      }
    } catch (error) {
      console.error("Error adding suggested tasks:", error);
      setError("Error creating suggested tasks");
    }
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

              <AISuggestions
                onAddSuggestion={handleAddSuggestion}
                onAddAllSuggestions={handleAddAllSuggestions}
                userId={userId}
                tasks={tasks}
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
