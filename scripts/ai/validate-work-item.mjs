import fs from 'node:fs';
import path from 'node:path';

const REQUIRED_SECTIONS = [
  '背景/目标',
  '方案设计（Designer）',
  '约束对齐（Constraints）',
  '测试用例（最小自测）',
  'Review 清单（Reviewer）',
  '实施记录（Builder）',
  '交付物',
];

function listWorkItems(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => {
      const fullPath = path.join(dir, e.name);
      const stat = fs.statSync(fullPath);
      return { fullPath, mtimeMs: stat.mtimeMs, name: e.name };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function readFileOrThrow(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Work Item 不存在：${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function normalizeNewlines(s) {
  return s.replace(/\r\n/g, '\n');
}

function extractSectionContent(markdown, sectionTitle) {
  const md = normalizeNewlines(markdown);
  const heading = new RegExp(`^##\\s+${escapeRegExp(sectionTitle)}\\s*$`, 'm');
  const match = md.match(heading);
  if (!match || match.index == null) return null;

  const startIdx = match.index + match[0].length;
  const rest = md.slice(startIdx);
  const nextHeadingIdx = rest.search(/^##\s+/m);
  const content = nextHeadingIdx === -1 ? rest : rest.slice(0, nextHeadingIdx);
  return content.trim();
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isMeaningfullyFilled(content) {
  if (!content) return false;
  const cleaned = content
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/```[\s\S]*?```/g, (m) => m.trim())
    .trim();
  if (!cleaned) return false;
  const placeholders = ['TODO', 'TBD', '待补充', '（可选）'];
  return !placeholders.some((p) => cleaned === p);
}

function countTestCases(markdown) {
  const md = normalizeNewlines(markdown);
  const inputs = md.match(/^\s*-\s*Input\s*:/gmi)?.length ?? 0;
  const expecteds = md.match(/^\s*-\s*Expected\s*:/gmi)?.length ?? 0;
  return { inputs, expecteds, pairs: Math.min(inputs, expecteds) };
}

function validateWorkItem(markdown) {
  const errors = [];

  for (const title of REQUIRED_SECTIONS) {
    const content = extractSectionContent(markdown, title);
    if (content == null) {
      errors.push(`缺少必需 section：## ${title}`);
      continue;
    }
    if (!isMeaningfullyFilled(content)) {
      errors.push(`section 内容为空或仅占位：## ${title}`);
    }
  }

  const tc = countTestCases(markdown);
  if (tc.pairs < 2) {
    errors.push(
      `测试用例不足：需要至少 2 组 Input/Expected（当前 Input=${tc.inputs}, Expected=${tc.expecteds}）`,
    );
  }

  const gateMatch = normalizeNewlines(markdown).match(
    /^Reviewer Gate:\s*(PASS|FAIL)\s*$/mi,
  );
  if (!gateMatch) {
    errors.push('缺少 Reviewer Gate 结论：请在「Review 清单」里写 `Reviewer Gate: PASS | FAIL`');
  }

  return errors;
}

function main() {
  const repoRoot = process.cwd();
  const preferredDir = path.join(repoRoot, 'AIdocs', 'ai', 'work-items');
  const legacyDir = path.join(repoRoot, 'docs', 'ai', 'work-items');
  const defaultDir = fs.existsSync(preferredDir)
    ? preferredDir
    : fs.existsSync(legacyDir)
      ? legacyDir
      : preferredDir;

  const arg = process.argv[2];
  let workItemPath = arg ? path.resolve(repoRoot, arg) : null;

  if (!workItemPath) {
    const items = listWorkItems(defaultDir);
    if (items.length === 0) {
      console.error(`未找到 Work Item：请在 ${defaultDir} 下创建一个 .md 文件`);
      process.exit(2);
    }
    workItemPath = items[0].fullPath;
  }

  const md = readFileOrThrow(workItemPath);
  const errors = validateWorkItem(md);
  if (errors.length > 0) {
    console.error(`Work Item 校验失败：${path.relative(repoRoot, workItemPath)}`);
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }

  console.log(`Work Item 校验通过：${path.relative(repoRoot, workItemPath)}`);
}

main();
