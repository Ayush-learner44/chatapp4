"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import "./register.css";

export default function RegisterPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleRegister = async () => {
        if (!username.trim() || !password.trim()) {
            setError("Please enter both username and password");
            return;
        }

        const res = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        if (res.ok) {
            alert(`New user "${username}" registered`);
            router.push("/");
        } else {
            const data = await res.json();
            setError(data.message || "Registration failed");
        }
    };

    return (
        <div className="page">
            <div className="card">
                <h1 className="title">Register</h1>

                <input
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input"
                />

                <input
                    type="password"
                    placeholder="Choose a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
                />

                {error && <p className="error">{error}</p>}

                <button onClick={handleRegister} className="button">
                    Register
                </button>

                <p onClick={() => router.push("/")} className="link">
                    Back to Home
                </p>
            </div>
        </div>
    );
}
