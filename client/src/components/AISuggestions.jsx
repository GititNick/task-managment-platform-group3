import { useState } from "react";
import { apiUrl } from "../api";

export default function AISuggestions({ onAddSuggestion, userId, tasks = [] }) {
  const [prompt, setPrompt] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("analyze"); // "generate" or "analyze" - default to analyze

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
        mode: "analyze", // Always use analyze mode
        userId,
        tasks: tasks.map(task => ({
          title: task.title,
          description: task.description,
          status: task.status
        }))
      };

      // Keep generate logic commented out in case we want to add it back
      /*
      if (mode === "generate") {
        requestBody.prompt = prompt;
      } else if (mode === "analyze") {
        // Send current tasks for analysis
        requestBody.tasks = tasks.map(task => ({
          title: task.title,
          description: task.description,
          status: task.status
        }));
      }
      */

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
    } catch (error) {
      console.error("Error:", error);
      setError("Error generating suggestions");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuggestion = (suggestion) => {
    onAddSuggestion(suggestion);
    setSuggestions([]);
    setPrompt("");
  };

  return (
    <div style={{ margin: "20px 0", padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
      <h3>AI Task Assistant</h3>
      <p style={{ marginBottom: "15px", color: "#666" }}>
        Analyze your current tasks and get AI-powered suggestions for improvements and related tasks across any domain.
      </p>

      <button
        onClick={handleGenerateSuggestions}
        disabled={loading || tasks.length === 0}
        style={{
          backgroundColor: loading ? "#ccc" : "#007bff",
          color: "white",
          border: "none",
          padding: "10px 14px",
          borderRadius: "6px",
          cursor: loading || tasks.length === 0 ? "not-allowed" : "pointer",
          marginBottom: "10px"
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
        <div style={{ color: "red", marginBottom: "10px" }}>
          {error}
        </div>
      )}

      {suggestions.length > 0 && (
        <div>
          <h4>Suggested Tasks:</h4>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {suggestions.map((suggestion, index) => (
              <li key={index} style={{ marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{suggestion}</span>
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