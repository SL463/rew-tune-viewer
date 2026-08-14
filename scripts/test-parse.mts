import * as fs from "fs";
import { parseMdat } from "../src/lib/rew/parseMdat.js";

const path = process.argv[2];
const buf = fs.readFileSync(path);
console.time("parse");
const tune = parseMdat(buf);
console.timeEnd("parse");
console.log("measurements:", tune.measurements.length);
for (const m of tune.measurements) {
  console.log(
    `  [${m.sortIndex}] ${m.name} | band=${m.band} ch=${m.channel} grp=${m.group} | spl=${m.spl.freqs.length} f0=${m.spl.freqs[0]?.toFixed(1)} fN=${m.spl.freqs.at(-1)?.toFixed(0)} | imp=${m.impulse?.samples.length ?? 0}`
  );
}
const m0 = tune.measurements.find((m) => m.name.includes("FL High") && m.group === "FINAL");
if (m0) {
  console.log("\nFL High FINAL spl (freq,mag):");
  for (let i = 0; i < 5; i++) console.log("   ", m0.spl.freqs[i].toFixed(1), m0.spl.mags[i].toFixed(2));
  console.log("impulse peak:", m0.impulse?.peak, "t0:", m0.impulse?.t0?.toFixed(4), "dt:", m0.impulse?.dt);
}
const json = JSON.stringify(tune);
console.log("\nJSON size:", (json.length / 1024).toFixed(0), "KB");
