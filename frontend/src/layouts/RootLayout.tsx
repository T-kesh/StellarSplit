import { useState } from "react";
import { Outlet } from "react-router";
import Navbar from "../components/Navbar";
import Sidebar from "@components/SIdebar";

export default function RootLayout() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)" }}>
      {/* Fixed sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/*
        Main area — offset by sidebar width (14rem = lg:ml-56) on large screens.
        On mobile the sidebar overlays, so no offset needed.
      */}
      <div
        style={{ transition: "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}
        className="lg:ml-56"
      >
        {/* Sticky top navbar */}
        <Navbar onMenuOpen={() => setSidebarOpen(true)} />

        {/* Page content */}
        <main
          style={{
            padding: "1.5rem",
            minHeight: "calc(100vh - 3.5rem)",
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
