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
            var query = "SELECT ITEM,PRICE FROM PRODUCT WHERE ITEM_CATEGORY='"
              + categoryTextBox.Text + "' ORDER BY PRICE";
            var adapter = new SqlDataAdapter(query, connection);
            var result = new DataSet();
            adapter.Fill(result);
            return result;
        }
    }
}
