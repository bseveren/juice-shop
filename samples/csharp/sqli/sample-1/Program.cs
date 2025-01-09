using System.Data;
using System.Data.SqlClient;
using System.Web.UI.WebControls;

class SqlInjection
{
    TextBox categoryTextBox;
    string connectionString;

    public DataSet GetDataSetByCategory()
    {
        using (var connection = new SqlConnection(connectionString))
        {
            var adapter = new SqlDataAdapter("ItemsStoredProcedure", connection);
            adapter.SelectCommand.CommandType = CommandType.StoredProcedure;
            var parameter = new SqlParameter("category", categoryTextBox.Text);
            adapter.SelectCommand.Parameters.Add(parameter);
            var result = new DataSet();
            adapter.Fill(result);
            return result;
        }

        using (var connection = new SqlConnection(connectionString))
        {
            var query = "SELECT ITEM,PRICE FROM PRODUCT WHERE ITEM_CATEGORY="
              + "@category ORDER BY PRICE";
            var adapter2 = new SqlDataAdapter(query, connection);
            var parameter2 = new SqlParameter("category", categoryTextBox.Text);
            adapter2.SelectCommand.Parameters.Add(parameter2);
            var result = new DataSet();
            adapter.Fill(result);
            return result;
        }
    }
}
