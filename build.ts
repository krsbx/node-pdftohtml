import type { BuildOptions, Plugin, PluginBuild } from 'esbuild';
import { build } from 'esbuild';
import { glob } from 'glob';
import { exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { rimraf } from 'rimraf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cjsPath = path.resolve(__dirname, 'assets/cjs/package.cjs.json');
const execAynsc = promisify(exec);

type ExternalOptions = {
  cjs?: string[];
  esm?: string[];
};

type BuildPackageOptions = {
  entryPoint: string;
  ignore: string[];
  outBase: string;
  outDir: string;
  tsconfig: string;
  external?: ExternalOptions;
};

type AddExtensionOption = {
  buildExtension?: string;
  sourceExtension?: string;
};

function addExtension(
  options: AddExtensionOption = {
    buildExtension: '.js',
    sourceExtension: '.ts',
  }
): Plugin {
  return {
    name: 'add-extension',
    setup(build: PluginBuild) {
      // eslint-disable-next-line @typescript-eslint/no-shadow
      build.onResolve({ filter: /.*/ }, (args) => {
        if (args.importer) {
          const p = path.join(args.resolveDir, args.path);
          let tsPath = `${p}${options.sourceExtension}`;

          let importPath = '';
          if (fs.existsSync(tsPath)) {
            importPath = args.path + options.buildExtension;
          } else {
            tsPath = path.join(
              args.resolveDir,
              args.path,
              `index${options.sourceExtension}`
            );
            if (fs.existsSync(tsPath)) {
              importPath = `${args.path}/index${options.buildExtension}`;
            }
          }
          return { path: importPath, external: true };
        }
      });
    },
  };
}

export async function buildPackage(options: BuildPackageOptions) {
  console.log('Removing old build files...');

  await rimraf(options.outDir);

  const entryPoints = glob.sync(options.entryPoint, {
    ignore: options.ignore,
  });

  const buildOptions: BuildOptions = {
    entryPoints,
    logLevel: 'info',
    platform: 'node',
  };

  const buildPath = {
    cjs: path.join(options.outDir, 'cjs'),
    esm: path.join(options.outDir, 'esm'),
    types: path.join(options.outDir, 'types'),
  };

  function buildCjs() {
    return build({
      ...buildOptions,
      outbase: options.outBase,
      outdir: buildPath.cjs,
      format: 'cjs',
      external: options.external?.cjs,
      bundle: !!options.external?.cjs,
    });
  }

  function buildEsm() {
    return build({
      ...buildOptions,
      outbase: options.outBase,
      outdir: buildPath.esm,
      format: 'esm',
      external: options.external?.esm,
      bundle: !!options.external?.esm,
      plugins: [
        addExtension({
          buildExtension: '.js',
          sourceExtension: '.ts',
        }),
      ],
    });
  }

  await Promise.all([buildCjs(), buildEsm()]);

  console.log('Writing type definitions...');

  await execAynsc(
    `npx tsc --project ${options.tsconfig} --noEmit false --declaration --declarationDir ${buildPath.types} --emitDeclarationOnly --outDir dist`
  );

  console.log('Copying files common package.json ...');

  fs.copyFileSync(cjsPath, path.resolve(buildPath.cjs, 'package.json'));

  console.log('Build finished successfully!');
}

buildPackage({
  entryPoint: 'src/**/*.ts',
  ignore: ['**/*.test.ts'],
  outBase: 'src',
  outDir: 'dist',
  tsconfig: path.join(__dirname, 'tsconfig.json'),
});
