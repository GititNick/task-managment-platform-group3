import { useState } from "react";
import { apiUrl } from "../api";

export default function AISuggestions({ onAddSuggestion }) {
  const [prompt, setPrompt] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerateSuggestions = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError("");
    setSuggestions([]);

    try {
      const response = await fetch(apiUrl("/api/ai/suggest-tasks"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
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
      <h3>AI Task Suggestions</h3>
      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <input
          type="text"
          placeholder="Describe what tasks you need..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid var(--border)",
            flex: 1
          }}
        />
        <button
          onClick={handleGenerateSuggestions}
          disabled={loading}
          style={{
            backgroundColor: loading ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            padding: "10px 14px",
            borderRadius: "6px",
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Generating..." : "Get Suggestions"}
        </button>
      </div>

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