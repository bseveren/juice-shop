const pg = require("pg");
const { Pool } = pg;

const pool = new Pool();

module.exports = {
  getComments: async (req, res) => {
    const userId = req.body.userId;
    const postId = req.body.postId;

    const query = `SELECT * FROM comments WHERE user_id = '${Number(
      userId
    )}' AND post_id = '${postId}'`;
    try {
      const result = await pool.query(query);
      if (result.length > 0) {
        return res.json({ comments: result.rows });
      }
    } catch (e) {}
    return res.json({ comments: [] });
  },
};
