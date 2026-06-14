import { describe, expect, it } from "vitest";

import {
  buildReturnTo,
  buildReturnToChain,
  encodeReturnTo,
  getReturnToFromSearchParams,
  getReturnToChainFromSearchParams,
  popReturnToHref,
} from "@/lib/utils/return-to";

/**
 * End-to-end simulation of the exact navigation chain the user reported:
 *
 *   dashboard -> area -> goal -> project -> goal  (forward)
 *   then Back x3 stepping back through project -> goal -> area
 *
 * Each "navigation" is built with the SAME URL-construction the detail-page
 * components use, then round-tripped through `new URL(...).searchParams` —
 * which is exactly how Next's App Router serializes a `router.push(string)`
 * (see next/dist/client/router-reducer/create-href-from-url: it returns
 * `url.pathname + url.search`, preserving the percent-encoding) and how
 * `useSearchParams()` reads it back.
 *
 * This locks in the full chain behaviour against regressions in either the
 * encode (forward) or pop (back) direction.
 */

const ORIGIN = "https://app.test";

/** Mirror `useSearchParams()` reading a pushed href string. */
function searchParamsOf(href: string): URLSearchParams {
  return new URL(href, ORIGIN).searchParams;
}

function stateOf(href: string): { returnTo: string | null; chain: string[] } {
  const sp = searchParamsOf(href);
  return {
    returnTo: getReturnToFromSearchParams(sp),
    chain: getReturnToChainFromSearchParams(sp),
  };
}

describe("return-to chain — full forward + back navigation (e2e)", () => {
  it("preserves the step-by-step chain through dashboard -> area -> goal -> project -> goal and back", () => {
    // --- FORWARD ---------------------------------------------------------

    // 1. Dashboard -> Area. AreaCard stamps returnTo=/dashboard, no chain.
    const areaHref = `/areas/area-A?returnTo=${encodeReturnTo("/dashboard")}`;
    const areaSP = searchParamsOf(areaHref);
    expect(stateOf(areaHref)).toEqual({ returnTo: "/dashboard", chain: [] });

    // 2. Area -> Goal. area-detail: returnTo = current area path,
    //    chain = buildReturnToChain(area searchParams).
    const goalHref = `/goals/goal-X?returnTo=${encodeReturnTo(
      buildReturnTo("/areas/area-A"),
    )}&chain=${buildReturnToChain(areaSP)}`;
    const goalSP = searchParamsOf(goalHref);
    expect(stateOf(goalHref)).toEqual({
      returnTo: "/areas/area-A",
      chain: ["/dashboard"],
    });

    // 3. Goal -> Project. goal-detail: returnTo = current goal path,
    //    chain = buildReturnToChain(goal searchParams).
    const projHref = `/projects/project-1?returnTo=${encodeReturnTo(
      "/goals/goal-X",
    )}&chain=${buildReturnToChain(goalSP)}`;
    const projSP = searchParamsOf(projHref);
    expect(stateOf(projHref)).toEqual({
      returnTo: "/goals/goal-X",
      chain: ["/areas/area-A", "/dashboard"],
    });

    // 4. Project -> Goal (deepest). project-detail: returnTo = current project
    //    path, chain = buildReturnToChain(project searchParams).
    const deepGoalHref = `/goals/goal-Z?returnTo=${encodeReturnTo(
      "/projects/project-1",
    )}&chain=${buildReturnToChain(projSP)}`;
    const deepGoalSP = searchParamsOf(deepGoalHref);
    expect(stateOf(deepGoalHref)).toEqual({
      returnTo: "/projects/project-1",
      chain: ["/goals/goal-X", "/areas/area-A", "/dashboard"],
    });

    // --- BACK ------------------------------------------------------------

    // Back #1: from deepest goal -> /projects/project-1
    const back1 = popReturnToHref(deepGoalSP, "/goals");
    expect(new URL(back1, ORIGIN).pathname).toBe("/projects/project-1");
    expect(stateOf(back1)).toEqual({
      returnTo: "/goals/goal-X",
      chain: ["/areas/area-A", "/dashboard"],
    });

    // Back #2: from project -> /goals/goal-X
    const back2 = popReturnToHref(searchParamsOf(back1), "/projects");
    expect(new URL(back2, ORIGIN).pathname).toBe("/goals/goal-X");
    expect(stateOf(back2)).toEqual({
      returnTo: "/areas/area-A",
      chain: ["/dashboard"],
    });

    // Back #3: from goal -> /areas/area-A
    const back3 = popReturnToHref(searchParamsOf(back2), "/goals");
    expect(new URL(back3, ORIGIN).pathname).toBe("/areas/area-A");
    expect(stateOf(back3)).toEqual({ returnTo: "/dashboard", chain: [] });

    // Back #4: from area -> /dashboard (end of chain, clean URL)
    const back4 = popReturnToHref(searchParamsOf(back3), "/areas");
    expect(back4).toBe("/dashboard");
  });

  it("preserves the chain through note A -> note B -> note C (related-notes tile)", () => {
    // Mirrors the URL construction the related-notes `onClick` will use:
    //   - returnTo: encodeReturnTo(sourcePath)   // i.e. encodeURIComponent
    //   - chain: buildReturnToChain(searchParams) // already URL-encoded
    //   - Both stamped via URLSearchParams.set() so toString() encodes once.

    // --- FORWARD ---------------------------------------------------------

    // 1. /notes/A entered from /notes (no chain). State: { returnTo: null, chain: [] }.
    //    buildReturnToChain of {} returns encodeReturnToChain([]) (encoded empty array).
    const aHref = `/notes/note-A`;
    const aSP = searchParamsOf(aHref);
    expect(stateOf(aHref)).toEqual({ returnTo: null, chain: [] });

    // 2. /notes/B from /notes/A. Source path = /notes/note-A, current chain = [].
    //    buildReturnToChain of an empty-state source returns encodeReturnToChain([]),
    //    so /notes/note-B's chain is `[]` (no incoming context).
    const bHref = `/notes/note-B?returnTo=${encodeReturnTo("/notes/note-A")}&chain=${buildReturnToChain(aSP)}`;
    const bSP = searchParamsOf(bHref);
    expect(stateOf(bHref)).toEqual({
      returnTo: "/notes/note-A",
      chain: [],
    });

    // 3. /notes/C from /notes/B. Source has returnTo=/notes/note-A and chain=[],
    //    so /notes/note-C's chain is ["/notes/note-A"].
    const cHref = `/notes/note-C?returnTo=${encodeReturnTo("/notes/note-B")}&chain=${buildReturnToChain(bSP)}`;
    const cSP = searchParamsOf(cHref);
    expect(stateOf(cHref)).toEqual({
      returnTo: "/notes/note-B",
      chain: ["/notes/note-A"],
    });

    // --- BACK ------------------------------------------------------------

    // Back #1: /notes/note-C -> /notes/note-B. The new state of /notes/note-B
    //   should match what the user landed on in step 2, so its own Back
    //   button continues to work.
    const back1 = popReturnToHref(cSP, "/notes");
    expect(new URL(back1, ORIGIN).pathname).toBe("/notes/note-B");
    expect(stateOf(back1)).toEqual({
      returnTo: "/notes/note-A",
      chain: [],
    });

    // Back #2: /notes/note-B -> /notes/note-A. End of chain (no further returnTo
    //   after the head), so the destination gets a clean URL with no chain param.
    const back2 = popReturnToHref(searchParamsOf(back1), "/notes");
    expect(back2).toBe("/notes/note-A");

    // Back #3: /notes/note-A -> /notes (fallback). No returnTo, no chain.
    const back3 = popReturnToHref(searchParamsOf(back2), "/notes");
    expect(back3).toBe("/notes");
  });
});
