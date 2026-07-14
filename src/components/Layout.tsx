import { useEffect, useState, type ReactNode } from "react";
import { Link, Outlet } from "react-router-dom";
import { API_BASE, blobsApi } from "../api/client";

export function Layout({ children }: { children?: ReactNode }) {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await blobsApi.health();
        if (!cancelled) setOnline(res.ok);
      } catch {
        if (!cancelled) setOnline(false);
      }
    };

    void check();
    const id = window.setInterval(check, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden />
          <span className="brand-text">JSON Blob</span>
        </Link>

        <div className="topbar-meta">
          <Link to="/compare" className="btn btn--ghost topbar-compare">
            Compare
          </Link>
          <span
            className={`api-status ${online === null ? "api-status--pending" : online ? "api-status--ok" : "api-status--down"}`}
            title={API_BASE}
          >
            <span className="api-status-dot" />
            {online === null ? "Checking API" : online ? "API online" : "API offline"}
          </span>
        </div>
      </header>

      <main className="main">{children ?? <Outlet />}</main>
    </div>
  );
}
