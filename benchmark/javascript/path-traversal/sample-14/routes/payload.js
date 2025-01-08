var express = require('express');
var router = express.Router();
const tools = require("../util/tools");
const path = require("path");
const fs = require("fs");


router.post("*", async function (req, res, next) {

	let jobName = req.body.jobName;

	if (!jobName || jobName == "") {
		res.send('NOT OK - need jobName');
		return;
	}

	let result = tools.isPaBusy(jobName)

	if (result.success) {
		res.send('NOT OK - PA BUSY');
		return;
	}
	else {
		if(result.currentJobName != jobName){
			tools.busyOn(jobName);
		}
		next();
	}
})

router.post('/download', async function (req, res) {

	let chosenPayload = req.body.chosenPayload;
	// Let's download it
	try {
		returnObj = await tools.executeOneShellCommand(`docker pull ${chosenPayload}`);
		if (returnObj.exitCode == 0) {
			res.send('OK');
		}
		else {
			res.send('NOT OK');
		}
	}
	catch (error) {
		res.send('NOT OK - ' + returnObj.stdErr.toString());
	}
})
router.post('/run', async function (req, res) {
	let chosenPayload = req.body.chosenPayload;

	try {
		// Let's run it and return it's id.
		returnObj = await tools.executeOneShellCommand(`docker run -dit ${chosenPayload}`);

		let sourceContainerId = returnObj.stdOut.toString();

		sourceContainerId = sourceContainerId.replace(/\n$/, '');

		if (returnObj.exitCode == 0) {
			res.send(sourceContainerId);
		}
		else {
			res.send('NOT OK');
		}
	}
	catch (error) {
		res.send('NOT OK - ' + error.stack);

	}
})
router.post('/copy', async function (req, res) {

	let sourceContainerId = req.body.sourceContainerId;

	try {
		let desiredTagPath = path.resolve(`./temp/${Date.now()}`);

		if (!fs.existsSync(desiredTagPath)) {
			fs.mkdirSync(desiredTagPath, { recursive: true });
		}
		returnObj = await tools.executeOneShellCommand(`docker cp ${sourceContainerId}:/app/ ${desiredTagPath}`);

		if (returnObj.exitCode == 0) {
			res.send(desiredTagPath);
		}
		else {
			res.send('NOT OK');
		}
	}
	catch (error) {
		res.send('NOT OK - ' + error.stack);
		console.log(error.stack);

	}
})
router.post('/upload', async function (req, res) {

	let desiredTagPath = req.body.desiredTagPath;

	try {

		// Let's find out acme's container id
		returnObj = await tools.executeOneShellCommand("docker container ps");

		let listOfContainers = returnObj.stdOut.join('').toString();

		console.log("listOfContainers->" + listOfContainers)
		let acmeContainerIdRE = /([0-9a-f]+)\s+gitlab\.[a-z]+\.com:\d+\/empress\/acme/;

		let acmeContainerId = listOfContainers.match(new RegExp(acmeContainerIdRE))[1];

		//7) Let's upload to acme the downloaded payload
		//TODO here's a bug. If i'm trying to install a 'payload' type of payload, the destination
		//will be /app/payload
		let resolvedPath = path.resolve(`${desiredTagPath}/app/acme`);

		let dockerCopyCmd = `docker cp ${resolvedPath} ${acmeContainerId}:/app/`

		returnObj = await tools.executeOneShellCommand(dockerCopyCmd);

		if (returnObj.exitCode == 0) {
			res.send(acmeContainerId);
		}
		else {
			resolvedPath = path.resolve(`${desiredTagPath}/app/payload`);

			let resolvedDestinationPath = path.resolve(desiredTagPath + "/app/orion");

			returnObj = await tools.executeOneShellCommand(`mv ${resolvedPath} ${resolvedDestinationPath}`);

			if (returnObj.exitCode == 0) {
				resolvedPath = path.resolve(`${desiredTagPath}/app/orion`);


				let dockerCopyCmd = `docker cp ${resolvedPath} ${acmeContainerId}:/app/acme/`

				returnObj = await tools.executeOneShellCommand(dockerCopyCmd);

				if (returnObj.exitCode == 0) {
					res.send(acmeContainerId);
				}
			}
			else {
				res.send('NOT OK');
			}
		}
	}
	catch (error) {
		res.send('NOT OK - ' + error.stack);
	}
})
