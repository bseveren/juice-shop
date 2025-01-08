export class CodeIndexer extends BaseRag {
  private constructor(private indexFile: string) {
    super('./data/vector/sdkMethodIndex.json');
  }

  public async Query(query: string, n: number): Promise<SDKMethodIndex[]> {
    return this.findNMostRelevantMethods(query, n);
  }

  static async fromIndex(indexFile: string): Promise<CodeIndexer> {
    return new CodeIndexer(indexFile);
  }

  static async fromTypeScriptDefinitionFiles(
    directory: string,
    entryPoint: { typeName: string },
    indexFile: string,
  ): Promise<CodeIndexer> {
    const files = this.findDtsFiles(directory);

    // create hash of all files
    const hash = files.reduce((acc, file) => {
      return acc + Bun.hash(fs.readFileSync(file));
    }, '');

    if (fs.existsSync(indexFile)) {
      const index = JSON.parse(fs.readFileSync(indexFile).toString());
      if (index.hash === hash) {
        return CodeIndexer.fromIndex(indexFile);
      }
    }

    const methods = await this.createSDKMethodIndex(files, entryPoint.typeName);

    fs.writeFileSync(indexFile, JSON.stringify({ hash, entryPoint, methods }, null, 2));

    return CodeIndexer.fromIndex(indexFile);
  }

  private static findDtsFiles(dir: string): string[] {
    const dtsFiles: string[] = [];

    fs.readdirSync(dir).forEach((file) => {
      const filePath = path.join(dir, file);

      if (fs.lstatSync(filePath).isDirectory()) {
        dtsFiles.push(...this.findDtsFiles(filePath));
      } else if (file.endsWith('.d.ts')) {
        dtsFiles.push(filePath);
      }
    });

    return dtsFiles;
  }

  static async createSDKMethodIndex(
    fileNames: string[],
    entryPointTypeName: string,
    entryPointVarName?: string,
  ): Promise<SDKMethodIndex[]> {
    const project = new tsMorph.Project();

    for (const fileName of fileNames) {
      project.addSourceFileAtPath(fileName);
    }

    const entrypoint: tsMorph.InterfaceDeclaration | tsMorph.ClassDeclaration | undefined = project
      .getSourceFiles()
      .map((source) => {
        return (
          source.getDescendantsOfKind(tsMorph.SyntaxKind.InterfaceDeclaration).find((node) => {
            const nodeName = node.getName();
            return nodeName === entryPointTypeName;
          }) ??
          source.getDescendantsOfKind(tsMorph.SyntaxKind.ClassDeclaration).find((node) => {
            return node.getName() === entryPointTypeName;
          })
        );
      })
      .find((node) => node !== undefined);

    if (!entrypoint) {
      throw new Error('Could not find entry point');
    }

    const results: SDKMethodIndex[] = [];
    const callStack = entryPointTypeName !== undefined ? [entryPointVarName!] : [];
    await this.traverse(entrypoint, callStack, results);

    // await createEmbedding(results);

    return results;
  }

  static resolveTypeRef(t: tsMorph.Type<tsMorph.ts.Type>, onlyInternal = true): tsMorph.Node<tsMorph.ts.Node> | null {
    const typeSymbol = t.getSymbol();
    if (typeSymbol) {
      const declarations = typeSymbol.getDeclarations();
      const interfaceDeclaration = declarations.find(
        (decl) =>
