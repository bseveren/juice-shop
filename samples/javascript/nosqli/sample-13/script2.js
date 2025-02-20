import express from "express";
import { MongoClient } from "mongodb";

const app = express();
app.use(express.json());

const client = new MongoClient(process.env.MONGO_URI);

app.post("/fetch", function (req, res) {
    const database = client.db("database");
    const Users = database.collection("users");
    const name = req.body.name;
    const password = req.body.password;
    const user = Users.findOne({
        name,
        password
    });

    if (user) {
        res.send(`Welcome, ${user}`);
    } else {
        res.send("User not found");
    }
});
