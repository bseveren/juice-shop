exports.processWorkflowJob = async (workflowJob) => {
  const { run_id } = workflowJob;

  const runExistsQuery = `SELECT 1 FROM workflow_runs WHERE run_id = $1`;
  const result = await pool.query(runExistsQuery, [run_id]);

  if (result.rows.length === 0) {
    jobQueue.push(workflowJob);
  } else {
    await updateJobData(workflowJob);
    await fetchAndParseArtifact(run_id);
  }
}

async function fetchAndParseArtifact(runId) {
  const hasFoundArtifactOrRepoData = await shouldFetchArtifact(runId);

  if (!hasFoundArtifactOrRepoData) {
    console.log(`No need to fetch or unable to fetch artifact for runId: ${runId}`);
    return;
  }

  try {
    const artifactUrl = await getArtifactUrlFromDb(runId);
    if (artifactUrl) {
      const artifactData = await downloadAndParseArtifact(artifactUrl);
      await updateDatabaseWithArtifactData(pool, runId, artifactData);
      console.log(`Artifact data updated for runId: ${runId}`);
    } else {
      console.log(`Waiting for artifact URL to be available in DB for runId: ${runId}`);
    }
  } catch (error) {
    console.error(`Error processing artifact for runId: ${runId}:`, error);
  }
}

async function getArtifactUrl(artifactUrl) {
  try {
    const response = await axios.get(artifactUrl, { headers });

    const artifact = response.data.artifacts.find(artifact => artifact.name === 'artifact_data');

    if (!artifact) {
      throw new Error('Artifact "artifact_data" not found.');
    }

    return artifact.archive_download_url;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

async function downloadAndParseArtifact(artifactUrl) {
  const artifactDownloadUrl = await getArtifactUrl(artifactUrl);

  const filename = 'artifact_data.json';

  try {
    const response = await axios.get(artifactDownloadUrl, { headers, responseType: 'arraybuffer' });

    const zip = await JSZip.loadAsync(response.data);

    const jsonFile = zip.file(filename);

    if (!jsonFile) {
      throw new Error(`File ${filename} not found in the ZIP archive.`);
    }

    const fileContent = await jsonFile.async('string');
    const parsedJSON = JSON.parse(fileContent);

    return parsedJSON;
  } catch (error) {
    console.error('Cannot download artifact:', error);
    return null;
  }
}
