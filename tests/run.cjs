// Draait alle testsuites tegen voorbeeld/index.html. Bouw eerst het voorbeeld opnieuw als je code wijzigde.
const { execFileSync } = require('child_process'); const path = require('path');
let fout = 0;
for (const t of ['t4','t5','t6','t7','t8','t9','tacc','tth','tline']) {
  console.log(`\n=== ${t} ===`);
  try { execFileSync('node', [path.join(__dirname, t + '.cjs')], { stdio: 'inherit', cwd: __dirname }); }
  catch { fout++; }
}
console.log(fout ? `\n${fout} suite(s) met fouten` : '\nAlle suites geslaagd'); process.exit(fout ? 1 : 0);
