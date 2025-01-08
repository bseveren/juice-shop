const bodyParser = require('body-parser')
const app = require('express')()
const fs = require('fs')

app.use(bodyParser.json())
app.all('/:file_name', (req, res) => {
	fs.readFile('/.well-known/acme-challenge/'+req.params.file_name, 'utf8', function (err,data) {
		if (err){
			res.json(err)
		}

		res.send(data)
	});

})
