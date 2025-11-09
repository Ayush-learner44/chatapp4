// pages/api/register.js
import { MongoClient } from "mongodb";
import bcrypt from "bcrypt";

const uri = process.env.MONGODB_URI;
let client;
let clientPromise;

if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export default async function handler(req, res) {
    try {
        const client = await clientPromise;
        const db = client.db("chatapp");
        const users = db.collection("users");

        if (req.method === "POST") {
            const { username, password } = req.body;

            if (!username?.trim() || !password?.trim()) {
                return res.status(400).json({ message: "Username and password required" });
            }

            const existing = await users.findOne({ username });
            if (existing) {
                return res.status(400).json({ message: "Username already exists" });
            }

            const hash = await bcrypt.hash(password, 10);
            await users.insertOne({ username, passwordHash: hash, createdAt: new Date() });

            return res.status(200).json({ message: "User registered" });
        }

        res.status(405).json({ message: "Method not allowed" });
    } catch (e) {
        console.error("Register API error:", e);
        res.status(500).json({ message: "Internal server error" });
    }
}
