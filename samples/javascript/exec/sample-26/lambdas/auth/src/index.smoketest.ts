import { execSync } from 'child_process';
import * as tempy from 'tempy';
import * as fs from 'fs';
import pkgDir from 'pkg-dir';
import * as yaml from 'yaml';

type ServerlessConfig = {
  functions: Record<string, { handler: string }>;
};

const rootDir = pkgDir.sync();
const serverlessConfig: ServerlessConfig = yaml.parse(
  fs.readFileSync(`${rootDir}/serverless.yml`, 'utf8'),
);
const pkgJson = JSON.parse(fs.readFileSync(`${rootDir}/package.json`, 'utf8'));
const functions = Object.entries(serverlessConfig.functions).map(
  ([name, { handler }]) => ({
    name,
    handler,
  }),
);

jest.setTimeout(1000 * 60 * 5);

describe('packaged lambdas can be loaded in nodejs', () => {
  // Due to split-stacks, `sls package` needs access to aws resources per environment which is a pain.
  // This means that dev and staging are untested, but we care the most about production anyway.
  describe('production stage', () => {
    const stage = 'production';
    let tempDir: string;
    let packageDir: string;
    let extractedPath: string;

    beforeAll(async () => {
      tempDir = tempy.directory();
      packageDir = `${tempDir}/${stage}`;
      extractedPath = `${packageDir}/extracted`;

      execSync(`yarn run -T turbo build --filter ${pkgJson.name}`, {
        // only way to get readable output when things go wrong
        stdio: 'inherit',
      });

      execSync(
        `yarn sls package --stage ${stage} --package ${packageDir} --verbose`,
        {
          // only way to get readable output when things go wrong
          stdio: 'inherit',
        },
      );

      execSync(`mkdir -p ${extractedPath}`);
      execSync(
        `unzip -o ${packageDir}/${pkgJson.name}.zip -d ${extractedPath}`,
        {
          maxBuffer: 1024 * 1024 * 100,
        },
      );
    });

    test('zip is less than 50MB (aws limit)', async () => {
      const zipSize = fs.statSync(`${packageDir}/${pkgJson.name}.zip`).size;
      const zipSizeMB = zipSize / 1024 / 1024;

      expect(zipSizeMB).toBeLessThan(50);
    });

    test.each(functions)(
      '$name has a valid function at $handler',
      async ({ handler }) => {
        const [handlerPath, handlerMethod] = handler.split('.');

        const consoleLogs = execSync(
          `node --eval "const lambda = require('./${handlerPath}'); console.log('method typeof:', typeof lambda['${handlerMethod}'])";`,
          {
            cwd: extractedPath,
            env: {
              LDT_ENV: 'production',
            },
          },
        )
          .toString()
          .trim();

        expect(consoleLogs).toContain('method typeof: function');
      },
    );

    afterAll(async () => {
      execSync(`rm -rf ${tempDir}`);
    });
  });
});
