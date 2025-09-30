module.exports = {
  printWidth: 144, // 单行长度
  tabWidth: 2, // 缩进长度
  useTabs: false, // 使用空格代替 tab 缩进
  semi: true, // 句末使用分号
  singleQuote: false, // 使用单引号
  quoteProps: "as-needed", // 仅在必需时为对象的 key 添加引号
  jsxSingleQuote: true, // jsx 中使用单引号
  trailingComma: "none", // 多行时尽可能打印尾随逗号
  bracketSpacing: true, // 在对象前后添加空格 - eg: { foo: bar }
  arrowParens: "avoid", // avoid | always 单参数箭头函数参数周围使用圆括号 - eg: (x) => x
  requirePragma: false, // 只格式化文件顶部有特殊注释（pragma）的文件
  insertPragma: false, // 对通过 prettier 格式化后的文件顶部添加 @format 特殊注释
  htmlWhitespaceSensitivity: "css", // 对 HTML 全局空白不敏感
  vueIndentScriptAndStyle: false, // 不对 vue 中的 script 及 style 标签缩进
  endOfLine: "lf" // 结束行形式
};
