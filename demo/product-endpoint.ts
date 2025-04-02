import express from "express";
import { Pool } from "pg";

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// Initialize PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

app.post("/product", async (req, res) => {
    const productName = req.body.productName;

    if (!["iPhone 15", "Galaxy S24", "Pixel 8", "MacBook Pro", "ThinkPad X1"].includes(productName)) {
        return res.status(403).json({ error: "Product not allowed" });
    }

    try {
        const client = await pool.connect();
        const query = `SELECT * FROM products WHERE name = '${productName}' LIMIT 1`;
        const result = await client.query(query);
        client.release();

        return res.json(result.rows[0]);
    } catch (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.listen(PORT, (err) => {
    if (err) {
        console.error("Error starting server:", err);
    } else {
        console.log(`Server is running on port ${PORT}`);
    }
});
