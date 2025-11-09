"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { io } from "socket.io-client";
import "./chat.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function ChatPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const socketRef = useRef(null);

    const messagesEndRef = useRef(null);

    const [username, setUsername] = useState("");
    const [recipient, setRecipient] = useState("");
    const [connected, setConnected] = useState(false);
    const [message, setMessage] = useState("");
    const [chat, setChat] = useState([]);
    const [users, setUsers] = useState([]);

    // scroll to bottom whenever chat updates
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [chat]);

    // Get username from query param (?user=alice)
    useEffect(() => {
        const u = searchParams.get("user");
        if (u) setUsername(u);
    }, [searchParams]);

    // Fetch registered users for dropdown
    useEffect(() => {
        fetch("/api/users")
            .then(res => res.json())
            .then(data => setUsers(data))
            .catch(err => console.error("Failed to fetch users", err));
    }, []);

    // Initialize socket once
    useEffect(() => {
        if (!socketRef.current) {
            socketRef.current = io();

            socketRef.current.on("joined", (data) => {
                console.log("joined event received", data);
                setChat((prev) => [
                    ...prev,
                    { sender: "system", text: `Connected with ${data.with}`, time: data.time || new Date().toISOString() }
                ]);
                setConnected(true);
            });

            socketRef.current.on("receive-message", (data) => {
                if (data.receiver === username || data.sender === username) {
                    setChat((prev) => [
                        ...prev,
                        { sender: data.sender, text: data.text, time: data.time || new Date().toISOString() }
                    ]);
                }
            });


            socketRef.current.on("error-message", (data) => {
                alert(data.text);
                setConnected(false);
            });

            socketRef.current.on("disconnect", () => {
                console.log("❌ Socket disconnected");
                setConnected(false);
            });

            socketRef.current.on("disconnect", () => {
                setChat((prev) => [
                    ...prev,
                    { sender: "system", text: "You disconnected", time: new Date().toISOString() }
                ]);
                setConnected(false);
            });

            socketRef.current.on("user-left", (data) => {
                setChat((prev) => [
                    ...prev,
                    { sender: "system", text: `${data.username} left the chat`, time: new Date().toISOString() }
                ]);
            });

            socketRef.current.on("user-joined", (data) => {
                setChat((prev) => [
                    ...prev,
                    { sender: "system", text: `${data.username} joined the chat`, time: new Date().toISOString() }
                ]);
            });

        }

        return () => {
            socketRef.current && socketRef.current.disconnect();
        };
    }, []);

    // ✅ Register user once username is set
    useEffect(() => {
        if (socketRef.current && username) {
            console.log("registering user", username);
            socketRef.current.emit("register-user", username);
        }
    }, [username]);

    // ✅ Connect handler
    const connect = async () => {
        if (!recipient.trim()) {
            alert("Enter a recipient username");
            return;
        }

        const res = await fetch(`/api/message?user1=${encodeURIComponent(username)}&user2=${encodeURIComponent(recipient)}`);
        if (res.ok) {
            const history = await res.json();
            setChat(history.map((m) => ({
                sender: m.sender,
                text: m.text,
                time: m.time
            })));
        }

        console.log("emitting join", { sender: username, receiver: recipient });
        socketRef.current.emit("join", { sender: username, receiver: recipient });
    };

    const disconnect = () => {
        if (socketRef.current && connected) {
            console.log("emitting leave", { sender: username, receiver: recipient });
            socketRef.current.emit("leave", { sender: username, receiver: recipient });
        }
        setConnected(false);
        setRecipient("");
        setChat([]);
    };

    const sendMessage = async () => {
        if (!connected || !message.trim()) return;
        const msg = { sender: username, receiver: recipient, text: message, time: new Date().toISOString() };

        const res = await fetch("/api/message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(msg),
        });

        if (res.ok) {
            console.log("emitting send-message", msg);
            socketRef.current.emit("send-message", msg);
            // ✅ Immediately add to chat so you see it
            setChat((prev) => [...prev, { sender: username, text: message, time: msg.time }]);

            setMessage("");
        } else {
            const data = await res.json();
            alert(data.message || "Message failed to send");
        }
    };

    return (
        <div className="chat-page">
            <div className="top-bar">
                <button onClick={() => router.push("/")} className="home-button">
                    Home
                </button>
                {username && (
                    <span className="profile-badge">
                        You — <strong>{username}</strong>
                    </span>
                )}
            </div>

            <div className="chat-center">
                <div className="chat-card">
                    <div className="recipient-row">
                        <input
                            list="user-list"
                            placeholder="Recipient"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            className="recipient-input"
                        />
                        <datalist id="user-list">
                            {users
                                .filter((u) => u !== username)
                                .map((u, i) => (
                                    <option key={i} value={u} />
                                ))}
                        </datalist>

                        <button onClick={connect} className="connect-button">Connect</button>
                        <button onClick={() => setChat([])} className="refresh-button">Clear</button>
                        <button
                            onClick={async () => {
                                const res = await fetch("/api/deleteMessages", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ user1: username, user2: recipient }),
                                });
                                if (res.ok) {
                                    alert("Messages deleted");
                                    setChat([]);
                                } else {
                                    const data = await res.json();
                                    alert(data.message || "Failed to delete messages");
                                }
                            }}
                            className="delete-button"
                        >
                            Delete Chat
                        </button>

                        <button onClick={disconnect} className="disconnect-button">Disconnect</button>
                    </div>

                    <div className="chat-window">
                        <div className="messages">
                            {chat.map((c, i) => {
                                const label = c.sender === username ? "me" : c.sender;
                                const time = c.time
                                    ? new Date(c.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : "";
                                return (
                                    <div
                                        key={i}
                                        className={`message ${c.sender === username
                                            ? "me"
                                            : c.sender === "system"
                                                ? "system"
                                                : "them"
                                            }`}
                                    >
                                        <span className="from">{label}:</span> {c.text}
                                        {time && <span className="timestamp"> {time}</span>}
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="input-row">
                            <input
                                type="text"
                                placeholder="Type a message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="message-input"
                                disabled={!connected}
                            />
                            <button
                                onClick={sendMessage}
                                className="send-button"
                                disabled={!connected}
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={<div>Loading chat...</div>}>
            <ChatPageInner />
        </Suspense>
    );
}




