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

        const broadcastOnlineUsers = () => {
            io.emit("online-users", Object.keys(users));
        };

        // Register user
        socket.on("register-user", (username) => {
            users[username] = socket.id;
            socket.username = username;
            broadcastOnlineUsers(); // push update
        });

        socket.on("join", ({ sender, receiver }) => {
            socket.emit("joined", { with: receiver, time: new Date().toISOString() });
        });

        socket.on("get-online-users", () => {
            socket.emit("online-users", Object.keys(users));
        });


        // Handle private messaging
        socket.on("send-message", async ({ sender, receiver, text }) => {
            try {
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
                broadcastOnlineUsers(); // push update
            }
        });
    });

    httpServer.listen(port, hostname, () => {
        console.log(`🚀 Ready on http://${hostname}:${port}`);
    });
});
