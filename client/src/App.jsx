import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";

function App() {
  const {
    loginWithRedirect,
    logout,
    user,
    isAuthenticated,
    isLoading,
  } = useAuth0();

  const [syncStatus, setSyncStatus] = useState("");

  // Sync user to database when they log in
  useEffect(() => {
    if (isAuthenticated && user) {
      syncUserToDatabase(user);
    }
  }, [isAuthenticated, user]);

  const syncUserToDatabase = async (auth0User) => {
    try {
      setSyncStatus("Syncing user...");
      console.log("Auth0 user data:", auth0User);

      const payload = {
        auth0_id: auth0User.sub,
        name: auth0User.name,
        email: auth0User.email,
      };
      console.log("Sending payload:", payload);

      const response = await fetch("/api/auth/sync-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);

      if (response.ok) {
        setSyncStatus("User synced!");
        console.log("User synced to database:", data.user);
      } else {
        setSyncStatus("Error syncing user");
        console.error("Sync failed:", data);
      }
    } catch (error) {
      setSyncStatus("Error syncing user");
      console.error("Error syncing user:", error);
      console.error("Error message:", error.message);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>Task Management Platform</h1>

      {!isAuthenticated ? (
        <button onClick={() => loginWithRedirect()}>
          Log In
        </button>
      ) : (
        <>
          <p>Welcome {user?.name}</p>
          <p style={{ fontSize: "12px", color: "#666" }}>{syncStatus}</p>
          <button
            onClick={() =>
              logout({
                logoutParams: {
                  returnTo: window.location.origin,
                },
              })
            }
          >
            Log Out
          </button>
        </>
      )}
    </div>
  );
}

export default App;