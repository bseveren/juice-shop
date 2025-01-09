async function downloadBinaryFile(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    const data = await response.arrayBuffer();
    return Buffer.from(data);
  } catch (error) {
    throw new Error(`Error downloading ${url}: ${error.message}`);
  }
}

async function areBinaryFilesEqual(url1, url2) {
  try {
    // Download the contents of the binary files
    const file1Buffer = await downloadBinaryFile(url1);
    const file2Buffer = await downloadBinaryFile(url2);

    // Compare the contents using Buffer.compare
    const comparisonResult = Buffer.compare(file1Buffer, file2Buffer);

    // If the buffers are equal, comparisonResult will be 0
    return comparisonResult === 0;
  } catch (error) {
    // Handle download errors
    console.error('Error:', error.message);
    return false;
  }
}

export async function compareImagePairsCSV({
  filePath = "./images",
  dom = getDom(),
} = {}) {
  const csv = await readFile(`${filePath}.csv`, { encoding: "utf8" });
  const imgs = await neatCsv(csv);
  const diffs = ["img1,img2,diff,filename matched,unsupported file type"];
  let rowCount = 0;
  for (let row of imgs) {
    let diff;
    let msg = "";
    const fileTypes = ["gif", "jpg", "png", "jpeg", "svg"];
    const result = compareFilenames(row.img1, row.img2);
    if (
      fileTypes.some(
        (fileType) =>
          row.img1.endsWith(`.${fileType}`) && row.img2.endsWith(`.${fileType}`)
      )
    ) {
      diff = await compareImagePair(row.img1, row.img2, { dom });
    } else {
      const areBinaryEqual = await areBinaryFilesEqual(row.img1, row.img2);
      if (areBinaryEqual) {
        diff = 0;
      } else {
        diff = "N/A";
        msg = `fileType: ${row.img2.split(".").pop()}`;
      }
    }
    console.log(`row ${++rowCount} complete: Pixel Diff: ${diff}, ${msg}`);
    diffs.push(
      `${row.img1},${row.img2},${diff},${result},${path.extname(row.img1)}`
    );
  }
  await writeFile(`${filePath}-diffs.csv`, diffs.join("\n"));
}
