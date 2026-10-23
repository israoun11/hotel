// Copies the official photos of menarahammamet.com into public/photos/ so the site no longer depends on
// the hotel's website being reachable. Run once with internet access:  npm run photos:download
// Only download photos the hotel has allowed you to use.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = await readFile(path.join(root, "src/content/photos.ts"), "utf8");
const entries = [...source.matchAll(/photo\("([a-z0-9-]+)", "([^"]+)"/g)].map(([, id, remotePath]) => ({ id, remotePath }));
const outDir = path.join(root, "public/photos");
await mkdir(outDir, { recursive: true });

const ok = [];
for (const { id, remotePath } of entries) {
  const url = `https://www.menarahammamet.com/images/${remotePath}`;
  try {
    const response = await fetch(url);
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || !type.startsWith("image/")) throw new Error(`HTTP ${response.status} ${type}`);
    await writeFile(path.join(outDir, `${id}.jpg`), Buffer.from(await response.arrayBuffer()));
    ok.push(id);
    console.log(`ok    ${id}`);
  } catch (error) {
    console.log(`fail  ${id}  (${error instanceof Error ? error.message : String(error)})`);
  }
}

const manifestPath = path.join(root, "src/content/photo-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.local = ok;
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`\n${ok.length}/${entries.length} photos saved in public/photos. Restart \`npm run dev\` to use them.`);
