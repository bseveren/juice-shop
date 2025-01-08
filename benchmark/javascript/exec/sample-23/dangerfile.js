function git(args) {
  return new Promise((resolve, reject) => {
    exec(`git ${args}`, (err, stdout) => {
      if (err) {
        reject(err);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

async function reportBundleSizeCleanup() {
  await git(`remote remove ${UPSTREAM_REMOTE}`);
}


/**
 * Puts results in different buckets wh
 * @param {*} results
 */
function sieveResults(results) {
  const main = [];
  const pages = [];

  results.forEach((entry) => {
    const [bundleId] = entry;

    if (bundleId.startsWith('docs:')) {
      pages.push(entry);
    } else {
      main.push(entry);
    }
  });

  return { all: results, main, pages };
}

function prepareBundleSizeReport() {
  markdown(
    `Bundle size will be reported once [CircleCI build #${circleCIBuildNumber}](${circleCIBuildUrl}) finishes.`,
  );
}

// A previous build might have failed to produce a snapshot
// Let's walk up the tree a bit until we find a commit that has a successful snapshot
async function loadLastComparison(upstreamRef, n = 0) {
  const mergeBaseCommit = await git(`merge-base HEAD~${n} ${UPSTREAM_REMOTE}/${upstreamRef}`);
  try {
    return await loadComparison(mergeBaseCommit, upstreamRef);
  } catch (err) {
    if (n >= 5) {
      throw err;
    }
    return loadLastComparison(upstreamRef, n + 1);
  }
}

async function reportBundleSize() {
  // Use git locally to grab the commit which represents the place
  // where the branches differ
  const upstreamRepo = danger.github.pr.base.repo.full_name;
  const upstreamRef = danger.github.pr.base.ref;
  try {
    await git(`remote add ${UPSTREAM_REMOTE} https://github.com/${upstreamRepo}.git`);
  } catch (err) {
    // ignore if it already exist for local testing
  }
  await git(`fetch ${UPSTREAM_REMOTE}`);

  const comparison = await loadLastComparison(upstreamRef);

  const detailedComparisonRoute = `/size-comparison?circleCIBuildNumber=${circleCIBuildNumber}&baseRef=${danger.github.pr.base.ref}&baseCommit=${comparison.previous}&prNumber=${danger.github.pr.number}`;
  const detailedComparisonUrl = `https://bar-dashboard.foo.app${detailedComparisonRoute}`;

  const { all: allResults, main: mainResults } = sieveResults(Object.entries(comparison.bundles));
  const anyResultsChanges = allResults.filter(createComparisonFilter(1, 1));

  if (anyResultsChanges.length > 0) {
    const importantChanges = mainResults
      .filter(createComparisonFilter(parsedSizeChangeThreshold, gzipSizeChangeThreshold))
      .filter(isPackageComparison)
      .map(generateEmphasizedChange);

    // have to guard against empty strings
    if (importantChanges.length > 0) {
      markdown(importantChanges.join('\n'));
    }

    const details = `[Details of bundle changes](${detailedComparisonUrl})`;

    markdown(details);
  } else {
    markdown(`[No bundle size changes](${detailedComparisonUrl})`);
  }
}

async function run() {
  const fooPreview = `https://deploy-preview-${process.env.CIRCLE_PR_NUMBER}--material-ui.foo.app/`;
  message(`foo deploy preview: <a href="${fooPreview}">${fooPreview}</a>`);

  switch (dangerCommand) {
    case 'prepareBundleSizeReport':
      prepareBundleSizeReport();
      break;
    case 'reportBundleSize':
      try {
        await reportBundleSize();
      } finally {
        await reportBundleSizeCleanup();
      }
      break;
    default:
      throw new TypeError(`Unrecognized danger command '${dangerCommand}'`);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
