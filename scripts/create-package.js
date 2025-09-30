#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// 创建读取接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 提示用户输入的函数
function askForPackageName() {
  return new Promise(resolve => {
    rl.question("请输入包名: ", answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// 获取包名的异步函数
async function getPackageName() {
  const args = process.argv.slice(2);

  if (args.length > 0) {
    // 如果命令行参数中有包名，直接使用
    return args[0];
  } else {
    // 如果没有包名，提示用户输入
    console.log("未检测到包名参数");
    const pkgName = await askForPackageName();

    if (!pkgName) {
      console.error("包名不能为空！");
      process.exit(1);
    }

    return pkgName;
  }
}

// 主函数
async function main() {
  const pkgName = await getPackageName();
  const scope = "@wklwyue"; // 替换为你的 npm scope
  const pkgDir = path.join(__dirname, "../packages", pkgName);

  if (fs.existsSync(pkgDir)) {
    console.error(`包 ${pkgName} 已经存在！`);
    process.exit(1);
  }

  // 创建目录
  fs.mkdirSync(pkgDir, { recursive: true });
  fs.mkdirSync(path.join(pkgDir, "src"));
  fs.mkdirSync(path.join(pkgDir, "__tests__"));

  // package.json
  const packageJson = {
    name: `${scope}/${pkgName}`,
    version: "1.0.0",
    main: "dist/index.cjs",
    module: "dist/index.mjs",
    types: "dist/index.d.ts",
    files: ["dist"],
    scripts: {
      build: "tsup"
    },
    sideEffects: false
  };
  fs.writeFileSync(path.join(pkgDir, "package.json"), JSON.stringify(packageJson, null, 2));

  // tsconfig.json
  const tsconfigJson = {
    extends: "../../tsconfig.base.json",
    compilerOptions: {
      outDir: "dist"
    },
    include: ["src", "__tests__"]
  };
  fs.writeFileSync(path.join(pkgDir, "tsconfig.json"), JSON.stringify(tsconfigJson, null, 2));

  // 创建默认 index.ts 和测试文件
  fs.writeFileSync(path.join(pkgDir, "src/index.ts"), `export const hello = () => console.log('Hello ${pkgName}');\n`);
  fs.writeFileSync(
    path.join(pkgDir, "__tests__/index.test.ts"),
    `import { describe, it, expect, vi } from 'vitest';
import { hello } from '../src/index';

describe('${pkgName}', () => {
  it('should run hello', () => {
    expect(typeof hello).toBe('function');
  });
});\n`
  );

  console.log(`✅ 子包 ${pkgName} 创建成功！`);
  console.log(`cd packages/${pkgName} 并运行 pnpm run build 进行构建`);
}

// 运行主函数
main().catch(error => {
  console.error("创建包时发生错误:", error);
  process.exit(1);
});
