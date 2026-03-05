import React from "react";
import Navbar from "./Navbar";

function Layout({ children }) {
  return (
    <>
      <Navbar />
      <div className="container mt-4">
        {children}
      </div>
    </>
  );
}

export default Layout;