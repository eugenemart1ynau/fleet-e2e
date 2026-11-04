(function () {
  const data = JSON.parse(document.getElementById('coverage-data').textContent);
  const tests = new Map(data.tests.map((test) => [test.id, test]));
  const screens = new Map(data.screens.map((screen) => [screen.id, screen]));
  const app = document.getElementById('app');
  let query = '';

  const kindClass = {
    smoke: 'kind-smoke',
    regression: 'kind-regression',
    journey: 'kind-journey',
    destructive: 'kind-destructive',
    'written-not-run': 'kind-written-not-run',
  };

  function esc(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function hashParts() {
    const raw = location.hash.replace(/^#/, '');
    const [view = 'overview', a = '', b = '', c = ''] = raw.split('/');
    return { view, a, b, c };
  }

  function go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  function pageMatch(test, page) {
    if (page === 'all') return true;
    if (page === 'api') return test.layer === 'api';
    if (page === 'hosts') return test.area === 'hosts' || test.area === 'cross';
    if (page === 'host-details') return test.area === 'host-details' || test.area === 'cross';
    if (page === 'session') {
      return test.hotspotIds.some((id) => ['hs-login', 'hs-signout', 'hs-account-other', 'hs-signed-out'].includes(id));
    }
    return true;
  }

  function filtered(kind, page) {
    const q = query.trim().toLowerCase();
    return data.tests.filter((test) => {
      if (kind !== 'all' && test.kind !== kind) return false;
      if (!pageMatch(test, page)) return false;
      if (!q) return true;
      return `${test.title} ${test.why} ${test.actionOrCall} ${test.checks} ${test.describeTitle}`
        .toLowerCase()
        .includes(q);
    });
  }

  function badge(kind, label) {
    return `<span class="badge ${kindClass[kind] || 'plain'}">${esc(label || kind)}</span>`;
  }

  function slug(value) {
    const base = String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return base || 'group';
  }

  function journeyStepFor(screen, hot) {
    const steps = data.journeys.flatMap((journey) => journey.steps.map((step) => ({ journey, step })));
    return (
      steps.find((item) => item.step.hotspotId === hot.id) ||
      steps.find((item) => item.step.screenId === screen.id) ||
      null
    );
  }

  function placeHash(screen, hot) {
    if (screen.page === 'session') {
      const hit = journeyStepFor(screen, hot);
      if (hit) return `#journeys/${hit.journey.id}/${hit.step.n}`;
      return '#journeys/online-host';
    }
    const view = screen.page === 'host-details' ? 'details' : 'hosts';
    return `#${view}/${screen.id}/${hot.id}`;
  }

  function boxStyle(hot, selected) {
    const area = Math.max(hot.box.w * hot.box.h, 0.2);
    const z = selected ? 40 : Math.max(1, Math.min(30, Math.round(80 / area)));
    return `left:${hot.box.x}%;top:${hot.box.y}%;width:${Math.max(hot.box.w, 1.2)}%;height:${Math.max(hot.box.h, 1.2)}%;z-index:${z}`;
  }

  function scrollBoxIntoFrame(box) {
    const frame = box.closest('.shot-frame');
    if (!frame) return;
    const frameRect = frame.getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();
    const top = boxRect.top - frameRect.top + frame.scrollTop - frame.clientHeight / 2 + boxRect.height / 2;
    const left = boxRect.left - frameRect.left + frame.scrollLeft - frame.clientWidth / 2 + boxRect.width / 2;
    frame.scrollTo({ top: Math.max(0, top), left: Math.max(0, left) });
  }

  function testCard(test) {
    const skips = test.skips.length
      ? `<p class="note">May skip on this preview: ${esc(test.skips.join('; '))}</p>`
      : '';
    const loop = test.loopNote ? `<p class="note">${esc(test.loopNote)}</p>` : '';
    const fileNote =
      test.fileNote && test.kind === 'written-not-run' ? `<p class="note">${esc(test.fileNote)}</p>` : '';
    const places = test.hotspotIds
      .map((id) => {
        const screen = data.screens.find((item) => item.hotspots.some((hot) => hot.id === id));
        const hot = screen && screen.hotspots.find((item) => item.id === id);
        if (!screen || !hot) return '';
        return `<a href="${placeHash(screen, hot)}">${esc(hot.label)}</a>`;
      })
      .filter(Boolean);
    return `<article class="test">
      <div class="badges">${badge(test.kind, test.kind.replace(/-/g, ' '))}<span class="badge plain">${esc(test.tag)}</span><span class="badge plain">${esc(test.suite)}</span></div>
      <h3>${esc(test.title)}</h3>
      <dl>
        <dt>${esc(test.verb)}</dt><dd>${esc(test.actionOrCall)}</dd>
        <dt>Checks</dt><dd>${esc(test.checks)}</dd>
        <dt>Why</dt><dd>${esc(test.why)}</dd>
        <dt>Where it runs</dt><dd>${esc(test.runLabel)}</dd>
      </dl>
      ${skips}${loop}${fileNote}
      <p class="meta">${esc(test.file)}:${test.line}${places.length ? ' · ' + places.join(' · ') : ''}</p>
    </article>`;
  }

  function bar(segments) {
    const total = segments.reduce((sum, seg) => sum + seg.count, 0) || 1;
    return `<div class="bar">${segments
      .filter((seg) => seg.count > 0)
      .map((seg) => {
        const label = seg.count >= 8 ? String(seg.count) : '';
        return `<a class="seg ${esc(seg.className)}" style="flex:${seg.count}" href="${esc(seg.href)}" title="${esc(seg.title)}: ${seg.count}">${label}</a>`;
      })
      .join('')}</div>`;
  }

  function nav(current) {
    const items = [
      ['overview', 'Overview'],
      ['hosts', 'Hosts'],
      ['details', 'Host details'],
      ['journeys', 'Journeys'],
      ['api', 'API'],
      ['gaps', 'Not in this suite'],
      ['tests', 'All tests'],
    ];
    return `<nav>${items
      .map(([id, label]) => `<a href="#${id}" ${current === id ? 'aria-current="page"' : ''}>${label}</a>`)
      .join('')}</nav>`;
  }

  function shell(current, body) {
    const shot = data.shotsCapturedAt
      ? `Screens captured ${data.shotsCapturedAt.slice(0, 16).replace('T', ' ')}`
      : 'Screens not captured yet';
    return `<header class="top">
      <div>
        <h1>Coverage atlas</h1>
        <p class="lede">What the Hosts and host-details suite is built to cover, what kind of check each block is, and why it was written. Counts are tests, not tests times browsers.</p>
      </div>
      <p class="stamp">Generated ${esc(data.generatedAt.slice(0, 16).replace('T', ' '))}<br>${esc(shot)}</p>
    </header>
    <p class="banner">This page is the map of the specs. It is not the result of the last Playwright run. A green run does not mean pagination was tested, and a red run does not erase a case that is written here.</p>
    ${nav(current)}
    ${body}`;
  }

  function overview() {
    const kinds = data.kindCounts.map((item) => ({
      count: item.count,
      className: item.kind,
      href: `#tests/${item.kind}/all`,
      title: item.label,
    }));
    const legend = data.kindCounts
      .map(
        (item) =>
          `<a href="#tests/${item.kind}/all"><i class="sw ${kindClass[item.kind]}"></i>${esc(item.label)} ${item.count}</a>`,
      )
      .join('');
    const controlRow = (page, label) => {
      const segs = ['covered', 'boundary', 'out-of-scope'].map((coverage) => {
        const found = data.controlCounts.find((row) => row.page === page && row.coverage === coverage);
        return {
          count: found ? found.count : 0,
          className: coverage,
          href:
            coverage === 'covered'
              ? `#${page === 'host-details' ? 'details' : page === 'session' ? 'journeys' : 'hosts'}`
              : '#gaps',
          title: `${label} ${coverage}`,
        };
      });
      return `<div class="bar-row"><span class="lbl">${label}</span>${bar(segs)}</div>`;
    };
    const risks = data.risks
      .map(
        (risk) =>
          `<article class="risk">${badge(risk.kind, risk.kind.replace(/-/g, ' '))}<strong>${esc(risk.title)}</strong><p>${esc(risk.why)}</p><p class="meta">${esc(risk.file)}</p></article>`,
      )
      .join('');
    const smokeList = (layer) =>
      data.smoke
        .filter((item) => item.layer === layer)
        .map(
          (item) =>
            `<div class="smoke-item"><div class="kicker">${esc(item.file)}</div><strong>${esc(item.title)}</strong><p class="why">${esc(item.why)}</p></div>`,
        )
        .join('');
    const skipText = data.skipNotes.length
      ? ` Some tests skip when this preview is not ready: ${data.skipNotes.map(esc).join(' · ')}`
      : '';
    return shell(
      'overview',
      `<section class="grid-2">
        <article class="card">
          <h2>Tests by kind</h2>
          <p class="sub">Smoke is the one happy path in an area. Regression is the rest of the read-only cases. The journey is one cross-page session. Destructive runs once, in Chrome, after the read-only browsers. Written-not-run is specified and intentionally not executed.</p>
          ${bar(kinds)}
          <div class="legend">${legend}</div>
          <h2 style="margin-top:22px">Controls, not test count</h2>
          <p class="sub">Search has many cases and still counts as one control. Covered, held at the boundary, or left out of the suite.</p>
          ${controlRow('hosts', 'Hosts')}
          ${controlRow('host-details', 'Host details')}
          ${controlRow('session', 'Session')}
          <div class="legend"><span><i class="sw seg covered"></i>Covered</span><span><i class="sw seg boundary"></i>Boundary</span><span><i class="sw seg out-of-scope"></i>Out of scope</span></div>
        </article>
        <article class="card">
          <h2>Why this set exists</h2>
          <p class="sub">Four smoke paths, plus the delete that a smoke test must not perform.</p>
          <div class="risks">${risks}</div>
        </article>
      </section>
      <section class="grid-2" style="margin-top:16px">
        <article class="card"><h2>Every UI smoke test</h2><div class="smoke-col">${smokeList('ui')}</div></article>
        <article class="card"><h2>Every API smoke test</h2><div class="smoke-col">${smokeList('api')}</div></article>
      </section>
      <p class="foot">Read-only UI runs in Chrome, Firefox, and Safari and is counted once. The API suite uses no browser. The host delete is Chrome only.${skipText}</p>`,
    );
  }

  function screenView(page, current) {
    const list = data.screens.filter((screen) => screen.page === page);
    const hash = hashParts();
    const screen = screens.get(hash.a) || list[0];
    const selected = hash.b || '';
    const chips = list
      .map(
        (item) =>
          `<a class="chip" href="#${current}/${item.id}" ${item.id === screen.id ? 'aria-pressed="true"' : ''}>${esc(item.title)}</a>`,
      )
      .join('');
    const boxes = screen.hotspots
      .map((hot, index) => {
        if (!hot.box) return '';
        const on = hot.id === selected;
        return `<button type="button" class="hot ${hot.coverage}" style="${boxStyle(hot, on)}" aria-pressed="${on}" data-hot="${esc(hot.id)}" title="${esc(hot.label)}"><span class="n">${index + 1}</span></button>`;
      })
      .join('');
    const picture = screen.image
      ? `<div class="shot-frame"><div class="stage" data-screen="${esc(screen.id)}"><img alt="${esc(screen.title)} on Fleet preview" src="${esc(screen.image)}">${boxes}</div></div>`
      : `<div class="shot-frame missing-shot">No screenshot yet. Run <code>npm run coverage:shots</code> while <code>fleetctl preview</code> is up. The regions below still list the tests.</div>`;
    const regions = screen.hotspots
      .map((hot, index) => {
        const where = hot.box ? '' : ' · not in this capture';
        return `<a class="chip" href="#${current}/${screen.id}/${hot.id}" ${hot.id === selected ? 'aria-pressed="true"' : ''}>${index + 1}. ${esc(hot.label)}${hot.coverage === 'boundary' ? ' · boundary' : ''}${where}</a>`;
      })
      .join('');
    const hot = screen.hotspots.find((item) => item.id === selected);
    const drawer = hot
      ? `<h2>${esc(hot.label)}</h2><p class="sub">${hot.coverage === 'boundary' ? 'This control is on screen. The test checks it and does not follow it.' : 'Tests that land on this region.'}</p>${hot.testIds.map((id) => testCard(tests.get(id))).join('')}`
      : `<h2>${esc(screen.title)}</h2><p class="sub">${esc(screen.blurb)}</p><p class="note">${esc(screen.route)}</p><p class="note">Select a numbered region to read the Action, Checks, and Why.</p>`;
    return shell(
      current,
      `<div class="chips">${chips}</div>
      <div class="screen-layout">
        <div>
          ${picture}
          <div class="regions">${regions}</div>
          <p class="sub" style="margin-top:8px">${esc(screen.blurb)} <span class="meta">${esc(screen.route)}</span></p>
        </div>
        <aside class="drawer">${drawer}</aside>
      </div>`,
    );
  }

  function journeys() {
    const hash = hashParts();
    const journey = data.journeys.find((item) => item.id === hash.a) || data.journeys[0];
    const step = journey.steps.find((item) => String(item.n) === hash.b) || journey.steps[0];
    const screen = screens.get(step.screenId);
    const cards = data.journeys
      .map(
        (item) =>
          `<a class="chip" href="#journeys/${item.id}" ${item.id === journey.id ? 'aria-pressed="true"' : ''}>${esc(item.title)}</a>`,
      )
      .join('');
    const steps = journey.steps
      .map(
        (item) =>
          `<a class="step" href="#journeys/${journey.id}/${item.n}" ${item.n === step.n ? 'aria-current="step"' : ''}><b>Step ${item.n}</b><br>${esc(item.text)}</a>`,
      )
      .join('');
    const hot = screen.hotspots.find((item) => item.id === step.hotspotId);
    const boxes = screen.hotspots
      .filter((item) => item.box && item.id === step.hotspotId)
      .map(
        (item) =>
          `<span class="hot ${item.coverage}" style="${boxStyle(item, true)};pointer-events:none" aria-pressed="true"><span class="n">${step.n}</span></span>`,
      )
      .join('');
    const picture = screen.image
      ? `<div class="shot-frame"><div class="stage" data-screen="${esc(screen.id)}"><img alt="${esc(screen.title)}" src="${esc(screen.image)}">${boxes}</div></div>`
      : `<div class="shot-frame missing-shot">Screenshot not captured for ${esc(screen.title)}.</div>`;
    return shell(
      'journeys',
      `<div class="chips">${cards}</div>
      <div class="screen-layout">
        <div>
          <div class="steps">${steps}</div>
          ${picture}
          <p class="sub">${esc(screen.blurb)}</p>
        </div>
        <aside class="drawer">
          <h2>Step ${step.n}</h2>
          <p class="sub">${esc(step.text)}</p>
          ${hot ? `<p class="note">Region: ${esc(hot.label)}</p>` : ''}
          ${testCard(tests.get(journey.testId))}
        </aside>
      </div>`,
    );
  }

  function apiGroups() {
    const used = new Set();
    return data.apiGroups.map((group, index) => {
      let id = slug(group.title);
      if (used.has(id)) id = `${id}-${index + 1}`;
      used.add(id);
      return { ...group, id };
    });
  }

  function api() {
    const current = hashParts().a;
    const groups = apiGroups();
    const chips = groups
      .map(
        (group) =>
          `<a class="chip" href="#api/${esc(group.id)}" ${group.id === current ? 'aria-pressed="true"' : ''}>${esc(group.title)}</a>`,
      )
      .join('');
    const body = groups
      .map((group) => {
        const note = group.fileNote ? `<p class="note">${esc(group.fileNote)}</p>` : '';
        return `<section class="group" id="api-${esc(group.id)}"><h2>${esc(group.title)}</h2><p class="sub">${esc(group.why)}</p><p class="meta">${esc(group.file)}</p>${note}${group.testIds
          .map((id) => testCard(tests.get(id)))
          .join('')}</section>`;
      })
      .join('');
    return shell('api', `<div class="chips">${chips}</div>${body}`);
  }

  function gaps() {
    const block = (coverage, title, copy) => {
      const rows = data.controls
        .filter((control) => control.coverage === coverage)
        .map(
          (control) =>
            `<article class="test"><div class="badges"><span class="badge ${coverage === 'boundary' ? 'kind-written-not-run' : 'plain'}">${esc(control.page)}</span></div><h3>${esc(control.label)}</h3><p class="why">${esc(control.summary)}</p></article>`,
        )
        .join('');
      return `<article class="card"><h2>${title}</h2><p class="sub">${copy}</p>${rows}</article>`;
    };
    const written = data.tests
      .filter((test) => test.kind === 'written-not-run')
      .map((test) => testCard(test))
      .join('');
    return shell(
      'gaps',
      `<div class="grid-2">
        ${block('boundary', 'On screen, not followed', 'The control is visible. A test names it and stops. That is not coverage of the next page.')}
        ${block('out-of-scope', 'Left out on purpose', 'Free preview cannot reach these, or following them leaves Hosts and host details. Pagination is the exception: the UI needs 50 hosts, and the API still checks the page params.')}
      </div>
      <section class="group"><h2>Written, not run</h2><p class="sub">Authenticated deletes are specified and marked test.describe.fixme. Fleet cannot restore that same host id.</p>${written}</section>`,
    );
  }

  function catalog() {
    const hash = hashParts();
    const kind = hash.a || 'all';
    const page = hash.b || 'all';
    const kinds = ['all', 'smoke', 'regression', 'journey', 'destructive', 'written-not-run'];
    const pages = [
      ['all', 'All pages'],
      ['hosts', 'Hosts'],
      ['host-details', 'Host details'],
      ['session', 'Session'],
      ['api', 'API layer'],
    ];
    const kindChips = kinds
      .map(
        (item) =>
          `<a class="chip" href="#tests/${item}/${page}" ${item === kind ? 'aria-pressed="true"' : ''}>${esc(item.replace(/-/g, ' '))}</a>`,
      )
      .join('');
    const pageChips = pages
      .map(
        ([id, label]) =>
          `<a class="chip" href="#tests/${kind}/${id}" ${id === page ? 'aria-pressed="true"' : ''}>${esc(label)}</a>`,
      )
      .join('');
    const rows = filtered(kind, page);
    const groups = [];
    for (const test of rows) {
      const key = `${test.file}::${test.describeTitle}`;
      const last = groups[groups.length - 1];
      if (!last || last.key !== key) groups.push({ key, title: test.describeTitle, file: test.file, tests: [test] });
      else last.tests.push(test);
    }
    return shell(
      'tests',
      `<div class="filters">
        <input id="q" type="search" placeholder="Filter by title, action, or why" value="${esc(query)}" aria-label="Filter tests">
        ${kindChips}${pageChips}
        <span class="note">${rows.length} tests</span>
      </div><div id="results">${catalogBody(rows)}</div>`,
    );
  }

  function render() {
    const { view } = hashParts();
    const current = ['overview', 'hosts', 'details', 'journeys', 'api', 'gaps', 'tests'].includes(view)
      ? view
      : 'overview';
    const html =
      current === 'hosts'
        ? screenView('hosts', 'hosts')
        : current === 'details'
          ? screenView('host-details', 'details')
          : current === 'journeys'
            ? journeys()
            : current === 'api'
              ? api()
              : current === 'gaps'
                ? gaps()
                : current === 'tests'
                  ? catalog()
                  : overview();
    app.innerHTML = html;
    const input = document.getElementById('q');
    if (input) {
      input.addEventListener('input', () => {
        query = input.value;
        const { a, b } = hashParts();
        const rows = filtered(a || 'all', b || 'all');
        const hold = document.querySelector('.filters .note');
        if (hold) hold.textContent = `${rows.length} tests`;
        const results = document.getElementById('results');
        if (results) results.innerHTML = catalogBody(rows);
      });
    }
    app.querySelectorAll('button.hot[data-hot]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const stage = btn.closest('[data-screen]');
        const screenId = stage && stage.dataset.screen;
        if (!screenId) return;
        go(`#${hashParts().view}/${screenId}/${btn.dataset.hot}`);
      });
    });
    const box = app.querySelector('.shot-frame .hot[aria-pressed="true"]');
    if (box) scrollBoxIntoFrame(box);
    if (current === 'api') {
      const group = hashParts().a && document.getElementById(`api-${hashParts().a}`);
      if (group) group.scrollIntoView({ block: 'start' });
    }
  }

  function catalogBody(rows) {
    if (!rows.length) return '<p class="banner">No tests match.</p>';
    const groups = [];
    for (const test of rows) {
      const key = `${test.file}::${test.describeTitle}`;
      const last = groups[groups.length - 1];
      if (!last || last.key !== key) groups.push({ key, title: test.describeTitle, file: test.file, tests: [test] });
      else last.tests.push(test);
    }
    return groups
      .map(
        (group) =>
          `<section class="group"><h2>${esc(group.title)}</h2><p class="meta">${esc(group.file)}</p>${group.tests.map((test) => testCard(test)).join('')}</section>`,
      )
      .join('');
  }

  window.addEventListener('hashchange', render);
  if (!location.hash) location.hash = '#overview';
  else render();
})();
