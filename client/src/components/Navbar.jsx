import { useAuth0 } from "@auth0/auth0-react";
import { Link } from "react-router-dom";

export default function Navbar() {
  const { loginWithRedirect, logout, isAuthenticated, user } = useAuth0();

  return (
    <nav style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "10px 20px",
      backgroundColor: "#f5f5f5",
      borderBottom: "1px solid #ddd"
    }}>
      {/* LEFT SIDE */}
      <div style={{ display: "flex", gap: "15px" }}>
        <Link to="/" style={{ textDecoration: "none", fontWeight: "bold" }}>
          Dashboard
        </Link>
      </div>

      {/* RIGHT SIDE */}
      <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
        {isAuthenticated && (
          <span style={{ fontSize: "14px" }}>
            {user.email}
          </span>
        )}

        {!isAuthenticated ? (
          <button onClick={() => loginWithRedirect()}>
            Login
          </button>
        ) : (
          <button
            onClick={() =>
              logout({
                logoutParams: { returnTo: window.location.origin }
              })
            }
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}