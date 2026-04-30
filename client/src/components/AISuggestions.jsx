import { useEffect, useState } from "react";
import { apiUrl } from "../api";

const btnBase = {
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "4px",
  cursor: "pointer",
};

export default function AISuggestions({
  onAddSuggestion,
  onAddSuggestions,
  userId,
  tasks = [],
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSelected(new Set());
  }, [suggestions]);

  const handleGenerateSuggestions = async () => {
    if (!userId) {
      setError("User not authenticated");
      return;
    }

    setLoading(true);
    setError("");
    setSuggestions([]);

    try {
      const requestBody = {
        mode: "analyze",
        userId,
        tasks: tasks.map((task) => ({
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
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Error generating suggestions");
      }
    } catch (err) {
      console.error("Error:", err);
      setError("Error generating suggestions");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelected = (index) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(suggestions.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelected(new Set());
  };

  const clearSuggestionsList = () => {
    setSuggestions([]);
    setError("");
  };

  const handleAddOne = async (suggestion) => {
    setAdding(true);
    try {
      const ok = await onAddSuggestion(suggestion);
      if (ok) clearSuggestionsList();
    } finally {
      setAdding(false);
    }
  };

  const handleAddSelected = async () => {
    const titles = suggestions.filter((_, i) => selected.has(i));
    if (!titles.length) return;
    setAdding(true);
    try {
      const ok = await onAddSuggestions(titles);
      if (ok) clearSuggestionsList();
    } finally {
      setAdding(false);
    }
  };

  const handleAddAll = async () => {
    if (!suggestions.length) return;
    setAdding(true);
    try {
      const ok = await onAddSuggestions([...suggestions]);
      if (ok) clearSuggestionsList();
    } finally {
      setAdding(false);
    }
  };

  const allSelected =
    suggestions.length > 0 && selected.size === suggestions.length;
  const someSelected = selected.size > 0;

  return (
    <div
      style={{
        margin: "20px 0",
        padding: "20px",
        border: "1px solid #ddd",
        borderRadius: "8px",
      }}
    >
      <h3>AI Task Assistant</h3>
      <p style={{ marginBottom: "15px", color: "#666" }}>
        Analyze your current tasks and get AI-powered suggestions for
        improvements and related tasks across any domain.
      </p>

      <button
        type="button"
        onClick={handleGenerateSuggestions}
        disabled={loading || tasks.length === 0}
        style={{
          ...btnBase,
          backgroundColor: loading ? "#ccc" : "#007bff",
          cursor: loading || tasks.length === 0 ? "not-allowed" : "pointer",
          marginBottom: "10px",
        }}
      >
        {loading ? "Analyzing..." : "Analyze Tasks & Get Suggestions"}
      </button>

      {tasks.length === 0 && (
        <p style={{ color: "#888", fontSize: "14px" }}>
          Add some tasks first to get AI suggestions.
        </p>
      )}

      {error && (
        <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>
      )}

      {suggestions.length > 0 && (
        <div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <h4 style={{ margin: 0, marginRight: "8px" }}>Suggested Tasks:</h4>
            <button
              type="button"
              onClick={allSelected ? deselectAll : selectAll}
              disabled={adding}
              style={{
                ...btnBase,
                backgroundColor: "#6c757d",
                cursor: adding ? "not-allowed" : "pointer",
                opacity: adding ? 0.7 : 1,
              }}
            >
              {allSelected ? "Deselect all" : "Select all"}
            </button>
            <button
              type="button"
              onClick={handleAddSelected}
              disabled={adding || !someSelected}
              style={{
                ...btnBase,
                backgroundColor:
                  adding || !someSelected ? "#94d3a2" : "#28a745",
                cursor: adding || !someSelected ? "not-allowed" : "pointer",
              }}
            >
              Add selected ({selected.size})
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
              Add all ({suggestions.length})
            </button>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                style={{
                  marginBottom: "10px",
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
                  checked={selected.has(index)}
                  onChange={() => toggleSelected(index)}
                  disabled={adding}
                  aria-label={`Select suggestion: ${suggestion}`}
                />
                <span style={{ flex: 1 }}>{suggestion}</span>
                <button
                  type="button"
                  onClick={() => handleAddOne(suggestion)}
                  disabled={adding}
                  style={{
                    ...btnBase,
                    backgroundColor: adding ? "#94d3a2" : "#28a745",
                    cursor: adding ? "not-allowed" : "pointer",
                    flexShrink: 0,
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
