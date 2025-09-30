export default {
  printWidth: 144, //单行长度
  tabWidth: 2, //缩进长度
  useTabs: false, //使用空格代替tab缩进
  semi: true, //句末使用分号
  singleQuote: false, //使用单引号
  quoteProps: "as-needed", //仅在必需时为对象的key添加引号
  jsxSingleQuote: true, // jsx中使用单引号
  trailingComma: "none", //多行时尽可能打印尾随逗号
  bracketSpacing: true, //在对象前后添加空格-eg: { foo: bar }
  arrowParens: "avoid", // avoid | always 单参数箭头函数参数周围使用圆括号-eg: (x) => x
  requirePragma: false, // 只格式化文件顶部有特殊注释（pragma）的文件
  insertPragma: false, // 对通过prettier格式化后的文件顶部添加@format特殊注释
  htmlWhitespaceSensitivity: "css", // 对HTML全局空白不敏感
  vueIndentScriptAndStyle: false, // 不对vue中的script及style标签缩进
  endOfLine: "lf" //结束行形式
};
