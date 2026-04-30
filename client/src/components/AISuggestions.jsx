import { useState } from "react";
import { apiUrl } from "../api";

export default function AISuggestions({ onAddSuggestion, userId, tasks = [] }) {
  const [prompt, setPrompt] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionGroups, setSuggestionGroups] = useState([]);
  const [promptPlan, setPromptPlan] = useState(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("analyze");

  const handleGenerateSuggestions = async () => {
    if (!userId) {
      setError("User not authenticated");
      return;
    }

    if (mode === "prompt" && !prompt.trim()) {
      setError("Describe a main task first");
      return;
    }

    if (mode === "analyze" && selectedTaskIds.length === 0) {
      setError("Select at least one task to analyze");
      return;
    }

    setLoading(true);
    setError("");
    setSuggestions([]);
    setSuggestionGroups([]);
    setPromptPlan(null);
    setSelectedSuggestions([]);

    try {
      const requestBody = {
        mode,
        userId,
        prompt: prompt.trim(),
        currentTaskIds: selectedTaskIds,
        tasks: tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status
        }))
      };

      const response = await fetch(apiUrl("/api/ai/suggest-tasks"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setSuggestionGroups(data.suggestionsByTask || []);
        setPromptPlan(data.mainTaskSuggestion || null);
        setSelectedSuggestions([]);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Error generating suggestions");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Error generating suggestions");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuggestion = (suggestion) => {
    if (mode === "prompt" && promptPlan?.title) {
      onAddSuggestion([suggestion], {
        createMainTaskWithSubtasks: true,
        mainTaskTitle: promptPlan.title,
      });
    } else {
      onAddSuggestion(suggestion);
    }
    setSuggestions([]);
    setSuggestionGroups([]);
    setPromptPlan(null);
    setSelectedSuggestions([]);
    setPrompt("");
  };

  const handleAddSuggestionForTask = (suggestion, parentTaskId) => {
    onAddSuggestion(suggestion, {
      parentTaskIds: [parentTaskId],
      asSubtasks: true,
    });
    setSuggestions([]);
    setSuggestionGroups([]);
    setPromptPlan(null);
    setSelectedSuggestions([]);
    setPrompt("");
  };

  const toggleSuggestionSelection = (suggestionKey) => {
    setSelectedSuggestions((prev) =>
      prev.includes(suggestionKey)
        ? prev.filter((item) => item !== suggestionKey)
        : [...prev, suggestionKey]
    );
  };

  const handleSelectAll = (group) => {
    const groupKeys = group.suggestions.map(
      (suggestion) => `${group.currentTask.id}::${suggestion}`
    );

    if (groupKeys.every((key) => selectedSuggestions.includes(key))) {
      setSelectedSuggestions((prev) =>
        prev.filter((key) => !groupKeys.includes(key))
      );
      return;
    }

    setSelectedSuggestions((prev) => [
      ...new Set([...prev, ...groupKeys]),
    ]);
  };

  const handleSelectAllPromptSuggestions = () => {
    if (selectedSuggestions.length === suggestions.length) {
      setSelectedSuggestions([]);
      return;
    }
    setSelectedSuggestions([...suggestions]);
  };

  const handleAddSelected = () => {
    if (selectedSuggestions.length === 0) return;

    if (mode === "prompt" && promptPlan?.title) {
      onAddSuggestion(selectedSuggestions, {
        createMainTaskWithSubtasks: true,
        mainTaskTitle: promptPlan.title,
      });
    } else {
      onAddSuggestion(selectedSuggestions);
    }
    setSuggestions([]);
    setSuggestionGroups([]);
    setPromptPlan(null);
    setSelectedSuggestions([]);
    setPrompt("");
  };

  const handleAddSelectedForTask = (group) => {
    const selectedForTask = group.suggestions.filter((suggestion) =>
      selectedSuggestions.includes(`${group.currentTask.id}::${suggestion}`)
    );

    if (selectedForTask.length === 0) return;

    onAddSuggestion(selectedForTask, {
      parentTaskIds: [group.currentTask.id],
      asSubtasks: true,
    });
    setSuggestions([]);
    setSuggestionGroups([]);
    setPromptPlan(null);
    setSelectedSuggestions([]);
    setPrompt("");
  };

  const handleAddSelectedAcrossGroups = () => {
    const selectedByTask = suggestionGroups
      .map((group) => ({
        group,
        selectedForTask: group.suggestions.filter((suggestion) =>
          selectedSuggestions.includes(`${group.currentTask.id}::${suggestion}`)
        ),
      }))
      .filter(({ selectedForTask }) => selectedForTask.length > 0);

    if (selectedByTask.length === 0) return;

    selectedByTask.forEach(({ group, selectedForTask }) => {
      onAddSuggestion(selectedForTask, {
        parentTaskIds: [group.currentTask.id],
        asSubtasks: true,
      });
    });

    setSuggestions([]);
    setSuggestionGroups([]);
    setPromptPlan(null);
    setSelectedSuggestions([]);
    setPrompt("");
  };

  const handleAddPromptPlan = () => {
    if (!promptPlan?.title) return;

    onAddSuggestion(promptPlan.subtasks || [], {
      createMainTaskWithSubtasks: true,
      mainTaskTitle: promptPlan.title,
    });
    setSuggestions([]);
    setSuggestionGroups([]);
    setPromptPlan(null);
    setSelectedSuggestions([]);
    setPrompt("");
  };

  const toggleTaskSelection = (taskId) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleSelectAllTasks = () => {
    if (selectedTaskIds.length === tasks.length) {
      setSelectedTaskIds([]);
      return;
    }

    setSelectedTaskIds(tasks.map((task) => task.id));
  };

  const selectedTaskTitles = tasks
    .filter((task) => selectedTaskIds.includes(task.id))
    .map((task) => task.title);

  return (
    <div style={{ margin: "20px 0", padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
      <h3>AI Task Assistant</h3>
      <p style={{ marginBottom: "15px", color: "#666" }}>
        Analyze your current tasks or describe a main task and get AI-powered suggestions for what to add next.
      </p>

      <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
        <button
          onClick={() => {
            setMode("analyze");
            setError("");
          }}
          style={{
            backgroundColor: mode === "analyze" ? "#2563eb" : "#475569",
            color: "white",
            border: "none",
            padding: "8px 12px",
            borderRadius: "6px",
            cursor: "pointer"
          }}
        >
          Analyze Current Tasks
        </button>
        <button
          onClick={() => {
            setMode("prompt");
            setError("");
          }}
          style={{
            backgroundColor: mode === "prompt" ? "#2563eb" : "#475569",
            color: "white",
            border: "none",
            padding: "8px 12px",
            borderRadius: "6px",
            cursor: "pointer"
          }}
        >
          Describe a Main Task
        </button>
      </div>

      {mode === "analyze" && tasks.length > 0 && (
        <div
          style={{
            marginBottom: "12px",
            padding: "12px",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <strong>Select Tasks To Analyze</strong>
            <button
              onClick={handleSelectAllTasks}
              style={{
                backgroundColor: "#475569",
                color: "white",
                border: "none",
                padding: "5px 10px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {selectedTaskIds.length === tasks.length ? "Clear All" : "Select All"}
            </button>
          </div>

          <div style={{ display: "grid", gap: "8px" }}>
            {tasks.map((task) => (
              <label
                key={task.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedTaskIds.includes(task.id)}
                  onChange={() => toggleTaskSelection(task.id)}
                />
                <span>{task.title}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {mode === "analyze" && selectedTaskIds.length > 0 && (
        <div
          style={{
            color: "#666",
            fontSize: "14px",
            marginBottom: "12px",
            padding: "10px 12px",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            backgroundColor: "#f8fafc",
          }}
        >
          <strong style={{ display: "block", marginBottom: "6px", color: "#334155" }}>
            Suggestions will be added as subtasks for:
          </strong>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {selectedTaskTitles.map((title) => (
              <span
                key={title}
                style={{
                  backgroundColor: "#dbeafe",
                  color: "#1e3a8a",
                  padding: "4px 8px",
                  borderRadius: "999px",
                  fontSize: "13px",
                }}
              >
                {title}
              </span>
            ))}
          </div>
        </div>
      )}

      {mode === "prompt" && (
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the main task or goal you want suggestions for..."
          rows={4}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            marginBottom: "12px",
            resize: "vertical"
          }}
        />
      )}

      <button
        onClick={handleGenerateSuggestions}
        disabled={loading || (mode === "analyze" && tasks.length === 0)}
        style={{
          backgroundColor: loading ? "#ccc" : "#007bff",
          color: "white",
          border: "none",
          padding: "10px 14px",
          borderRadius: "6px",
          cursor:
            loading || (mode === "analyze" && tasks.length === 0)
              ? "not-allowed"
              : "pointer",
          marginBottom: "10px"
        }}
      >
        {loading
          ? "Generating..."
          : mode === "analyze"
            ? "Analyze Tasks & Get Suggestions"
            : "Suggest Main Tasks"}
      </button>

      {mode === "analyze" && tasks.length === 0 && (
        <p style={{ color: "#888", fontSize: "14px" }}>
          Add some tasks first to get AI suggestions.
        </p>
      )}

      {error && (
        <div style={{ color: "red", marginBottom: "10px" }}>
          {error}
        </div>
      )}

      {mode === "analyze" && suggestionGroups.length > 0 && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <h4 style={{ margin: 0 }}>Subtask Suggestions By Main Task</h4>
            <button
              onClick={handleAddSelectedAcrossGroups}
              disabled={selectedSuggestions.length === 0}
              style={{
                backgroundColor:
                  selectedSuggestions.length === 0 ? "#9ad7a6" : "#16a34a",
                color: "white",
                border: "none",
                padding: "8px 12px",
                borderRadius: "6px",
                cursor:
                  selectedSuggestions.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              Add Selected ({selectedSuggestions.length})
            </button>
          </div>
          <div style={{ display: "grid", gap: "14px" }}>
            {suggestionGroups.map((group) => {
              const groupKeys = group.suggestions.map(
                (suggestion) => `${group.currentTask.id}::${suggestion}`
              );
              const selectedCount = groupKeys.filter((key) =>
                selectedSuggestions.includes(key)
              ).length;

              return (
                <div
                  key={group.currentTask.id}
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <div>
                      <strong>{group.currentTask.title}</strong>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        Suggested subtasks for this main task
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => handleSelectAll(group)}
                        style={{
                          backgroundColor: "#6c757d",
                          color: "white",
                          border: "none",
                          padding: "5px 10px",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        {selectedCount === group.suggestions.length
                          ? "Clear All"
                          : "Select All"}
                      </button>
                      <button
                        onClick={() => handleAddSelectedForTask(group)}
                        disabled={selectedCount === 0}
                        style={{
                          backgroundColor:
                            selectedCount === 0 ? "#9ad7a6" : "#28a745",
                          color: "white",
                          border: "none",
                          padding: "5px 10px",
                          borderRadius: "4px",
                          cursor:
                            selectedCount === 0 ? "not-allowed" : "pointer",
                        }}
                      >
                        Add Selected ({selectedCount})
                      </button>
                    </div>
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {group.suggestions.map((suggestion, index) => {
                      const suggestionKey = `${group.currentTask.id}::${suggestion}`;
                      return (
                        <li
                          key={`${group.currentTask.id}-${index}`}
                          style={{
                            marginBottom: "10px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <label style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                            <input
                              type="checkbox"
                              checked={selectedSuggestions.includes(suggestionKey)}
                              onChange={() => toggleSuggestionSelection(suggestionKey)}
                            />
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <span>{suggestion}</span>
                              <span style={{ fontSize: "12px", color: "#64748b" }}>
                                For: {group.currentTask.title}
                              </span>
                            </div>
                          </label>
                          <button
                            onClick={() =>
                              handleAddSuggestionForTask(suggestion, group.currentTask.id)
                            }
                            style={{
                              backgroundColor: "#28a745",
                              color: "white",
                              border: "none",
                              padding: "5px 10px",
                              borderRadius: "4px",
                              cursor: "pointer"
                            }}
                          >
                            Add
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === "prompt" && promptPlan?.title && (
        <div>
          <div
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "12px",
              backgroundColor: "#f8fafc",
            }}
          >
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
              Suggested Main Task
            </div>
            <strong style={{ color: "#0f172a" }}>{promptPlan.title}</strong>
            <div style={{ marginTop: "10px" }}>
              <button
                onClick={handleAddPromptPlan}
                style={{
                  backgroundColor: "#2563eb",
                  color: "white",
                  border: "none",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Add Main Task With Subtasks
              </button>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <h4 style={{ margin: 0 }}>Suggested Subtasks:</h4>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleSelectAllPromptSuggestions}
                style={{
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {selectedSuggestions.length === suggestions.length
                  ? "Clear All"
                  : "Select All"}
              </button>
              <button
                onClick={handleAddSelected}
                disabled={selectedSuggestions.length === 0}
                style={{
                  backgroundColor:
                    selectedSuggestions.length === 0 ? "#9ad7a6" : "#28a745",
                  color: "white",
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: "4px",
                  cursor:
                    selectedSuggestions.length === 0 ? "not-allowed" : "pointer",
                }}
              >
                Add Selected ({selectedSuggestions.length})
              </button>
            </div>
          </div>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {suggestions.map((suggestion, index) => (
              <li key={index} style={{ marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={selectedSuggestions.includes(suggestion)}
                    onChange={() => toggleSuggestionSelection(suggestion)}
                  />
                  <span>{suggestion}</span>
                </label>
                <button
                  onClick={() => handleAddSuggestion(suggestion)}
                  style={{
                    backgroundColor: "#28a745",
                    color: "white",
                    border: "none",
                    padding: "5px 10px",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
