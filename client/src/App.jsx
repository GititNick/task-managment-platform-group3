import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";

function App() {
  const {
    isLoading,
    isAuthenticated,
    user,
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
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;