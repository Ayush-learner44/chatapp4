// pages/api/login.js
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
    const users = db.collection("users");

    if (req.method === "POST") {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ message: "Username required" });
        }

        const existing = await users.findOne({ username });
        if (!existing) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({ message: "Login successful" });
    }

    res.status(405).json({ message: "Method not allowed" });
}
