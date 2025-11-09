// pages/api/message.js
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
    const client = await clientPromise;
    const db = client.db("chatapp");
    const messages = db.collection("messages");

    if (req.method === "POST") {
        const { sender, receiver, text } = req.body;
        if (!sender || !receiver || !text) {
            return res.status(400).json({ message: "Missing fields" });
        }
        const doc = { sender, receiver, text, time: new Date() };
        await messages.insertOne(doc);
        return res.status(200).json({ message: "Message stored", doc });
    }

    if (req.method === "GET") {
        const { user1, user2 } = req.query;
        if (!user1 || !user2) {
            return res.status(400).json({ message: "Missing query params" });
        }
        const history = await messages
            .find({
                $or: [
                    { sender: user1, receiver: user2 },
                    { sender: user2, receiver: user1 },
                ],
            })
            .sort({ time: 1 })
            .toArray();
        return res.status(200).json(history);
    }

    res.status(405).json({ message: "Method not allowed" });
}
