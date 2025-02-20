const express = require('express');
const db = require('./db');
const app = express();

app.use(express.json());

app.get('/fetchForumPost', (req, res) => {
    const postTitle = req.query.title;
    const query = `SELECT * FROM posts WHERE title = '${postTitle}'`;

    db.query(query, (err, rows) => {
        if (err) {
            res.status(500).send("Database error");
            return;
        }
        res.json(rows);
    });
});