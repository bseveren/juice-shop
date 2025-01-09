var dbConnection = function dbConnection( sql, values, next){
	if (typeof global.poolDb == 'undefined') {
		global.poolDb = process.env.DB_DATABASE;
	}
	// It means that the values hasn't been passed
  if (arguments.length === 2){
    next = values;
    values = null;
  }
  
  pool.getConnection(function(err, connection){
	
	connection.changeUser({
        database: 'saas_gfs_'+global.poolDb
    }, function (err) {
        if (err) {
            // handle/report error
            return;
        }
		
        // Use the updated connection here, eventually
        // release it:
		connection.query(sql, values, function(err) {

			//connection.release();
	  
			if (err) {
			  throw err;
			}
	  
			// Execute the callback
			next.apply(this, arguments);
		  });
		  connection.release();
    });
	
	
    
  });
};
