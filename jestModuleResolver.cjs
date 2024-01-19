const moduleResolver = (path, options) => {
  const jsExtRegex = /\.js$/i
  const resolver = options.defaultResolver
  if (jsExtRegex.test(path)) {
    try {
      return resolver(path.replace(jsExtRegex, '.ts'), options)
    } catch {
      // use default resolver
    }
  }

  return resolver(path, options)
};

module.exports = moduleResolver;
