import express from "express";
import { Pool } from "pg";

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// Initialize PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // e.g. postgres://user:pass@localhost/db
});

// Whitelist of allowed product names
const ALLOWED_PRODUCTS = ["iPhone 15", "Galaxy S24", "Pixel 8", "MacBook Pro", "ThinkPad X1"];

app.post("/product", async (req, res) => {
    const { productName } = req.body;

    if (!productName || typeof productName !== "string") {
        return res.status(400).json({ error: "Invalid or missing productName" });
    }

    if (!ALLOWED_PRODUCTS.includes(productName)) {
        return res.status(403).json({ error: "Product not allowed" });
    }

    try {
        const client = await pool.connect();
        const query = `SELECT * FROM products WHERE name = $1`;
        const result = await client.query(query, [productName]);
        client.release();

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Product not found" });
        }

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
