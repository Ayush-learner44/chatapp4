"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import "./home.css";

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleContinue = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password");
      return;
    }

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      router.push(`/chat?user=${encodeURIComponent(username)}`);
    } else {
      const data = await res.json();
      setError(data.message || "Login failed");
    }
  };

  return (
    <div className="page">
      <div className="card">
        <h1 className="title">Welcome</h1>

        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="input"
        />

        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />

        {error && <p className="error">{error}</p>}

        <button onClick={handleContinue} className="button">
          Continue
        </button>

        <p onClick={() => router.push("/register")} className="link">
          Sign Up
        </p>
      </div>
    </div>
  );
}
