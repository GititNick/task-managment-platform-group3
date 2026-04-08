import { useAuth0 } from "@auth0/auth0-react";
import { useState, useEffect } from "react";

export default function Navbar() {
  const { loginWithRedirect, logout, isAuthenticated, user } = useAuth0();
  const [theme, setTheme] = useState("light");

  // Load saved theme
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) setTheme(saved);
  }, []);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  return (
    <div
      style={{
        width: "100%",
        borderBottom: "1px solid var(--border)",
        backgroundColor: "var(--card)"
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "12px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <span style={{ fontWeight: "bold" }}>Dashboard</span>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button onClick={toggleTheme}>
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </button>

          {!isAuthenticated ? (
            <button onClick={() => loginWithRedirect()}>
              Login
            </button>
          ) : (
            <>
              <span>{user?.email}</span>
              <button
                onClick={() =>
                  logout({
                    logoutParams: {
                      returnTo: window.location.origin
                    }
                  })
                }
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}