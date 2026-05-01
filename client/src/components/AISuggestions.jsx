import { useState } from "react";
import { apiUrl } from "../api";

export default function AISuggestions({ onAddSuggestion, userId, tasks = [] }) {
  const [prompt, setPrompt] = useState("");
  const [suggestions, setSuggestions] = useState([]);
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
      setError("Describe a goal first");
      return;
    }

    if (mode === "analyze" && selectedTaskIds.length === 0) {
      setError("Select at least one task to analyze");
      return;
    }

    setLoading(true);
    setError("");
    setSuggestions([]);
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
          status: task.status,
        })),
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
        setSelectedSuggestions([]);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Error generating suggestions");
      }
    } catch (fetchError) {
      console.error("Error:", fetchError);
      setError("Error generating suggestions");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuggestion = (suggestion) => {
    onAddSuggestion(suggestion);
    setSuggestions([]);
    setSelectedSuggestions([]);
    setPrompt("");
  };

  const toggleSuggestionSelection = (suggestion) => {
    setSelectedSuggestions((prev) =>
      prev.includes(suggestion)
        ? prev.filter((item) => item !== suggestion)
        : [...prev, suggestion]
    );
  };

  const handleSelectAllSuggestions = () => {
    if (selectedSuggestions.length === suggestions.length) {
      setSelectedSuggestions([]);
      return;
    }

    setSelectedSuggestions([...suggestions]);
  };

  const handleAddSelected = () => {
    if (selectedSuggestions.length === 0) return;

    onAddSuggestion(selectedSuggestions);
    setSuggestions([]);
    setSelectedSuggestions([]);
    setPrompt("");
  };

  const toggleTaskSelection = (taskId) => {
    const normalizedTaskId = String(taskId);
    setSelectedTaskIds((prev) =>
      prev.includes(normalizedTaskId)
        ? prev.filter((id) => id !== normalizedTaskId)
        : [...prev, normalizedTaskId]
    );
  };

  const handleSelectAllTasks = () => {
    if (selectedTaskIds.length === tasks.length) {
      setSelectedTaskIds([]);
      return;
    }

    setSelectedTaskIds(tasks.map((task) => String(task.id)));
  };

  return (
    <div style={{ margin: "20px 0", padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
      <h3>AI Task Assistant</h3>
      <p style={{ marginBottom: "15px", color: "#666" }}>
        Analyze your current tasks or describe a goal and get AI-powered task suggestions.
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
            cursor: "pointer",
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
            cursor: "pointer",
          }}
        >
          Describe a Goal
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
                  checked={selectedTaskIds.includes(String(task.id))}
                  onChange={() => toggleTaskSelection(task.id)}
                />
                <span>{task.title}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {mode === "prompt" && (
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the goal you want suggestions for..."
          rows={4}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            marginBottom: "12px",
            resize: "vertical",
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
          marginBottom: "10px",
        }}
      >
        {loading
          ? "Generating..."
          : mode === "analyze"
            ? "Analyze Tasks & Get Suggestions"
            : "Suggest Tasks"}
      </button>

      {mode === "analyze" && tasks.length === 0 && (
        <p style={{ color: "#888", fontSize: "14px" }}>
          Add some tasks first to get AI suggestions.
        </p>
      )}

      {error && <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>}

      {suggestions.length > 0 && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <h4 style={{ margin: 0 }}>Suggested Tasks</h4>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleSelectAllSuggestions}
                style={{
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  padding: "6px 10px",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {selectedSuggestions.length === suggestions.length ? "Clear All" : "Select All"}
              </button>
              <button
                onClick={handleAddSelected}
                disabled={selectedSuggestions.length === 0}
                style={{
                  backgroundColor: selectedSuggestions.length === 0 ? "#9ad7a6" : "#28a745",
                  color: "white",
                  border: "none",
                  padding: "6px 10px",
                  borderRadius: "4px",
                  cursor: selectedSuggestions.length === 0 ? "not-allowed" : "pointer",
                }}
              >
                Add Selected ({selectedSuggestions.length})
              </button>
            </div>
          </div>

          <ul style={{ listStyle: "none", padding: 0 }}>
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                style={{
                  marginBottom: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
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
                    cursor: "pointer",
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
