import { useAuth0 } from "@auth0/auth0-react";

export default function Navbar() {
  const { loginWithRedirect, logout, isAuthenticated, user } = useAuth0();
  const handleLogout = async () => {
    await logout({ localOnly: true });
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
          {!isAuthenticated ? (
            <button
              onClick={() =>
                loginWithRedirect({
                  authorizationParams: {
                    prompt: "login",
                  },
                })
              }
            >
              Login
            </button>
          ) : (
            <>
              <span>{user?.email}</span>
              <button
                onClick={handleLogout}
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
