import { minify } from "terser";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const extensionRoot = path.resolve(__dirname, "..");
const distRoot = path.join(extensionRoot, "dist");

const TOP_LEVEL_IGNORES = new Set([
  "dist",
  "node_modules",
  "scripts",
  "package.json",
  "package-lock.json",
  ".DS_Store"
]);

async function copyExtensionToDist() {
  await fs.rm(distRoot, { recursive: true, force: true });
  await fs.mkdir(distRoot, { recursive: true });
  await copyDir(extensionRoot, distRoot);
}

async function copyDir(srcDir, dstDir) {
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const rel = path.relative(extensionRoot, srcPath);
    const top = rel.split(path.sep)[0];
    if (TOP_LEVEL_IGNORES.has(top)) continue;

    const dstPath = path.join(dstDir, entry.name);
    if (entry.isDirectory()) {
      await fs.mkdir(dstPath, { recursive: true });
      await copyDir(srcPath, dstPath);
      continue;
    }
    if (entry.isFile()) {
      await fs.copyFile(srcPath, dstPath);
    }
  }
}

async function collectJsFiles(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectJsFiles(fullPath, out);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".js")) {
      out.push(fullPath);
    }
  }
  return out;
}

async function minifyJsFiles(files) {
  for (const file of files) {
    const code = await fs.readFile(file, "utf8");
    const minified = await minify(code, {
      module: false,
      compress: {
        passes: 2,
        drop_console: false,
        drop_debugger: false
      },
      mangle: {
        toplevel: true,
        keep_classnames: false,
        keep_fnames: false,
        safari10: true
      },
      format: {
        comments: false,
        ascii_only: true
      }
    });
    if (!minified.code) {
      throw new Error(`Minify failed for ${path.relative(distRoot, file)}`);
    }

    await fs.writeFile(file, minified.code, "utf8");
  }
}

async function main() {
  await copyExtensionToDist();
  const jsFiles = await collectJsFiles(distRoot);
  await minifyJsFiles(jsFiles);
  console.log(`dist build done: ${jsFiles.length} js files minified`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
