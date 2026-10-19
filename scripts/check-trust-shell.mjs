// Visual/geometry checkpoint for the (trust) policy shell — the five Review
// Focus cases automated unit tests cannot judge. Run against `pnpm dev`:
//   node scripts/check-trust-shell.mjs
// playwright-core is not a project dependency; borrow the copy an installed
// skill ships rather than adding one.
const { chromium } = await import(
  "file:///home/maverick/.agents/skills/motion-reel/node_modules/playwright-core/index.mjs"
);

const APP = process.env.APP_URL ?? "http://local.sophionos.com:3000";
const browser = await chromium.launch({
  executablePath:
    "/home/maverick/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome",
  args: ["--host-resolver-rules=MAP local.sophionos.com 127.0.0.1"],
});
const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name} — ${detail}`);
};

const page = await browser.newPage({ viewport: { width: 1280, height: 600 } });
await page.goto(`${APP}/terms`, { waitUntil: "networkidle" });

// 1. D2 — the bottom of /terms is reachable on a short desktop viewport.
const scroll = await page.evaluate(() => {
  const main = [...document.querySelectorAll("main")].find(
    (m) => m.offsetParent !== null,
  );
  main.scrollTop = main.scrollHeight;
  const last = [...main.querySelectorAll(".legal-doc")].find((e) => e.offsetParent !== null).lastElementChild;
  const r = last.getBoundingClientRect();
  return {
    scrollable: main.scrollHeight > main.clientHeight,
    reachedBottom: main.scrollTop + main.clientHeight >= main.scrollHeight - 2,
    lastBottomInside: r.bottom <= main.getBoundingClientRect().bottom + 1,
    lastBottom: Math.round(r.bottom),
    mainBottom: Math.round(main.getBoundingClientRect().bottom),
  };
});
check(
  "D2 /terms scrolls to the last clause at 1280x600",
  scroll.scrollable && scroll.reachedBottom && scroll.lastBottomInside,
  JSON.stringify(scroll),
);

// 2. Heading parity: same class string as the app's list pages.
// Both shell branches render children (the inactive one is display:none), so
// every probe must pick the visible clone.
const h1 = await page.evaluate(
  () => [...document.querySelectorAll("main h1")].find((h) => h.offsetParent !== null).className,
);
check(
  "D3 heading class matches app pages",
  h1 === "text-2xl font-bold tracking-tight font-heading",
  h1,
);

// 3. D1 — the original complaint: a wide frame around a narrow body, leaving a
// dead right gutter. Constraint: exactly one centred max-w-3xl (48rem = 768px)
// frame, and the legal body fills its content box edge to edge.
const frame = await page.evaluate(() => {
  const visible = (sel) =>
    [...document.querySelectorAll(sel)].find((e) => e.offsetParent !== null);
  const body = visible(".legal-doc");
  const col = body.parentElement;
  const cs = getComputedStyle(col);
  const colBox = col.getBoundingClientRect();
  const widest = body.getBoundingClientRect().width;
  return {
    maxWidth: cs.maxWidth,
    marginLeft: Math.round(colBox.left),
    marginRight: Math.round(window.innerWidth - colBox.right),
    colWidth: Math.round(colBox.width),
    contentWidth: Math.round(
      colBox.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
    ),
    bodyWidth: Math.round(widest),
    widerFrames: document.querySelectorAll(".max-w-4xl, .max-w-5xl, .max-w-6xl, .max-w-7xl")
      .length,
  };
});
check(
  "D1 single centred 3xl column, body fills it",
  Math.abs(parseFloat(frame.maxWidth) - 768) <= 1 &&
    frame.widerFrames === 0 &&
    Math.abs(frame.marginLeft - frame.marginRight) <= 1 &&
    frame.bodyWidth === frame.contentWidth,
  JSON.stringify(frame),
);

// 4. Anonymous shell: logo-only header, no sidebar/drawer, no dashboard link.
const anon = await page.evaluate(() => ({
  headers: document.querySelectorAll("header").length,
  sidebar: document.querySelectorAll("aside").length,
  dashboardLinks: document.querySelectorAll('a[href="/dashboard"]').length,
  signInLinks: [...document.querySelectorAll("a")].filter((a) =>
    /sign in|log in/i.test(a.textContent ?? ""),
  ).length,
}));
check(
  "anonymous reader gets the logo-only shell",
  anon.headers > 0 && anon.sidebar === 0 && anon.dashboardLinks === 0,
  JSON.stringify(anon),
);

await page.close();

// 4. D4 — no horizontal page scroll at 320px; the table scrolls itself.
for (const [w, hgt] of [[390, 800], [320, 640]]) {
  const p = await browser.newPage({ viewport: { width: w, height: hgt } });
  await p.goto(`${APP}/subprocessors`, { waitUntil: "networkidle" });
  const m = await p.evaluate(() => {
    const table = [...document.querySelectorAll(".legal-doc table")].find((t) => t.offsetParent !== null);
    return {
      docOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      tableScrollsItself: table ? table.scrollWidth > table.clientWidth : null,
      tableOverflowX: table ? getComputedStyle(table).overflowX : null,
      tableWidth: table ? Math.round(table.getBoundingClientRect().width) : null,
    };
  });
  check(
    `D4 subprocessors fits ${w}px`,
    !m.docOverflow &&
      m.tableOverflowX === "auto" &&
      (!m.tableScrollsItself || m.tableWidth <= w),
    JSON.stringify(m),
  );
  await p.close();
}

// 5. Sign-in page offers an anonymous route to the policies.
const anonEntry = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await anonEntry.goto(`${APP}/login`, { waitUntil: "networkidle" });
const loginLinks = await anonEntry.evaluate(() =>
  [...document.querySelectorAll('a[href="/terms"]')].map((a) => a.textContent?.trim()),
);
check(
  "sign-in page links to Terms & Policies",
  loginLinks.some((t) => /terms/i.test(t ?? "")),
  JSON.stringify(loginLinks),
);
await anonEntry.close();

// 6./7. Policies are gone from the app shell, and appear only once you are
// inside the policies. Needs a session: set TEST_COOKIES (JSON array of
// playwright cookies) plus TEST_APP=<signed-in app url>.
if (process.env.TEST_COOKIES) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addCookies(JSON.parse(process.env.TEST_COOKIES));
  const signed = process.env.TEST_APP ?? APP;
  const inspect = async (path) => {
    const p = await ctx.newPage();
    await p.goto(`${signed}${path}`, { waitUntil: "networkidle" });
    // open the drawer so both desktop sidebar and mobile nav are inspectable
    const html = await p.content();
    const navText = await p.evaluate(async () => {
      const aside = document.querySelector("aside");
      return {
        asideText: aside?.innerText.replace(/\s+/g, " ") ?? "(no aside)",
        emojiIcons: (aside?.querySelectorAll('[role="img"]') ?? []).length,
        lucideIcons: (aside?.querySelectorAll("svg.lucide") ?? []).length,
      };
    });
    await p.close();
    return { html, ...navText };
  };

  const appPage = await inspect("/dashboard");
  check(
    "app shell does not list the policies",
    !/Policies/.test(appPage.asideText) && !/Subprocessors/.test(appPage.asideText),
    appPage.asideText.slice(0, 160),
  );
  check(
    "app shell still shows Core and System",
    /Core/.test(appPage.asideText) && /System/.test(appPage.asideText),
    appPage.asideText.slice(0, 160),
  );

  const policyPage = await inspect("/terms");
  check(
    "policy page shows Policies only",
    /Policies/.test(policyPage.asideText) &&
      !/Core/.test(policyPage.asideText) &&
      !/System/.test(policyPage.asideText),
    policyPage.asideText.slice(0, 200),
  );
  check(
    "policy icons render as emoji, not lucide svgs",
    policyPage.emojiIcons >= 6 && policyPage.lucideIcons === 0,
    `emoji=${policyPage.emojiIcons} lucide=${policyPage.lucideIcons}`,
  );
} else {
  console.log("SKIP signed-in checks — set TEST_COOKIES to a Clerk session to run them");
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
