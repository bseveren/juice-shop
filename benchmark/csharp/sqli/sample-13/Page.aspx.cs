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
        string continent = Request("continent");

        try
        {
            conn.Open();

            string sql = "SELECT Name, HeadOfState FROM Country WHERE Continent='"+continent+"'";
            MySqlCommand cmd = new MySqlCommand(sql, conn);

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
