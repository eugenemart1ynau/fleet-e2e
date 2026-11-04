import fs from 'fs';
import path from 'path';
import { apiExact, apiPrefix, controls, hotspots, journeys, riskTitles, screens, uiLinks } from './atlas.ts';
import { parseSpecs } from './parse-specs.ts';
import type { Box, ControlDef, HotspotDef, JourneyDef, PageId, ScreenDef, ShotFile, TestCard } from './types.ts';

export interface LinkedTest extends TestCard {
  hotspotIds: string[];
}

export interface DashboardModel {
  generatedAt: string;
  shotsCapturedAt: string | null;
  kindCounts: Array<{ kind: string; label: string; count: number }>;
  controlCounts: Array<{ page: PageId; coverage: string; count: number }>;
  risks: Array<{ title: string; why: string; kind: string; file: string }>;
  smoke: Array<{ layer: string; title: string; why: string; file: string; line: number }>;
  skipNotes: string[];
  screens: Array<
    ScreenDef & {
      image: string | null;
      hotspots: Array<HotspotDef & { box: Box | null; testIds: string[] }>;
    }
  >;
  controls: ControlDef[];
  journeys: Array<JourneyDef & { testId: string }>;
  apiGroups: Array<{ title: string; why: string; file: string; fileNote: string | null; testIds: string[] }>;
  tests: LinkedTest[];
}

const KIND_LABELS: Record<string, string> = {
  smoke: 'Smoke',
  regression: 'Regression',
  journey: 'Journey',
  destructive: 'Destructive',
  'written-not-run': 'Written, not run',
};

export function buildModel(root: string): DashboardModel {
  const errors: string[] = [];
  let cards: TestCard[] = [];
  try {
    cards = parseSpecs(root);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }
  errors.push(...checkCoverageDoc(root));

  const byFile = new Map<string, TestCard[]>();
  for (const card of cards) {
    const list = byFile.get(card.file) ?? [];
    list.push(card);
    byFile.set(card.file, list);
  }

  const hotspotIds = new Set(hotspots.map((h) => h.id));
  const screenIds = new Set(screens.map((s) => s.id));
  const controlIds = new Set(controls.map((c) => c.id));
  for (const hotspot of hotspots) {
    if (!screenIds.has(hotspot.screenId)) errors.push(`Hotspot ${hotspot.id} is on unknown screen ${hotspot.screenId}`);
    if (!controlIds.has(hotspot.controlId)) errors.push(`Hotspot ${hotspot.id} uses unknown control ${hotspot.controlId}`);
    const control = controls.find((c) => c.id === hotspot.controlId);
    if (control && control.coverage === 'out-of-scope') errors.push(`Out-of-scope control ${control.id} should not have hotspot ${hotspot.id}`);
    if (control && control.coverage !== 'out-of-scope' && control.coverage !== hotspot.coverage) {
      errors.push(`Hotspot ${hotspot.id} is ${hotspot.coverage} but control ${control.id} is ${control.coverage}`);
    }
  }

  const linked = new Map<string, string[]>();
  const claim = (file: string, title: string, ids: string[], source: string) => {
    for (const id of ids) {
      if (!hotspotIds.has(id)) errors.push(`${source} points at unknown hotspot ${id}`);
    }
    const card = cards.find((c) => c.file === file && c.title === title);
    if (!card) {
      errors.push(`${source} title not found: ${title}`);
      return;
    }
    const prev = linked.get(card.id) ?? [];
    linked.set(card.id, [...new Set([...prev, ...ids])]);
  };

  for (const [file, titles] of Object.entries(uiLinks)) {
    const fileCards = (byFile.get(file) ?? []).filter((c) => c.layer === 'ui');
    if (!fileCards.length) errors.push(`UI link file has no tests: ${file}`);
    const known = new Set(fileCards.map((c) => c.title));
    for (const title of Object.keys(titles)) {
      if (!known.has(title)) errors.push(`UI link title not in ${file}: ${title}`);
      claim(file, title, titles[title], file);
    }
    for (const card of fileCards) {
      if (!titles[card.title]) errors.push(`UI test is not on a hotspot: ${card.file} — ${card.title}`);
    }
  }
  for (const card of cards.filter((c) => c.layer === 'ui')) {
    if (!uiLinks[card.file]) errors.push(`UI file has no hotspot map: ${card.file}`);
  }

  for (const [file, titles] of Object.entries(apiExact)) {
    for (const title of Object.keys(titles)) claim(file, title, titles[title], `${file} exact`);
  }
  for (const rule of apiPrefix) {
    const hits = cards.filter((c) => c.file === rule.file && c.title.startsWith(rule.prefix) && !apiExact[rule.file]?.[c.title]);
    if (!hits.length) errors.push(`API prefix matched nothing: ${rule.file} "${rule.prefix}"`);
    for (const card of hits) claim(card.file, card.title, rule.hotspots, `${rule.file} prefix ${rule.prefix}`);
  }

  const tests: LinkedTest[] = cards.map((card) => ({ ...card, hotspotIds: linked.get(card.id) ?? [] }));
  for (const hotspot of hotspots) {
    const uiHits = tests.filter((t) => t.layer === 'ui' && t.hotspotIds.includes(hotspot.id));
    if (!uiHits.length) errors.push(`Hotspot ${hotspot.id} has no UI test`);
  }

  for (const journey of journeys) {
    const card = tests.find((t) => t.file === journey.testFile && t.title === journey.testTitle);
    if (!card) errors.push(`Journey test not found: ${journey.testTitle}`);
    for (const step of journey.steps) {
      if (!screenIds.has(step.screenId)) errors.push(`Journey ${journey.id} step ${step.n} has unknown screen ${step.screenId}`);
      const hotspot = hotspots.find((h) => h.id === step.hotspotId);
      if (!hotspot) errors.push(`Journey ${journey.id} step ${step.n} has unknown hotspot ${step.hotspotId}`);
      else if (hotspot.screenId !== step.screenId) {
        errors.push(`Journey ${journey.id} step ${step.n} hotspot ${hotspot.id} is on ${hotspot.screenId}, not ${step.screenId}`);
      }
    }
  }

  const risks = riskTitles.map((title) => {
    const card = tests.find((t) => t.title === title);
    if (!card) errors.push(`Risk title not found: ${title}`);
    return { title, why: card?.why ?? '', kind: card?.kind ?? '', file: card?.file ?? '' };
  });

  if (errors.length) {
    throw new Error(`Coverage atlas is inconsistent:\n- ${errors.join('\n- ')}`);
  }

  const shots = readShots(root);
  const testsByHotspot = new Map<string, string[]>();
  for (const test of tests) {
    for (const id of test.hotspotIds) {
      const list = testsByHotspot.get(id) ?? [];
      list.push(test.id);
      testsByHotspot.set(id, list);
    }
  }

  const kindOrder = ['smoke', 'regression', 'journey', 'destructive', 'written-not-run'];
  const kindCounts = kindOrder.map((kind) => ({
    kind,
    label: KIND_LABELS[kind],
    count: tests.filter((t) => t.kind === kind).length,
  }));
  const controlCounts = (['hosts', 'host-details', 'session'] as const).flatMap((page) =>
    (['covered', 'boundary', 'out-of-scope'] as const).map((coverage) => ({
      page,
      coverage,
      count: controls.filter((c) => c.page === page && c.coverage === coverage).length,
    })),
  );

  const apiGroups: DashboardModel['apiGroups'] = [];
  for (const test of tests.filter((t) => t.layer === 'api')) {
    const last = apiGroups[apiGroups.length - 1];
    if (!last || last.title !== test.describeTitle || last.file !== test.file) {
      apiGroups.push({
        title: test.describeTitle,
        why: test.describeWhy,
        file: test.file,
        fileNote: test.fileNote,
        testIds: [test.id],
      });
    } else last.testIds.push(test.id);
  }

  const skipNotes = [...new Set(tests.flatMap((t) => t.skips))].sort();

  return {
    generatedAt: new Date().toISOString(),
    shotsCapturedAt: shots?.capturedAt ?? null,
    kindCounts,
    controlCounts,
    risks,
    smoke: tests
      .filter((t) => t.kind === 'smoke')
      .map((t) => ({ layer: t.layer, title: t.title, why: t.why, file: t.file, line: t.line })),
    skipNotes,
    screens: screens.map((screen) => {
      const shot = shots?.screens[screen.id];
      const image = shot && fs.existsSync(path.join(root, 'coverage-dashboard', 'screens', shot.file)) ? `screens/${shot.file}` : null;
      return {
        ...screen,
        image,
        hotspots: hotspots
          .filter((h) => h.screenId === screen.id)
          .map((h) => ({ ...h, box: shot?.boxes[h.id] ?? null, testIds: testsByHotspot.get(h.id) ?? [] })),
      };
    }),
    controls,
    journeys: journeys.map((journey) => ({
      ...journey,
      testId: tests.find((t) => t.file === journey.testFile && t.title === journey.testTitle)!.id,
    })),
    apiGroups,
    tests,
  };
}

function readShots(root: string): ShotFile | null {
  const file = path.join(root, 'coverage-dashboard', 'screens', 'boxes.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8')) as ShotFile;
}

function checkCoverageDoc(root: string): string[] {
  const text = fs.readFileSync(path.join(root, 'COVERAGE.md'), 'utf8');
  const errors: string[] = [];
  for (const line of text.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 4 || cells[2] !== 'automated') continue;
    const spec = cells[3].replace(/`/g, '').trim();
    if (!spec || spec === '—') {
      errors.push(`COVERAGE.md automated row has no spec path: ${cells[1]}`);
      continue;
    }
    const candidates = [path.join(root, 'tests', `${spec}.spec.ts`), path.join(root, 'tests', `${spec}.api.spec.ts`)];
    if (!candidates.some((file) => fs.existsSync(file))) errors.push(`COVERAGE.md automated spec file is missing: ${spec}`);
  }
  return errors;
}
