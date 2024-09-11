import { exec } from 'child_process';
import fs from 'fs';
import fsPromise from 'fs/promises';
import { minify as minifyHtml } from 'html-minifier';
import UglifyJS from 'uglify-js';
import { minify as SWCMinify } from '@swc/core';
import path from 'path';
import { Packer, Input, InputType, InputAction } from 'roadroller';
import ect from 'ect-bin';
const Terser = require('terser');
const { execFileSync } = require('child_process');
const ClosureCompiler = require('google-closure-compiler').compiler;

interface OutputChunk {
  code: string;
  fileName: string;
}

const USE_ROAD_ROLLER = true;
const USE_RR_CONFIG = true;

// swap em out until you get the smallest size
const MINIFIER: 'closure' | 'terser' | 'uglifyjs' | 'swc' | 'none' = 'uglifyjs';

const execAsync = async (command: string) => {
  return new Promise<string>((resolve, reject) => {
    console.log(command);
    exec(command, (err, stdout, stderr) => {
      if (err) {
        reject(err + ',' + stderr);
        return;
      }
      resolve(stdout);
    });
  });
};

async function applyRoadRoller(minifiedHtml: string, minifiedSrc: string) {
  return embedJs(minifiedHtml, {
    code: minifiedSrc,
    fileName: 'index.js',
  });
}

async function embedJs(html: string, chunk: OutputChunk): Promise<string> {
  const scriptTagRemoved = html.replace(
    new RegExp(`<script[^>]*?src=[\./]*${chunk.fileName}[^>]*?></script>`),
    ''
  );
  const htmlInJs = `document.write('${scriptTagRemoved}');` + chunk.code.trim();

  const inputs: Input[] = [
    {
      data: htmlInJs,
      type: 'js' as InputType,
      action: 'eval' as InputAction,
    },
  ];

  let options;
  if (USE_RR_CONFIG) {
    try {
      // throw new Error();
      console.log(' use precalculated config');
      options = JSON.parse(
        fs.readFileSync(`${__dirname}/roadroller-config.json`, 'utf-8')
      );
    } catch (error) {
      throw new Error(
        'Roadroller config not found. Generate one or use the regular build option'
      );
    }
  } else {
    options = { allowFreeVars: true };
  }

  const packer = new Packer(inputs, options);
  fs.writeFileSync(`${path.join(__dirname, '../')}/output.js`, htmlInJs);
  await Promise.all([
    // fs.writeFileSync(`${path.join(__dirname, 'dist')}/output.js`, htmlInJs),
    packer.optimize(true ? 2 : 0), // Regular builds use level 2, but rr config builds use the supplied params
  ]);
  const { firstLine, secondLine } = packer.makeDecoder();
  return `<script>\n${firstLine}\n${secondLine}\n</script>`;
}

function getAllFilePaths(dirPath: string, arrayOfFiles?: string[]) {
  let files = fs.readdirSync(dirPath);

  const arr = arrayOfFiles || [];

  files.forEach(function (file) {
    // if (fs.statSync(dirPath + '/' + file).isDirectory()) {
    //   arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles);
    // } else {
    // }
    arr.push(path.join(dirPath, '/', file));
  });

  return arr.filter((path) => path.match(/\.js$/));
}

async function minifyFiles(filePaths) {
  console.log('minifyfiles', filePaths);

  let minFunc;
  if (MINIFIER === 'terser') {
    minFunc = async (code, filePath) => {
      return (
        await Terser.minify(code, {
          module: true,
          compress: {
            passes: 5,
            pure_getters: true,
            unsafe: true,
            unsafe_math: true,
            hoist_funs: true,
            toplevel: true,
            ecma: 9,
            drop_console: true,
          },
        })
      ).code;
    };
  }
  if (MINIFIER === 'uglifyjs') {
    minFunc = async (code, filePath) => {
      const obj = await UglifyJS.minify(code, {
        // sourceMap: {
        //   filename: 'index.js',
        //   url: 'index.js.map',
        // },
        sourceMap: false,
        toplevel: true,
        compress: {
          passes: 5,
          sequences: true,
          dead_code: true,
          conditionals: true,
          booleans: true,
          unused: true,
          if_return: true,
          join_vars: true,
          drop_console: true,
        },
        mangle: {
          properties: true,
          toplevel: true,
          // except: ['exampleMap']
        },
      });
      if (obj.map) {
        fs.writeFileSync(
          path.resolve(__dirname, '../dist/index.js.map'),
          obj.map
        );
      }
      return obj.code;
    };
  }
  if (MINIFIER === 'swc') {
    minFunc = async (code, filePath) => {
      return (
        await SWCMinify(code, {
          mangle: {
            // properties: {
            //   reserved: [],
            //   undeclared: false,
            // },
            // except: ['exampleMap']
          },
          compress: {
            passes: 5,
            pure_getters: true,
            unsafe: true,
            unsafe_math: true,
            hoist_funs: true,
            toplevel: true,
            drop_console: false,
          },
          module: true,
          sourceMap: false,
          toplevel: true,
        })
      ).code;
    };
  }
  if (MINIFIER === 'closure') {
    minFunc = async (code) => {
      const tempJs = path.resolve(__dirname + '/temp.js');
      fs.writeFileSync(tempJs, code);
      const closureCompiler = new ClosureCompiler({
        js: tempJs,
        externs: __dirname + '/externs.js',
        compilation_level: 'ADVANCED',
        language_in: 'UNSTABLE',
        language_out: 'ECMASCRIPT_2020',
      });
      let minError = '';
      const minifiedCode = await new Promise((resolve, reject) => {
        closureCompiler.run(
          (_exitCode: string, stdOut: string, stdErr: string) => {
            if (stdOut !== '') {
              resolve(stdOut);
            } else if (stdErr !== '') {
              minError = stdErr;
              resolve('');
              return;
            }
            if (stdErr) {
              console.warn(stdErr);
            }
          }
        );
      });
      await execAsync('rm ' + tempJs);
      if (!minifiedCode) {
        console.error('Error minifying', minError);
        throw new Error('Failed to minify');
      }
      // console.log('MINIFIED CODE?', minifiedCode);
      return minifiedCode;
    };
  }
  if (MINIFIER === 'none') {
    minFunc = async (code, filePath) => {
      return code;
    };
  }

  return await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        const unMinCode = fs.readFileSync(filePath, 'utf8').toString();
        const src = await minFunc(unMinCode, filePath);
        fs.writeFileSync(filePath, src);
        return src;
      } catch (e) {
        console.error('Error minifying', filePath, e);
        return e;
      }
    })
  );
}

function processCodeFile(text) {
  // remove import statements
  const lastLineInd = text.lastIndexOf('} from ');
  let endImportsInd = lastLineInd;

  if (lastLineInd > -1) {
    while (text[endImportsInd] !== '\n') {
      endImportsInd++;
    }
  }
  const textWithoutImports = text.slice(endImportsInd + 1);

  // remove export statements + replace const with let
  return textWithoutImports
    .replace(/export /g, '')
    .replace(/const /g, 'let ')
    .replace(/res\/(.*).png/, '$1.png');
}

const build = async () => {
  console.log('Create dist...');

  let htmlFile = fs
    .readFileSync(`${__dirname}/../src/index.html`)
    .toString()
    .replace('index.ts', 'src/index.js');

  const resDistDir = path.resolve(`${__dirname}/../dist/res`);
  const srcDistDir = path.resolve(`${__dirname}/../dist/`);
  fs.mkdirSync(resDistDir, { recursive: true });
  fs.mkdirSync(srcDistDir, { recursive: true });
  await execAsync(`cp -r ${__dirname}/../res/* ${resDistDir}`);

  console.log('\nMinify code...');
  const filePaths = getAllFilePaths(path.resolve(__dirname + '/../src'));
  console.log('files to concat and minify:\n', filePaths.join('\n '));
  const indexFile = filePaths.reduce((resultFile, currentFilePath) => {
    const currentFile = fs.readFileSync(currentFilePath).toString();
    resultFile += processCodeFile(currentFile);
    return resultFile;
  }, '');

  fs.writeFileSync(srcDistDir + '/index.js', indexFile);

  let minifiedFiles: string[] = [];
  try {
    minifiedFiles = await minifyFiles([srcDistDir + '/index.js']);
  } catch (e) {
    console.error('Error during minify', e);
    return;
  }

  console.log('\nMinify html...');
  const minifiedHtml = minifyHtml(htmlFile, {
    includeAutoGeneratedTags: true,
    removeAttributeQuotes: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    sortClassName: true,
    useShortDoctype: true,
    collapseWhitespace: true,
    collapseInlineTagWhitespace: true,
    removeEmptyAttributes: true,
    removeOptionalTags: true,
    sortAttributes: true,
    minifyCSS: true,
  }).replace('src/index.js', 'index.js');
  fs.writeFileSync(
    path.resolve(__dirname + '/../dist/index.html'),
    minifiedHtml
  );
  console.log('wrote', path.resolve(__dirname + '/../dist/index.html'));

  if (USE_ROAD_ROLLER) {
    console.log('apply road roller...');
    const superMinifiedSrc = await applyRoadRoller(
      minifiedHtml,
      minifiedFiles[0]
    );
    fs.writeFileSync(
      path.resolve(__dirname + '/../dist/index.html'),
      superMinifiedSrc
    );
    await execAsync(`rm -rf ${srcDistDir}/index.js`);
    console.log('wrote', path.resolve(__dirname + '/../dist/index.html'));
  }

  // ECT ZIP
  const assetFiles = [srcDistDir + '/res/ts.png'];
  for (const asset of assetFiles) {
    await execAsync(`cp ${asset} ${asset.replace('/res/', '/')}`);
  }

  if (!USE_ROAD_ROLLER) {
    assetFiles.push(srcDistDir + '/index.js');
  }
  const args = [
    '-strip',
    '-zip',
    '-10009',
    srcDistDir + '/index.html',
    ...assetFiles,
  ];
  const result = execFileSync(ect, args);
  await execAsync(`rm -rf ${srcDistDir}/res`);
  // console.log('ECT result', result.toString().trim());
  try {
    await execAsync(`advzip -z -4 ${srcDistDir + '/index.zip'}`);
  } catch (e) {
    console.log('failed adv zip', e);
  }
  try {
    const result = await execAsync(
      `stat -c '%n %s' ${srcDistDir + '/index.zip'}`
    );
    const bytes = parseInt(result.split(' ')[1]);
    const kb13 = 13312;
    console.log(
      `${bytes}b of ${kb13}b (${((bytes * 100) / kb13).toFixed(2)}%)`
    );
  } catch (e) {
    console.log('Stat not supported on Mac D:');
  }

  // ADVZIP
  // const zipFilePath = path.resolve(`${__dirname}/../dist.zip`);
  // console.log('\nZip (command line)...');
  // try {
  //   await execAsync(
  //     `cd dist && zip -9 ${zipFilePath} index.html *.js res/*.png res/*.tmj`
  //   );
  //   console.log(await execAsync(`stat -c '%n %s' ${zipFilePath}`));
  // } catch (e) {
  //   console.log('failed zip', e);
  // }
  // try {
  //   await execAsync(`advzip -z -4 ${zipFilePath}`);
  //   console.log(await execAsync(`stat -c '%n %s' ${zipFilePath}`));
  // } catch (e) {
  //   console.log('failed adv zip', e);
  // }
  // try {
  //   const result = await execAsync(`stat -c '%n %s' ${zipFilePath}`);
  //   const bytes = parseInt(result.split(' ')[1]);
  //   const kb13 = 13312;
  //   console.log(
  //     `${bytes}b of ${kb13}b (${((bytes * 100) / kb13).toFixed(2)}%)`
  //   );
  // } catch (e) {
  //   console.log('Stat not supported on Mac D:');
  // }
};

build().catch((e) => {
  console.log('Build error', e);
});
