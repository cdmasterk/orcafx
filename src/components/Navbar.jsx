import React, { useEffect, useState } from "react";
import "./Navbar.css";
import { supabase } from "../lib/supabase";

export default function Navbar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <header className="top-navbar">
      <div className="brand">ORCA ERP</div>
      <div className="nav-right">
        {user ? (
          <>
            <div className="user-info">
              <div className="avatar">{(user.email || "").slice(0,1).toUpperCase()}</div>
              <div className="user-meta">
                <div className="user-email">{user.email}</div>
                <div className="user-role">Ulogiran</div>
              </div>
            </div>
            <button className="btn logout" onClick={handleLogout}>Odjava</button>
          </>
        ) : (
          <div className="not-logged">Nema prijavljenog korisnika</div>
        )}
      </div>
    </header>
  );
}
