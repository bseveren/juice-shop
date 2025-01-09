function executeShellScript(scriptPath, args, callback) {
  // Join the arguments into a string, ensuring they are properly escaped
  const argsString = args.map((arg) => `"${arg.replace(/"/g, '\\"')}"`).join(' ')

  exec(`${scriptPath} ${argsString}`, (error, stdout, stderr) => {
    if (error) {
      return callback(error, stdout)
    }
    if (stderr) {
      return callback(stderr, stdout)
    }
    callback(null, stdout)
  })
}
