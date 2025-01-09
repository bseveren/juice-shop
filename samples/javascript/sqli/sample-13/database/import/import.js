var mysql = require('mysql');
const csv = require('csv-parser');
const fs = require('fs');
var cat_matching = require('./cat_matching.json');
var country_to_iso2 = require('./country_to_iso2.json');
var i = 0;
var item = {};

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "foo",
  database: "myDatabase",
});

con.connect(function(err) {
    if (err) throw err;
    console.log("Connected to database");

    fs.createReadStream('data.csv')
        .pipe(csv({ separator: ';' }))
        .on('data', (row) => {
            // commit previous item if next element
            if (row['Type Ligne'] === 'Elément' && Object.keys(item).length){
                addToDB(item);
                item = {};
                i++;
            }

            // Element was rejected, skip postes
            if (row['Type Ligne'] === 'Poste' && !Object.keys(item).length) return;

            // disregard rows that are not emission factors, archived or rejected rows
            if(row["Type de l'élément"] !== "Facteur d'émission") return;
            if(row["Statut de l'élément"]!=="Valide générique") return;

            // add row data to item
            addRowToItem(row);
        })
        .on('end', () => {
            console.log(`CSV file successfully processed, ${i} entries added`);
        });
  });

function addToDB(item){
    let insert_emission_type_sql = generateSQL_EF(item);
    con.query(insert_emission_type_sql, function (err, result) {
        if (err){
            console.log(item);
            throw err;
        } 

        ef_id = result.insertId

        let insert_rel_subcats_sql = generateSQL_subcats(ef_id, item.subcat_ids);
        con.query(insert_rel_subcats_sql, function (err, result) {
            if (err) throw err;
        });
    });
}
