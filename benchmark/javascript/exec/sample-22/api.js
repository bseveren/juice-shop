const {runQuery} = require('./db');
const {generateDB} = require('./generateDB');
const { updateLocalRepo } = require('./entriesController');
const {allTopicsQuery, entryByNameQuery, entriesRepo, entriesFolder} = require('./config');

function rebuildEntries() {
	updateLocalRepo(entriesFolder, entriesRepo);
	generateDB();
}
(() => rebuildEntries())();
