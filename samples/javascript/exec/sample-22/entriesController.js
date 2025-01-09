function updateLocalRepo(targetFolder, targetRemote) {
	// Verify targetFolder exists
	if (!fs.existsSync(targetFolder)) {
		// If it doesn't exist - clone targetRemote into targetFolder
		execSync(`git clone ${targetRemote} ${targetFolder}`);
	}
	// git pull inside targetFolder
	execSync(`cd ${targetFolder}; git pull`);
}
