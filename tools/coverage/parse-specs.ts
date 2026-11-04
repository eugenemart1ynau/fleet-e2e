import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import type { Area, Kind, ParsedComment, Suite, TestCard } from './types.ts';

const TAGS = new Set(['@smoke', '@regression', '@destructive']);

export function parseSpecs(root: string): TestCard[] {
  const cards: TestCard[] = [];
  for (const file of specFiles(root)) {
    cards.push(...parseFile(file, root));
  }
  const ids = new Set<string>();
  for (const card of cards) {
    if (ids.has(card.id)) throw new Error(`Duplicate test id: ${card.id}`);
    ids.add(card.id);
  }
  return cards;
}

function specFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.name.endsWith('.spec.ts') && !full.includes(`${path.sep}setup${path.sep}`)) out.push(full);
    }
  };
  walk(path.join(root, 'tests'));
  return out.sort();
}

interface Ctx {
  describeTitle: string;
  describeWhy: string;
  fixme: boolean;
  loopComment: ParsedComment | null;
  env: Record<string, string>;
}

function parseFile(filePath: string, root: string): TestCard[] {
  const text = fs.readFileSync(filePath, 'utf8');
  const rel = path.relative(root, filePath).split(path.sep).join('/');
  const sf = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const consts = new Map<string, ts.Expression>();
  const collect = (node: ts.Node) => {
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.initializer) consts.set(decl.name.text, decl.initializer);
      }
    }
    ts.forEachChild(node, collect);
  };
  collect(sf);

  const note = fileNote(text);
  const cards: TestCard[] = [];
  const ctx: Ctx = { describeTitle: '', describeWhy: '', fixme: false, loopComment: null, env: {} };

  const commentOf = (node: ts.Node): string | undefined => {
    const ranges = ts.getLeadingCommentRanges(text, node.getFullStart()) ?? [];
    const blocks = ranges.filter((r) => r.kind === ts.SyntaxKind.MultiLineCommentTrivia && r.end <= node.getStart(sf));
    const last = blocks[blocks.length - 1];
    return last ? text.slice(last.pos, last.end) : undefined;
  };

  function fail(node: ts.Node, message: string): never {
    const pos = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    throw new Error(`${rel}:${pos.line + 1} ${message}`);
  }

  const record = (call: ts.CallExpression, own: ParsedComment | null, title: string, tag: string) => {
    const parsed = own ?? ctx.loopComment;
    if (!parsed) fail(call, `missing Action/Call, Checks, and Why on "${title}"`);
    if (!ctx.describeTitle) fail(call, `test is outside test.describe: "${title}"`);
    const fn = [...call.arguments].reverse().find((a) => ts.isArrowFunction(a) || ts.isFunctionExpression(a));
    const skips = fn ? collectSkips(fn) : [];
    const pos = sf.getLineAndCharacterOfPosition(call.getStart(sf));
    const placed = place(rel, tag, ctx.fixme);
    cards.push({
      id: `${rel}#${title}`,
      title,
      file: rel,
      line: pos.line + 1,
      describeTitle: ctx.describeTitle,
      describeWhy: ctx.describeWhy,
      layer: rel.includes('/api/') ? 'api' : 'ui',
      suite: placed.suite,
      kind: placed.kind,
      tag,
      area: areaOf(rel),
      verb: parsed.verb,
      actionOrCall: parsed.actionOrCall,
      checks: parsed.checks,
      why: parsed.why,
      projects: placed.projects,
      browsers: placed.browsers,
      runLabel: runLabel(placed.suite, placed.kind),
      skips,
      fileNote: note,
      loopNote: null,
      fixme: ctx.fixme,
    });
  };

  const handleCall = (call: ts.CallExpression, commentRaw: string | undefined): boolean => {
    const described = describeKind(call.expression);
    if (described) {
      const title = evalTitle(call.arguments[0], ctx.env);
      if (!title) fail(call, 'describe title is not a string');
      const parsed = commentRaw ? parseComment(commentRaw) : null;
      if (!parsed) fail(call, `describe is missing Action/Call, Checks, and Why: "${title}"`);
      const fn = call.arguments.find((a) => ts.isArrowFunction(a) || ts.isFunctionExpression(a));
      if (!fn || (!ts.isArrowFunction(fn) && !ts.isFunctionExpression(fn))) fail(call, 'describe has no callback');
      const next: Ctx = {
        describeTitle: title.replace(/\s+@(api|destructive|smoke|regression)\b/g, '').trim(),
        describeWhy: parsed.why,
        fixme: ctx.fixme || described === 'fixme',
        loopComment: null,
        env: ctx.env,
      };
      walk(fn.body ?? fn, next);
      return true;
    }
    if (isTestCall(call.expression)) {
      const title = evalTitle(call.arguments[0], ctx.env);
      if (!title) fail(call, 'test title is not a static string');
      const tag = tagOf(call, ctx.env);
      if (!tag) fail(call, `test is missing a { tag } string: "${title}"`);
      record(call, commentRaw ? parseComment(commentRaw) : null, title, tag);
      return true;
    }
    return false;
  };

  const handleFor = (node: ts.ForOfStatement): boolean => {
    if (!statementHasTest(node.statement)) return false;
    const names = bindingNames(node.initializer);
    if (!names) fail(node, 'for-of binding is not a name or a name list');
    const cases = resolveList(node.expression, consts);
    const raw = commentOf(node);
    const parsed = raw ? parseComment(raw) : null;
    if (!parsed) fail(node, 'loop that generates tests is missing Action/Call, Checks, and Why');
    if (!cases) {
      const sample = firstTest(node.statement);
      if (!sample) fail(node, 'loop has no test');
      const tagExpr = tagExprOf(sample);
      const tag = tagExpr && ts.isStringLiteral(tagExpr) ? tagExpr.text : '@regression';
      const titleNode = sample.arguments[0];
      const rawTitle = titleNode ? titleNode.getText(sf) : 'generated cases';
      record(sample, parsed, `Generated cases ${rawTitle}`, tag);
      cards[cards.length - 1].loopNote =
        'This loop is not a list of string literals, so the cases are one card instead of a guessed list.';
      if (tagExpr && !ts.isStringLiteral(tagExpr)) cards[cards.length - 1].tag = `${tag} (varies by case)`;
      return true;
    }
    for (const values of cases) {
      const env: Record<string, string> = { ...ctx.env };
      if (names.length === 1 && values.__value !== undefined) env[names[0]] = values.__value;
      names.forEach((name, i) => {
        const v = values[`__${i}`];
        if (v !== undefined) env[name] = v;
      });
      const missing = referencedNames(node.statement).filter((name) => env[name] === undefined && names.includes(name));
      if (missing.length) fail(node, `loop case is missing a string for ${missing.join(', ')}`);
      const next: Ctx = { ...ctx, loopComment: parsed, env };
      walk(node.statement, next);
    }
    return true;
  };

  const walk = (node: ts.Node, current: Ctx) => {
    const prev = { ...ctx, env: ctx.env };
    ctx.describeTitle = current.describeTitle;
    ctx.describeWhy = current.describeWhy;
    ctx.fixme = current.fixme;
    ctx.loopComment = current.loopComment;
    ctx.env = current.env;
    const restore = () => {
      ctx.describeTitle = prev.describeTitle;
      ctx.describeWhy = prev.describeWhy;
      ctx.fixme = prev.fixme;
      ctx.loopComment = prev.loopComment;
      ctx.env = prev.env;
    };
    if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)) {
      if (handleCall(node.expression, commentOf(node) ?? commentOf(node.expression))) {
        restore();
        return;
      }
    }
    if (ts.isForOfStatement(node) && handleFor(node)) {
      restore();
      return;
    }
    ts.forEachChild(node, (child) => walk(child, current));
    restore();
  };

  walk(sf, ctx);
  return cards;
}

function referencedNames(node: ts.Node): string[] {
  const names: string[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n) && isTestCall(n.expression)) {
      const title = n.arguments[0];
      if (title && ts.isTemplateExpression(title)) {
        for (const span of title.templateSpans) {
          if (ts.isIdentifier(span.expression)) names.push(span.expression.text);
        }
      }
      const tag = tagExprOf(n);
      if (tag) collectIdents(tag, names);
      return;
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return names;
}

function collectIdents(node: ts.Node, names: string[]) {
  if (ts.isIdentifier(node)) names.push(node.text);
  ts.forEachChild(node, (n) => collectIdents(n, names));
}

function statementHasTest(node: ts.Node): boolean {
  if (ts.isCallExpression(node) && isTestCall(node.expression)) return true;
  let found = false;
  ts.forEachChild(node, (child) => {
    if (statementHasTest(child)) found = true;
  });
  return found;
}

function firstTest(node: ts.Node): ts.CallExpression | undefined {
  if (ts.isCallExpression(node) && isTestCall(node.expression)) return node;
  let found: ts.CallExpression | undefined;
  ts.forEachChild(node, (child) => {
    found ??= firstTest(child);
  });
  return found;
}

function isTestCall(expr: ts.Expression): boolean {
  return ts.isIdentifier(expr) && expr.text === 'test';
}

function describeKind(expr: ts.Expression): 'describe' | 'fixme' | null {
  if (!ts.isPropertyAccessExpression(expr)) return null;
  if (expr.name.text === 'describe' && ts.isIdentifier(expr.expression) && expr.expression.text === 'test')
    return 'describe';
  if (
    expr.name.text === 'fixme' &&
    ts.isPropertyAccessExpression(expr.expression) &&
    expr.expression.name.text === 'describe' &&
    ts.isIdentifier(expr.expression.expression) &&
    expr.expression.expression.text === 'test'
  ) {
    return 'fixme';
  }
  return null;
}

function tagExprOf(call: ts.CallExpression): ts.Expression | undefined {
  for (const arg of call.arguments) {
    if (!ts.isObjectLiteralExpression(arg)) continue;
    for (const prop of arg.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      if (ts.isIdentifier(prop.name) && prop.name.text === 'tag') return prop.initializer;
    }
  }
  return undefined;
}

function tagOf(call: ts.CallExpression, env: Record<string, string>): string | null {
  const expr = tagExprOf(call);
  if (!expr) return null;
  return evalTag(expr, env);
}

function evalTag(expr: ts.Expression, env: Record<string, string>): string | null {
  const node = unwrap(expr);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return TAGS.has(node.text) ? node.text : null;
  }
  if (!ts.isConditionalExpression(node)) return null;
  const cond = node.condition;
  if (!ts.isBinaryExpression(cond) || cond.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken) return null;
  if (!ts.isIdentifier(cond.left) || !ts.isStringLiteral(cond.right)) return null;
  const chosen = env[cond.left.text] === cond.right.text ? node.whenTrue : node.whenFalse;
  return evalTag(chosen, env);
}

function evalTitle(expr: ts.Expression | undefined, env: Record<string, string>): string | null {
  if (!expr) return null;
  const node = unwrap(expr);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (!ts.isTemplateExpression(node)) return null;
  let out = node.head.text;
  for (const span of node.templateSpans) {
    if (!ts.isIdentifier(span.expression)) return null;
    const value = env[span.expression.text];
    if (value === undefined) return null;
    out += value + span.literal.text;
  }
  return out;
}

function unwrap(expr: ts.Expression): ts.Expression {
  let node = expr;
  while (ts.isAsExpression(node) || ts.isParenthesizedExpression(node) || ts.isSatisfiesExpression(node)) {
    node = node.expression;
  }
  return node;
}

function bindingNames(init: ts.ForInitializer): string[] | null {
  const name = ts.isVariableDeclarationList(init) ? init.declarations[0]?.name : undefined;
  if (!name) return null;
  if (ts.isIdentifier(name)) return [name.text];
  if (!ts.isArrayBindingPattern(name)) return null;
  const names: string[] = [];
  for (const el of name.elements) {
    if (!ts.isBindingElement(el) || !ts.isIdentifier(el.name)) return null;
    names.push(el.name.text);
  }
  return names;
}

function resolveList(expr: ts.Expression, consts: Map<string, ts.Expression>): Array<Record<string, string>> | null {
  const node = unwrap(expr);
  if (ts.isIdentifier(node)) {
    const init = consts.get(node.text);
    return init ? resolveList(init, consts) : null;
  }
  if (!ts.isArrayLiteralExpression(node)) return null;
  const cases: Array<Record<string, string>> = [];
  for (const el of node.elements) {
    const item = unwrap(el);
    if (ts.isStringLiteral(item) || ts.isNoSubstitutionTemplateLiteral(item)) {
      cases.push({ __value: item.text });
      continue;
    }
    if (!ts.isArrayLiteralExpression(item)) return null;
    const row: Record<string, string> = {};
    item.elements.forEach((cell, i) => {
      const value = unwrap(cell);
      if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) row[`__${i}`] = value.text;
    });
    if (!Object.keys(row).length) return null;
    cases.push(row);
  }
  return cases;
}

function collectSkips(fn: ts.Node): string[] {
  const skips: string[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'skip' &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'test'
    ) {
      const reason = node.arguments[1];
      if (reason && (ts.isStringLiteral(reason) || ts.isNoSubstitutionTemplateLiteral(reason))) skips.push(reason.text);
      else if (reason) skips.push(reason.getText().replace(/\s+/g, ' '));
    }
    ts.forEachChild(node, visit);
  };
  visit(fn);
  return skips;
}

export function parseComment(raw: string): ParsedComment | null {
  const body = raw
    .replace(/^\/\*\*?/, '')
    .replace(/\*\/\s*$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, ''))
    .join('\n')
    .trim();
  const match = body.match(/^(Action|Call):\s*([\s\S]*?)\nChecks:\s*([\s\S]*?)\nWhy:\s*([\s\S]*)$/);
  if (!match) return null;
  const verb = match[1] === 'Call' ? 'Call' : 'Action';
  return { verb, actionOrCall: match[2].trim(), checks: match[3].trim(), why: match[4].trim() };
}

function fileNote(text: string): string | null {
  const idx = text.search(/test\.describe/);
  const head = idx === -1 ? text : text.slice(0, idx);
  const notes: string[] = [];
  for (const match of head.matchAll(/\/\*\*([\s\S]*?)\*\//g)) {
    const body = match[1].replace(/^\s*\*\s?/gm, '').trim();
    if (/fixme|undelete|deletes every host/i.test(body)) notes.push(body);
  }
  return notes.length ? notes.join('\n\n') : null;
}

function areaOf(rel: string): Area {
  if (rel.endsWith('auth.api.spec.ts')) return 'auth';
  if (rel.includes('hosts-and-details') || rel.includes('hosts-delete')) return 'cross';
  if (rel.includes('host-details')) return 'host-details';
  return 'hosts';
}

function place(
  rel: string,
  tag: string,
  fixme: boolean,
): { suite: Suite; kind: Kind; projects: string[]; browsers: string[] } {
  const suite: Suite | null = rel.includes('/ui/smoke/')
    ? 'smoke'
    : rel.includes('/ui/regression/')
      ? 'regression'
      : rel.includes('/ui/e2e/')
        ? 'e2e'
        : rel.includes('/ui/destructive/')
          ? 'destructive'
          : rel.includes('/api/')
            ? 'api'
            : null;
  if (!suite) throw new Error(`${rel} is not in smoke, regression, e2e, destructive, or api`);
  if (!TAGS.has(tag.replace(/ \(varies by case\)$/, ''))) throw new Error(`${rel} has unknown tag ${tag}`);

  let kind: Kind;
  if (fixme) kind = 'written-not-run';
  else if (suite === 'e2e') kind = 'journey';
  else if (tag === '@smoke') kind = 'smoke';
  else if (tag === '@destructive') kind = 'destructive';
  else kind = 'regression';

  if (suite === 'smoke' && tag !== '@smoke') throw new Error(`${rel} smoke folder test is tagged ${tag}`);
  if (suite === 'destructive' && tag !== '@destructive')
    throw new Error(`${rel} destructive folder test is tagged ${tag}`);
  if ((suite === 'regression' || suite === 'e2e') && tag === '@destructive') {
    throw new Error(`${rel} read-only folder has a @destructive test`);
  }

  if (suite === 'api') {
    return {
      suite,
      kind,
      projects: tag === '@destructive' ? ['api-destructive'] : ['api'],
      browsers: [],
    };
  }
  if (tag === '@destructive') {
    return { suite, kind, projects: ['destructive'], browsers: ['Chrome'] };
  }
  return { suite, kind, projects: ['chrome', 'firefox', 'safari'], browsers: ['Chrome', 'Firefox', 'Safari'] };
}

function runLabel(suite: Suite, kind: Kind): string {
  if (kind === 'written-not-run') {
    return 'Selected by the api-destructive project. The describe is test.describe.fixme, so the body does not run and this is not counted as automated coverage.';
  }
  if (suite === 'api') return 'No browser. Runs in the api project.';
  if (kind === 'destructive')
    return 'Chrome only, in the destructive project, after Chrome, Firefox, and Safari finish the read-only suites.';
  if (kind === 'journey') {
    return 'Chrome, Firefox, and Safari. This file is the cross-page journey. The tag is @regression. It does not run in the destructive project.';
  }
  return 'Chrome, Firefox, and Safari. Counted once, not once per browser.';
}
