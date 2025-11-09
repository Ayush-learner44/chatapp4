import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { MongoClient } from "mongodb";

const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 3000;
const hostname = "0.0.0.0";

// MongoDB client reuse
const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error("MONGODB_URI missing. Check .env.local");
    process.exit(1);
}
let client;
let clientPromise;
if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

// Next.js app
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
    const httpServer = createServer((req, res) => {
        handler(req, res);
    });

    const users = {}; // { username: socket.id }

    const io = new Server(httpServer, {
        cors: { origin: "*" },
    });

    io.on("connection", (socket) => {
        console.log("✅ Socket connected:", socket.id);

        // Register user
        socket.on("register-user", (username) => {
            users[username] = socket.id;
            socket.username = username;
            console.log(`Registered ${username} with socket ${socket.id}`);
        });

        socket.on("join", ({ sender, receiver }) => {
            console.log(`${sender} joined chat with ${receiver}`);
            socket.emit("joined", { with: receiver, time: new Date().toISOString() });

            const receiverSocketId = users[receiver];
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("user-joined", { username: sender });
            }
        });


        // Handle leave (disconnect from recipient but keep socket alive)
        socket.on("leave", ({ sender, receiver }) => {
            console.log(`${sender} left chat with ${receiver}`);
            const receiverSocketId = users[receiver];
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("user-left", { username: sender });
            }
        });

        // Handle private messaging
        socket.on("send-message", async ({ sender, receiver, text }) => {
            try {
                const c = await clientPromise;
                const db = c.db("chatapp");
                const messages = db.collection("messages");

                await messages.insertOne({
                    sender,
                    receiver,
                    text,
                    timestamp: new Date(),
                });

                const msgPayload = {
                    sender,
                    receiver,
                    text,
                    time: new Date().toISOString(),
                };

                socket.emit("receive-message", msgPayload);

                const receiverSocketId = users[receiver];
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("receive-message", msgPayload);
                }
            } catch (err) {
                console.error("Message error:", err);
                socket.emit("error-message", { text: "Server error while sending message" });
            }
        });

        // Clean up on disconnect
        socket.on("disconnect", () => {
            if (socket.username) {
                delete users[socket.username];
                console.log(`❌ ${socket.username} disconnected`);
            }
        });
    });

    httpServer.listen(port, hostname, () => {
        console.log(`🚀 Ready on http://${hostname}:${port}`);
    });
});
