using System;
using System.Data;

using MySql.Data;
using MySql.Data.MySqlClient;

public partial class RestrictedPage : Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        string connStr = "server=localhost;user=root;database=world;port=3306;password=******";
        MySqlConnection conn = new MySqlConnection(connStr);
        try
        {
            conn.Open();

            string sql = "SELECT Name, HeadOfState FROM Country WHERE Continent=@Continent";
            MySqlCommand cmd = new MySqlCommand(sql, conn);

	    string continent = Request("continent");
            cmd.Parameters.AddWithValue("@Continent", continent);

            MySqlDataReader rdr = cmd.ExecuteReader();

            while (rdr.Read())
            {
                Response.Write(rdr["Name"]+" --- "+rdr["HeadOfState"]);
            }
            rdr.Close();
        }
        catch (Exception ex)
        {
            Response.Write(ex.ToString());
        }

        conn.Close();
    }
}
