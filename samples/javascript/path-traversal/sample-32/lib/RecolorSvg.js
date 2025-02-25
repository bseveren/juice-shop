(function() {
  var Color, ColorMatcher, File, GenerateVariants, Replace, path, replaceColors, through;

  Color = require("color");

  ColorMatcher = require("./ColorMatcher");

  path = require("path");

  replaceColors = require("./replaceColors");

  through = require("through2");

  File = require("vinyl");

  Replace = function(colorMatchers, colors) {
    return through.obj(function(file, encoding, callback) {
      var data, outputData, outputFile;
      data = file.contents;
      outputData = replaceColors(data, colorMatchers, colors);
      outputFile = new File({
        cwd: file.cwd,
        base: file.base,
        path: file.path,
        contents: new Buffer(outputData, "utf8")
      });
      this.push(outputFile);
      return callback();
    });
  };

  GenerateVariants = function(colorMatchers, variants) {
    if (variants == null) {
      variants = [];
    }
    return through.obj(function(file, encoding, callback) {
      var baseName, data, extension, fileName, fileNameWithSuffix, i, len, outputData, outputFile, variant;
      for (i = 0, len = variants.length; i < len; i++) {
        variant = variants[i];
        data = file.contents;
        outputData = replaceColors(data, colorMatchers, variant.colors);
        baseName = path.basename(file.path);
        extension = path.extname(baseName);
        fileName = baseName.substr(0, baseName.length - extension.length);
        fileNameWithSuffix = fileName + variant.suffix + extension;
        outputFile = new File({
          cwd: file.cwd,
          base: file.base,
          path: path.join(path.dirname(file.path), fileNameWithSuffix),
          contents: new Buffer(outputData, "utf8")
        });
        this.push(outputFile);
      }
      return callback();
    });
  };

  module.exports = {
    Color: Color,
    ColorMatcher: ColorMatcher,
    Replace: Replace,
    GenerateVariants: GenerateVariants
  };

}).call(this);
