import { useMemo, useState } from "react";
import { apiUrl } from "../api";

const btnBase = {
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "4px",
  cursor: "pointer",
};

export default function AISuggestions({
  onAddSubtask,
  onAddTask,
  userId,
  tasks = [],
}) {
  const mainTasks = useMemo(
    () => tasks.filter((task) => task.parent_task_id == null),
    [tasks]
  );

  const [selectedTaskIds, setSelectedTaskIds] = useState(() => new Set());
  const [suggestionsByTask, setSuggestionsByTask] = useState([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [briefDescription, setBriefDescription] = useState("");

  const toggleTaskSelected = (taskId) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const taskCount = mainTasks.length;
  const selectedTaskCount = selectedTaskIds.size;

  const selectAllTasks = () => {
    setSelectedTaskIds(new Set(mainTasks.map((task) => task.id)));
  };

  const deselectAllTasks = () => {
    setSelectedTaskIds(new Set());
  };

  const clearSuggestions = () => {
    setSuggestionsByTask([]);
    setSelectedSuggestions(new Set());
    setError("");
  };

  const handleGenerateSubtasks = async () => {
    if (!userId) {
      setError("User not authenticated");
      return;
    }

    if (!selectedTaskIds.size) {
      setError("Select at least one main task first");
      return;
    }

    setLoading(true);
    setError("");
    setSuggestionsByTask([]);
    setSelectedSuggestions(new Set());

    try {
      const selectedTasks = mainTasks.filter((task) => selectedTaskIds.has(task.id));

      const results = [];
      for (const task of selectedTasks) {
        const response = await fetch(apiUrl("/api/ai/suggest-tasks"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: "analyze",
            userId,
            currentTaskId: task.id,
            tasks: tasks.map((t) => ({
              id: t.id,
              title: t.title,
              description: t.description,
              status: t.status,
            })),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to generate subtasks for ${task.title}`);
        }

        const data = await response.json();
        results.push({
          taskId: task.id,
          taskTitle: task.title,
          suggestions: data.suggestions || [],
        });
      }

      setSuggestionsByTask(results.filter((r) => r.suggestions.length > 0));
    } catch (err) {
      console.error("Error:", err);
      setError(err.message || "Error generating subtask suggestions");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMainTaskFromBrief = async () => {
    const description = briefDescription.trim();
    if (!description) {
      setError("Enter a brief description first");
      return;
    }
    if (!userId) {
      setError("User not authenticated");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const createdMainTask = await onAddTask(description, null);
      if (!createdMainTask?.id) {
        throw new Error("Could not create main task");
      }

      const response = await fetch(apiUrl("/api/ai/suggest-tasks"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "analyze",
          userId,
          currentTaskId: createdMainTask.id,
          prompt: description,
          tasks: [
            ...tasks.map((t) => ({
              id: t.id,
              title: t.title,
              description: t.description,
              status: t.status,
            })),
            {
              id: createdMainTask.id,
              title: createdMainTask.title,
              description: createdMainTask.description || "",
              status: createdMainTask.status || "pending",
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate subtask suggestions");
      }

      const data = await response.json();
      const generated = data.suggestions || [];
      setSuggestionsByTask([
        {
          taskId: createdMainTask.id,
          taskTitle: createdMainTask.title,
          suggestions: generated,
        },
      ]);
      setSelectedSuggestions(new Set(generated.map((_, index) => `${createdMainTask.id}:${index}`)));
      setSelectedTaskIds(new Set([createdMainTask.id]));
      setBriefDescription("");
    } catch (err) {
      console.error("Error:", err);
      setError(err.message || "Error generating main task and subtasks");
    } finally {
      setLoading(false);
    }
  };

  const suggestionEntries = useMemo(() => {
    const entries = [];
    for (const group of suggestionsByTask) {
      group.suggestions.forEach((title, index) => {
        entries.push({
          key: `${group.taskId}:${index}`,
          taskId: group.taskId,
          taskTitle: group.taskTitle,
          title,
        });
      });
    }
    return entries;
  }, [suggestionsByTask]);

  const toggleSuggestion = (key) => {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllSuggestions = () => {
    setSelectedSuggestions(new Set(suggestionEntries.map((entry) => entry.key)));
  };

  const deselectAllSuggestions = () => {
    setSelectedSuggestions(new Set());
  };

  const addEntriesAsSubtasks = async (entries) => {
    if (!entries.length) return;

    setAdding(true);
    setError("");

    try {
      for (const entry of entries) {
        await onAddSubtask(entry.taskId, entry.title);
      }
      clearSuggestions();
    } catch (err) {
      console.error("Error adding subtasks:", err);
      setError("Error adding subtasks");
    } finally {
      setAdding(false);
    }
  };

  const handleAddSelected = async () => {
    const selectedEntries = suggestionEntries.filter((entry) =>
      selectedSuggestions.has(entry.key)
    );
    await addEntriesAsSubtasks(selectedEntries);
  };

  const handleAddAll = async () => {
    await addEntriesAsSubtasks(suggestionEntries);
  };

  const allTasksSelected = taskCount > 0 && selectedTaskCount === taskCount;
  const allSuggestionsSelected =
    suggestionEntries.length > 0 && selectedSuggestions.size === suggestionEntries.length;

  return (
    <div
      style={{
        margin: "20px 0",
        padding: "20px",
        border: "1px solid #ddd",
        borderRadius: "8px",
      }}
    >
      <h3>AI Task Generator</h3>
      <p style={{ marginBottom: "15px", color: "#666" }}>
        Select the main tasks you want help with to generate subtask suggestions for those tasks.
      </p>

      <div
        style={{
          marginBottom: "16px",
          padding: "12px",
          border: "1px solid #eee",
          borderRadius: "6px",
          backgroundColor: "#fafafa",
        }}
      >
        <h4 style={{ marginTop: 0, marginBottom: "8px" }}>
          Generate New Main Task
        </h4>
        <p style={{ marginTop: 0, marginBottom: "10px", color: "#666", fontSize: "14px" }}>
          Enter a brief description. We will create a new main task and generate subtask suggestions for it.
        </p>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={briefDescription}
            onChange={(e) => setBriefDescription(e.target.value)}
            placeholder="Example: Plan onboarding flow for new users"
            disabled={loading || adding}
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: "6px",
              border: "1px solid #ccc",
            }}
          />
          <button
            type="button"
            onClick={handleGenerateMainTaskFromBrief}
            disabled={loading || adding || !briefDescription.trim()}
            style={{
              ...btnBase,
              backgroundColor: loading ? "#8bb7ff" : "#007bff",
              cursor:
                loading || adding || !briefDescription.trim() ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Generating..." : "Generate Main Task"}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
          <button
            type="button"
            onClick={allTasksSelected ? deselectAllTasks : selectAllTasks}
            disabled={loading || adding || taskCount === 0}
            style={{
              ...btnBase,
              backgroundColor: "#6c757d",
              cursor: loading || adding || taskCount === 0 ? "not-allowed" : "pointer",
              opacity: loading || adding || taskCount === 0 ? 0.7 : 1,
            }}
          >
            {allTasksSelected ? "Deselect tasks" : "Select all tasks"}
          </button>
          <button
            type="button"
            onClick={handleGenerateSubtasks}
            disabled={loading || adding || selectedTaskCount === 0}
            style={{
              ...btnBase,
              backgroundColor: loading ? "#8bb7ff" : "#007bff",
              cursor:
                loading || adding || selectedTaskCount === 0 ? "not-allowed" : "pointer",
            }}
          >
            {loading
              ? "Generating..."
              : `Generate subtasks for selected (${selectedTaskCount})`}
          </button>
        </div>

        {taskCount === 0 ? (
          <p style={{ color: "#888", fontSize: "14px" }}>
            Add at least one main task to generate subtasks.
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {mainTasks.map((task) => (
              <li key={task.id} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <input
                  type="checkbox"
                  checked={selectedTaskIds.has(task.id)}
                  onChange={() => toggleTaskSelected(task.id)}
                  disabled={loading || adding}
                  aria-label={`Select task: ${task.title}`}
                />
                <span>{task.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>}

      {suggestionEntries.length > 0 && (
        <div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
            <button
              type="button"
              onClick={allSuggestionsSelected ? deselectAllSuggestions : selectAllSuggestions}
              disabled={adding}
              style={{
                ...btnBase,
                backgroundColor: "#6c757d",
                cursor: adding ? "not-allowed" : "pointer",
                opacity: adding ? 0.7 : 1,
              }}
            >
              {allSuggestionsSelected ? "Deselect suggestions" : "Select all suggestions"}
            </button>
            <button
              type="button"
              onClick={handleAddSelected}
              disabled={adding || selectedSuggestions.size === 0}
              style={{
                ...btnBase,
                backgroundColor:
                  adding || selectedSuggestions.size === 0 ? "#94d3a2" : "#28a745",
                cursor:
                  adding || selectedSuggestions.size === 0 ? "not-allowed" : "pointer",
              }}
            >
              Add selected subtasks ({selectedSuggestions.size})
            </button>
            <button
              type="button"
              onClick={handleAddAll}
              disabled={adding}
              style={{
                ...btnBase,
                backgroundColor: adding ? "#94d3a2" : "#218838",
                cursor: adding ? "not-allowed" : "pointer",
              }}
            >
              Add all subtasks ({suggestionEntries.length})
            </button>
          </div>

          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {suggestionEntries.map((entry) => (
              <li
                key={entry.key}
                style={{
                  marginBottom: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "1px solid #eee",
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedSuggestions.has(entry.key)}
                  onChange={() => toggleSuggestion(entry.key)}
                  disabled={adding}
                  aria-label={`Select suggestion: ${entry.title}`}
                />
                <span style={{ color: "#555", minWidth: "180px", fontSize: "13px" }}>
                  {entry.taskTitle}
                </span>
                <span style={{ flex: 1 }}>{entry.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
