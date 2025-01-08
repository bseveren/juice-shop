import { getPhotoMatches } from "./lib.js";

const allPlatformPairs = [
  {
    source: "airbnb",
    target: "vrbo",
    region: "amsterdam",
  },
  {
    source: "airbnb",
    target: "tripadvisor",
    region: "amsterdam",
  },
];

export function getPlatformsPhotoMatches() {
  return Promise.all(
    allPlatformPairs.reverse.map((platformPair) =>
      getPhotoMatches(platformPair.source, platformPair.target, platformPair.region)
    )
  );
}
