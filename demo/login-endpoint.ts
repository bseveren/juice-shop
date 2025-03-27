import express from "express";
import { MongoClient } from "mongodb";

const app = express();
app.use(express.json());
const PORT = 3000;

const client = new MongoClient(process.env.MONGO_URI);

app.post("/login", function (req, res) {
    const database = client.db("database");
    const Users = database.collection("users");
    const user = Users.findOne({
        name: req.body.name,
        password: req.body.password,
    });

    if (user) {
        res.send(`Welcome ${user}`);
    } else {
        res.send("User not found");
    }
});

app.listen(PORT, function (err) {
    if (err) console.log(err);
    console.log("Server listening on PORT", PORT);
});
