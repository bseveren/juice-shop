package project;

import java.sql.*;

public class Database {
    public static void query(String input) {
        input = (String) Util.sanitizeSqlInput(input);
        try {
		// Add comment to trigger rescan 3
            Connection conn = DriverManager.getConnection("jdbc:h2:mem:testdb", "", "");

            Statement stmt = conn.createStatement();
            stmt.execute("CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255))");
            stmt.execute("INSERT INTO users VALUES (1, 'John'), (2, 'Jane'), (3, 'Bob')");

            String sql = "SELECT * FROM users WHERE name = '" + input + "'";

            ResultSet rs = stmt.executeQuery(sql);

            while (rs.next()) {
                System.out.println("ID: " + rs.getInt("id") + ", Name: " + rs.getString("name"));
            }

            conn.close();
        } catch (SQLException e) {
            System.out.println("SQL Exception: " + e.getMessage());
        }
    }
}