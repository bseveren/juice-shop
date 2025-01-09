import fs from "fs";
import path from "node:path";
import { callPhotomatcher } from "./photomatcher.js";

const ALL_PATH = "/data";
const TEMP_PATH = "/tmp/photomatcher";

export function getPhotoMatches(source, target, region) {
  fs.removeSync(TEMP_PATH);

  let sFromDir = path.join(ALL_PATH, "photos", source, region);
  let sToDir = path.join(TEMP_PATH, "photos", source, region);
  fs.copySync(sFromDir, sToDir);

  sFromDir = path.join(ALL_PATH, "photos", target, region);
  sToDir = path.join(TEMP_PATH, "photos", target, region);
  fs.copySync(sFromDir, sToDir);

  return callPhotomatcher(TEMP_PATH, source, target);
}
