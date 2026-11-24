// Solmar City — hand-in program for make.fun competition gta6-01.
// Copies game/ and screenshots/ from this repository into the output
// directory and writes dossier.json with the kit library's builder.
// Run: MAKEFUN_OUTPUT_DIR=out node main.ts
// (Without the variable, the grader's /output is used.)
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`Solmar City dossier written to ${join(outDir, 'dossier.json')} (${dossier.length} bytes)`);
