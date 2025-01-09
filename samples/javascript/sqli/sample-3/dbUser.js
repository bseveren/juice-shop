const pg = require("pg");
const { Pool } = pg;

const pool = new Pool();

module.exports = () => ({
  read(id) {
    const sql = `SELECT * FROM user`;
    if (!id) return pool.query(sql);
    return pool.query(`${sql} WHERE id = $1`, [id]);
  },
});
