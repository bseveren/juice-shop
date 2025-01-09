const Sql = require("./sql");

exports.getNext = async (tenantId, sequenceName) => {
  const input = { tablename: sequenceName, id_tenant: tenantId };
  let output = { value: null };
  output = await Sql.execute(connection, "pr_gen_lastid", input, output);
  return parseInt(output.value);
};
