// pages/api/deleteMessages.js
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
let client;
let clientPromise;

if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    try {
        const { user1, user2 } = req.body;

        const client = await clientPromise;
        const db = client.db("chatapp");
        const messages = db.collection("messages");

        // Delete all messages in both directions
        const result = await messages.deleteMany({
            $or: [
                { sender: user1, receiver: user2 },
                { sender: user2, receiver: user1 }
            ]
        });

        return res.status(200).json({
            message: "Chat deleted successfully",
            deletedCount: result.deletedCount
        });
    } catch (err) {
        console.error("Delete error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}
