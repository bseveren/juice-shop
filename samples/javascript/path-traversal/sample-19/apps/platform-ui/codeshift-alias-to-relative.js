function replacePathAlias(currentFilePath, importPath, pathMap) {
  // if windows env, convert backslashes to "/" first
  // console.log({ currentFilePath });
  currentFilePath = path.posix.join(...currentFilePath.split(path.sep));
  // console.log({ currentFilePath, importPath });

  const regex = createRegex(pathMap);
  return importPath.replace(regex, replacer);

  function replacer(_, alias, rest) {
    const mappedImportPath = pathMap[alias] + rest;
    // use path.posix to also create foward slashes on windows environment
    let mappedImportPathRelative = path.posix.relative(
      path.dirname(currentFilePath),
      mappedImportPath
    );
    // console.log({ mappedImportPath, mappedImportPathRelative });
    // append "./" to make it a relative import path
    if (!mappedImportPathRelative.startsWith("../")) {
      mappedImportPathRelative = `./${mappedImportPathRelative}`;
    }

    logReplace(currentFilePath, mappedImportPathRelative);

    return mappedImportPathRelative;
  }
}

module.exports = function transform(file, api) {
  const j = api.jscodeshift.withParser("tsx");
  const root = j(file.source);

  root.find(j.ImportDeclaration).forEach(replaceNodepathAliases);
  root.find(j.ExportAllDeclaration).forEach(replaceNodepathAliases);

  /**
   * Filter out normal module exports, like export function foo(){ ...}
   * Include export {a} from "mymodule" etc.
   */
  root
    .find(j.ExportNamedDeclaration, (node) => node.source !== null)
    .forEach(replaceNodepathAliases);

  return root.toSource();

  function replaceNodepathAliases(impExpDeclNodePath) {
    impExpDeclNodePath.value.source.value = replacePathAlias(
      file.path,
      impExpDeclNodePath.value.source.value,
      pathMapping
    );
  }
};
