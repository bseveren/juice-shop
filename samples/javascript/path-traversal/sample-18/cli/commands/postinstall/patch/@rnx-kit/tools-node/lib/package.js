function findPackageDependencyDir(ref, options) {
  var _a;
  const pkgName =
    typeof ref === 'string'
      ? ref
      : path.join(
          (_a = ref.scope) !== null && _a !== void 0 ? _a : '',
          ref.name,
        );
  const packageDir = find_up_1.default.sync(
    path.join('node_modules', pkgName),
    {
      ...(0, properties_1.pickValues)(
        options !== null && options !== void 0 ? options : {},
        ['startDir', 'allowSymlinks'],
        ['cwd', 'allowSymlinks'],
      ),
      type: 'directory',
    },
  );
  if (
    !packageDir ||
    !(options === null || options === void 0 ? void 0 : options.resolveSymlinks)
  ) {
    return packageDir;
  }
  return fs.lstatSync(packageDir).isSymbolicLink()
    ? path.resolve(path.dirname(packageDir), fs.readlinkSync(packageDir))
    : packageDir;
}
