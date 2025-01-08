var commandExistsUnixSync = function(commandName) {
  if(fileNotExistsSync(commandName)){
      try {
        var stdout = execSync('command -v ' + commandName +
              ' 2>/dev/null' +
              ' && { echo >&1 \'' + commandName + ' found\'; exit 0; }'
              );
        return !!stdout;
      } catch (error) {
        return false;
      }
  }

  return localExecutableSync(commandName);

}

module.exports.commandExistsSync = function(commandName) {
  if (isUsingWindows) {
    return commandExistsWindowsSync(commandName);
  } else {
    return commandExistsUnixSync(commandName);
  }
};
