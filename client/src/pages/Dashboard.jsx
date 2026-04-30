import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import TaskList from "../components/TaskList";
import AddTask from "../components/AddTask";
import AISuggestions from "../components/AISuggestions";
import { apiUrl } from "../api";

/** POST /api/auth/sync-user — returns numeric DB user id (throws on failure). */
async function syncAuth0UserToDb(user) {
  if (!user?.sub) {
    throw new Error("Not signed in");
  }
  const email =
    user.email ||
    `auth0-${user.sub.replace(/[^a-zA-Z0-9]/g, "_")}@placeholder.local`;
  const response = await fetch(apiUrl("/api/auth/sync-user"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth0_id: user.sub,
      name: user.name || user.nickname || "User",
      email,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data.error ||
        "Could not sync user. Is the backend running (e.g. port 3001)?"
    );
  }
  if (data.user?.id == null) {
    throw new Error("Invalid response from server while syncing user.");
  }
  return data.user.id;
}

export default function Dashboard() {
  const { isAuthenticated, user, isLoading } = useAuth0();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [userId, setUserId] = useState(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [userSyncPending, setUserSyncPending] = useState(false);
  const [error, setError] = useState("");
  const userIdRef = useRef(null);
  userIdRef.current = userId;

  // useEffect runs after paint; flip this in layout so we never flash "profile could not be loaded" before sync starts.
  useLayoutEffect(() => {
    if (isAuthenticated && user?.sub) {
      setUserSyncPending(true);
    }
  }, [isAuthenticated, user?.sub]);

  // Create or update the DB user (same as App); keep userSyncPending so we do not show task UI before id exists.
  useEffect(() => {
    if (!isAuthenticated || !user?.sub) {
      setUserId(null);
      setUserSyncPending(false);
      return;
    }

    let cancelled = false;
    setUserSyncPending(true);

    (async () => {
      try {
        const id = await syncAuth0UserToDb(user);
        if (cancelled) return;
        setUserId(id);
        setError("");
      } catch (err) {
        if (!cancelled) {
          console.error("Error syncing user:", err);
          setError(
            err.message ||
              "Error loading user. Use the Vite dev server so /api is proxied to the backend."
          );
        }
      } finally {
        if (!cancelled) {
          setUserSyncPending(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    user?.sub,
    user?.email,
    user?.name,
    user?.nickname,
  ]);

  // Fetch tasks when userId is available
  useEffect(() => {
    if (userId) {
      fetchUserTasks();
    }
  }, [userId]);

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

  /** Ensures DB user id exists (handles click before initial sync finishes). */
  const resolveUserId = async () => {
    if (userIdRef.current != null) return userIdRef.current;
    if (!user) {
      setError("Not signed in.");
      return null;
    }
    try {
      const id = await syncAuth0UserToDb(user);
      setUserId(id);
      setError("");
      return id;
    } catch (err) {
      setError(err.message || "Could not load your account.");
      return null;
    }
  };

  // ➕ Add task to database
  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    const uid = await resolveUserId();
    if (uid == null) return;

    try {
      const response = await fetch(apiUrl("/api/tasks"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: uid,
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
    const uid = await resolveUserId();
    if (uid == null) return false;

    try {
      const response = await fetch(apiUrl("/api/tasks"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: uid,
          title: suggestion,
          description: "",
          status: "pending"
        })
      });

      if (response.ok) {
        const data = await response.json();
        const task = data.task;

        setTasks((prev) => [
          ...prev,
          {
            id: task.id,
            title: task.title,
            status: task.status || "Todo",
            assignedTo: "You",
            description: task.description
          }
        ]);
        setError("");
        return true;
      }
      const errorData = await response.json();
      setError(errorData.error || "Error creating task");
      return false;
    } catch (error) {
      console.error("Error adding task:", error);
      setError("Error creating task");
      return false;
    }
  };

  const handleAddSuggestions = async (suggestionsList) => {
    const uid = await resolveUserId();
    if (uid == null) return false;
    if (!suggestionsList.length) return true;

    const added = [];
    try {
      for (const title of suggestionsList) {
        const response = await fetch(apiUrl("/api/tasks"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: uid,
            title,
            description: "",
            status: "pending"
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.error || "Error creating task");
          if (added.length) {
            setTasks((prev) => [...prev, ...added]);
          }
          return false;
        }

        const data = await response.json();
        const task = data.task;
        added.push({
          id: task.id,
          title: task.title,
          status: task.status || "Todo",
          assignedTo: "You",
          description: task.description
        });
      }

      setTasks((prev) => [...prev, ...added]);
      setError("");
      return true;
    } catch (error) {
      console.error("Error adding tasks:", error);
      setError("Error creating task");
      if (added.length) {
        setTasks((prev) => [...prev, ...added]);
      }
      return false;
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

          {userSyncPending && userId == null ? (
            <p style={{ color: "#555" }}>Connecting your account…</p>
          ) : tasksLoading ? (
            <p>Loading tasks...</p>
          ) : userId == null ? (
            <p style={{ color: "#555" }}>
              Your profile could not be loaded. Fix the issue shown above, then
              refresh the page.
            </p>
          ) : (
            <>
              <AddTask
                newTask={newTask}
                setNewTask={setNewTask}
                handleAddTask={handleAddTask}
              />

              <AISuggestions
                onAddSuggestion={handleAddSuggestion}
                onAddSuggestions={handleAddSuggestions}
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