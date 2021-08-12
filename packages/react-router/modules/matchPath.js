import pathToRegexp from "path-to-regexp";

const cache = {};
const cacheLimit = 10000;
let cacheCount = 0;

// 其实就是借助了pathToRegexp这个库做了一个匹配compile
// 例如 /:user 这样子的url 匹配出来参数等
// 内部加了一个10000容量的缓存，缓存的结构大概是 {三个选项拼接的字符串key: {pathkey：compile结果}}
function compilePath(path, options) {
  const cacheKey = `${options.end}${options.strict}${options.sensitive}`;
  const pathCache = cache[cacheKey] || (cache[cacheKey] = {});

  if (pathCache[path]) return pathCache[path];

  const keys = [];
  const regexp = pathToRegexp(path, keys, options);
  const result = { regexp, keys };

  if (cacheCount < cacheLimit) {
    pathCache[path] = result;
    cacheCount++;
  }

  return result;
}

/**
 * Public API for matching a URL pathname to a path.
 */
// 如果不匹配会返回null的，匹配就会返回正常的match形式
function matchPath(pathname, options = {}) {
  // 参数统一转化为对象的形式，如果是字符串和数组则认为是传入了path
  if (typeof options === "string" || Array.isArray(options)) {
    options = { path: options };
  }

  // 还是参数处理 赋值一些默认参数
  const { path, exact = false, strict = false, sensitive = false } = options;

  const paths = [].concat(path);

  return paths.reduce((matched, path) => {
    if (!path && path !== "") return null;
    if (matched) return matched;

    const { regexp, keys } = compilePath(path, {
      end: exact,
      strict,
      sensitive
    });
    const match = regexp.exec(pathname);

    if (!match) return null;

    const [url, ...values] = match;
    // 这里exact 会做全等匹配 将url和pathname
    const isExact = pathname === url;

    if (exact && !isExact) return null;

    return {
      path, // the path used to match
      url: path === "/" && url === "" ? "/" : url, // the matched portion of the URL
      isExact, // whether or not we matched exactly
      params: keys.reduce((memo, key, index) => {
        memo[key.name] = values[index];
        return memo;
      }, {})
    };
  }, null);
}

export default matchPath;
