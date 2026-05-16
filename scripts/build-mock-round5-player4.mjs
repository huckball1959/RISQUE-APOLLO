/**
 * Back-compat wrapper — same as: node scripts/build-mock-round-last-player.mjs 5
 */
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const r = spawnSync(process.execPath, [join(__dirname, "build-mock-round-last-player.mjs"), "5"], {
  stdio: "inherit",
  shell: false
});
process.exit(r.status ?? 1);
