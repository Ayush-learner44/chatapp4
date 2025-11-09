"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import "./home.css"; // classic CSS import

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const handleContinue = async () => {
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });

    if (res.ok) {
      router.push(`/chat?user=${encodeURIComponent(username)}`);
    } else {
      setError("User not found. Please register first.");
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
