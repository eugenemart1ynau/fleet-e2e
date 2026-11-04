/** Shared shapes for the coverage atlas. Intent in source, not the last Playwright run. */

export type Kind = 'smoke' | 'regression' | 'journey' | 'destructive' | 'written-not-run';
export type Suite = 'smoke' | 'regression' | 'e2e' | 'destructive' | 'api';
export type Layer = 'ui' | 'api';
export type Area = 'hosts' | 'host-details' | 'auth' | 'cross';
export type CoverageKind = 'covered' | 'boundary' | 'out-of-scope';
export type PageId = 'hosts' | 'host-details' | 'session';

export interface ParsedComment {
  verb: 'Action' | 'Call';
  actionOrCall: string;
  checks: string;
  why: string;
}

export interface TestCard {
  id: string;
  title: string;
  file: string;
  line: number;
  describeTitle: string;
  describeWhy: string;
  layer: Layer;
  suite: Suite;
  kind: Kind;
  tag: string;
  area: Area;
  verb: 'Action' | 'Call';
  actionOrCall: string;
  checks: string;
  why: string;
  projects: string[];
  browsers: string[];
  runLabel: string;
  skips: string[];
  fileNote: string | null;
  loopNote: string | null;
  fixme: boolean;
}

export interface ControlDef {
  id: string;
  label: string;
  page: PageId;
  coverage: CoverageKind;
  summary: string;
}

export interface HotspotDef {
  id: string;
  controlId: string;
  screenId: string;
  label: string;
  coverage: 'covered' | 'boundary';
  /** Key resolved to a locator while capturing. */
  anchor: string;
}

export interface ScreenDef {
  id: string;
  title: string;
  route: string;
  page: PageId;
  blurb: string;
  file: string;
  fullPage: boolean;
}

export interface JourneyStep {
  n: number;
  screenId: string;
  hotspotId: string;
  text: string;
}

export interface JourneyDef {
  id: string;
  title: string;
  testFile: string;
  testTitle: string;
  steps: JourneyStep[];
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ShotFile {
  capturedAt: string;
  screens: Record<string, { file: string; boxes: Record<string, Box | null> }>;
}
