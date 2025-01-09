export async function populateSQLChallengesAndSourceCode(db: PGDB) {
  const mongoDb = new MongoDB();
  const mongoClient = await mongoDb.connectToDb().then(() => {
    return mongoDb.client;
  });

  const database = mongoClient.db(DATABASE_NAME);
  const challengesCollection = database.collection<Challenge>(CHALLENGES_COLLECTION_NAME);
  const solutionsCollection = database.collection<Solution>(SOLUTIONS_COLLECTION_NAME);
  const sourceCodeCollection = database.collection<SourceCode>(SOURCE_CODE_COLLECTION_NAME);
  const repositoriesCollection = database.collection<RepositoryData>(REPOSITORIES_COLLECTION_NAME);

  const challenges = challengesCollection.find();
  const challengeCount = await challengesCollection.estimatedDocumentCount();

  console.log(`Found ${challengeCount} challenges in the DB...`);

  const rundata = {
    challenge_unapproved: 0,
    challenge_vulnerability_unapproved: 0,
    no_repo_found: 0,
    repo_unapproved: 0,
    no_solution_found: 0,
    solution_unapproved: 0,
    no_source_code_found: 0,
    successful_saves: 0,
  };

  let challengeLoopCount = 0;

  for await (const challenge of challenges) {
    try {
      // Ensure that the challenge and the vulnerability are both approved.
      const challengeId = challenge._id;

      if (challenge.status !== 'approved') {
        // console.warn(
        //   `Challenge not approved for ${challengeId}. Skipping...`,
        // );
        rundata.challenge_unapproved++;
        continue;
      }

      if (challenge.vulnerable.status !== 'approved') {
        // console.warn(`Challenge vulnerability not approved for ${challengeId}. Skipping...)
        rundata.challenge_vulnerability_unapproved++;
        continue;
      }
      // Ensure that the repository exists and is approved.
      const repo = await repositoriesCollection.findOne({
        _id: challenge._repo,
      });

      if (!repo) {
        //console.warn(`No repo associated with ${challengeId}. Skipping...`);
        rundata.no_repo_found++;
        continue;
      }

      if (repo.status !== 'approved') {
        // console.warn(
        //   `The repo ID ${repo._id} associated with challenge ID ${challengeId} has not been approved. Skipping...`,
        // );
        rundata.repo_unapproved++;
        continue;
      }

      // Ensure that the solution exists and is approved.
      const solution = await solutionsCollection.findOne({
        _challenge: challengeId,
        type: 'correct',
      });

      if (!solution) {
        //console.warn(`No solution found for challenge ${challengeId}`);
        rundata.no_solution_found++;
        continue;
      }

      if (solution.status !== 'approved') {
        // console.warn(
        //   `The solution ${solution._id} associated with challenge ID ${challengeId} has not been approved. Skipping...`,
        // );
        rundata.solution_unapproved++;
        continue;
      }

      // console.log(
      //   `Challenge ${challengeId} has approved solution (ID: ${solution._id}) and repository (ID: ${repo._id}). Adding to SQL DB...`,
      // );

      const sourceCode = await sourceCodeCollection.findOne({
        _id: challengeId,
      });

      if (!sourceCode) {
        //console.warn(`No source code found for challenge: ${challenge._id}`);
        rundata.no_source_code_found++;
        continue;
      }

      // Ensure that we can retrieve the source code associated with this challenge

      const sourceCodeItems = sourceCode.sourceCode;
      const challengeLanguageFramework = `${challenge.category._id}-${challenge.category._sub}`;
      const hunkPaths = extractHunkPaths(challenge.vulnerable.hunks);

      const challengeDir = path.join(
        MongoDBNames.CHALLENGES_COLLECTION,
        challengeLanguageFramework,
        `difficulty-${challenge.difficulty}`,
        `${challenge.vulnerable.source.ref}-${challenge._id}`,
      );

      const vulnerableFiles: Map<string, Vulnerability> = new Map<string, Vulnerability>();

      const primaryVulnerableFiles = challenge.vulnerable.hunks.primary.files;
      for (const file of primaryVulnerableFiles) {
        const filename = file.path.includes('/') ? file.path.split('/').pop() : file.path;
        if (filename) {
          const vulnerableFile = vulnerableFiles.get(filename);
          if (vulnerableFile) {
            vulnerableFile.vulnerableLines = vulnerableFile.vulnerableLines.concat(file.lines);
            vulnerableFiles.set(filename, vulnerableFile);
          } else {
            vulnerableFiles.set(filename, {
              path: file.path,
              filename: filename,
              type: 'primary_vulnerability',
              vulnerableLines: file.lines,
            });
