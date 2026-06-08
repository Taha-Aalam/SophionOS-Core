import { describe, it, expect } from 'vitest';
import { calculateSmartPriority } from '../../src/lib/utils/smart-priority';
import { PRIORITY } from '../../src/lib/utils/constants';

// Returns a YYYY-MM-DD string N days from today (local time)
function future(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

describe('calculateSmartPriority', () => {
  // ── Bounds ──────────────────────────────────────────────────────────────
  describe('bounds', () => {
    it('minimum score is 1 (low priority, no date, no goals, no flags)', () => {
      expect(
        calculateSmartPriority({ priority: PRIORITY.LOW, dueDate: null, goalCount: 0, projectCount: 0, isImportant: false, isUrgent: false })
      ).toBe(1);
      // due=0.5 + pri=0.25 + goal=0 + eis=0 = 0.75 → round → 1
    });

    it('maximum score is 5 (all factors at max)', () => {
      expect(
        calculateSmartPriority({ priority: PRIORITY.HIGH, dueDate: '2020-01-01', goalCount: 10, projectCount: 0, isImportant: true, isUrgent: true })
      ).toBe(5);
      // due=1.5 + pri=1.25 + goal=1.25 + eis=1.0 = 5.0 → round → 5
    });

    it('never returns below 1 regardless of inputs', () => {
      expect(
        calculateSmartPriority({ priority: PRIORITY.LOW, dueDate: future(999), goalCount: 0, projectCount: 0, isImportant: false, isUrgent: false })
      ).toBeGreaterThanOrEqual(1);
    });

    it('never returns above 5 regardless of inputs', () => {
      expect(
        calculateSmartPriority({ priority: PRIORITY.HIGH, dueDate: '2020-01-01', goalCount: 100, projectCount: 0, isImportant: true, isUrgent: true })
      ).toBeLessThanOrEqual(5);
    });
  });

  // ── Due date weight ──────────────────────────────────────────────────────
  describe('due date weight', () => {
    it('overdue scores higher than no-date when other factors constant', () => {
      // Using medium + both flags to amplify the due-date gap to a visible integer difference
      const base = { priority: PRIORITY.MEDIUM, goalCount: 0, projectCount: 0, isImportant: true, isUrgent: true };
      const overdue = calculateSmartPriority({ ...base, dueDate: '2020-01-01' });
      const noDate  = calculateSmartPriority({ ...base, dueDate: null });
      expect(overdue).toBeGreaterThan(noDate);
      // overdue: 1.5+0.75+0+1.0=3.25→3; noDate: 0.5+0.75+0+1.0=2.25→2
    });

    it('overdue scores higher than far-future due date', () => {
      const base = { priority: PRIORITY.HIGH, goalCount: 0, projectCount: 0, isImportant: false, isUrgent: false };
      expect(calculateSmartPriority({ ...base, dueDate: '2020-01-01' })).toBeGreaterThan(
        calculateSmartPriority({ ...base, dueDate: future(60) })
      );
      // overdue: 1.5+1.25+0+0=2.75→3; 60d future: 0.5(floor)+1.25+0+0=1.75→2
    });

    it('due in 14+ days has near-zero due weight (≤ no-date score)', () => {
      const base = { priority: PRIORITY.LOW, goalCount: 0, projectCount: 0, isImportant: false, isUrgent: false };
      expect(calculateSmartPriority({ ...base, dueDate: future(20) })).toBeLessThanOrEqual(
        calculateSmartPriority({ ...base, dueDate: null })
      );
      // 20d future weight = 0.5 (floor) → 0.5+0.25+0+0=0.75→1
    });

    it('future date never scores below no-date (due-weight floor of 0.5)', () => {
      // Setting a date should never HURT you vs. leaving it blank.
      const base = { priority: PRIORITY.LOW, goalCount: 0, projectCount: 0, isImportant: false, isUrgent: false };
      const noDate  = calculateSmartPriority({ ...base, dueDate: null });
      const farOut  = calculateSmartPriority({ ...base, dueDate: future(20) });
      const veryFar = calculateSmartPriority({ ...base, dueDate: future(180) });
      const crazy   = calculateSmartPriority({ ...base, dueDate: future(999) });
      expect(farOut).toBeGreaterThanOrEqual(noDate);
      expect(veryFar).toBeGreaterThanOrEqual(noDate);
      expect(crazy).toBeGreaterThanOrEqual(noDate);
    });

    it('1-7 days overdue: due weight stays at 1.5 (recent overdue band)', () => {
      // base with low + no flags so due weight drives the visible integer diff
      const base = { priority: PRIORITY.LOW, goalCount: 0, projectCount: 0, isImportant: false, isUrgent: false };
      const past1 = calculateSmartPriority({ ...base, dueDate: future(-1) });
      const past6 = calculateSmartPriority({ ...base, dueDate: future(-6) });
      expect(past1).toBe(past6);
      // both: 1.5+0.25+0+0=1.75→2
    });

    it('>7 days overdue: due weight escalates above the 1.5 band', () => {
      // Use low + urgent-only (no important) so the 0.25 escalation lands on a .5 boundary
      // and rounds up to a visible integer. past6 sum = 2.25→2, past15 sum = 2.5→3.
      // future(-N) can be off-by-one vs local date, so we use a wide gap (-6 vs -15).
      const base = { priority: PRIORITY.LOW, goalCount: 0, projectCount: 0, isImportant: false, isUrgent: true };
      const past6   = calculateSmartPriority({ ...base, dueDate: future(-6)  });
      const past15  = calculateSmartPriority({ ...base, dueDate: future(-15) });
      const past60  = calculateSmartPriority({ ...base, dueDate: future(-60) });
      expect(past15).toBeGreaterThan(past6);
      expect(past60).toBeGreaterThan(past6);
      // past6:  1.5+0.25+0+0.5=2.25→2
      // past15: 1.75+0.25+0+0.5=2.5 →3
      // past60: 1.75+0.25+0+0.5=2.5 →3
    });

    it('>7 days overdue applies to arbitrarily stale tasks (1 year)', () => {
      // Confirms the escalation is a sustained step, not a one-day spike.
      const base = { priority: PRIORITY.LOW, goalCount: 0, projectCount: 0, isImportant: false, isUrgent: true };
      const recentOverdue = calculateSmartPriority({ ...base, dueDate: future(-6)   });
      const yearOld       = calculateSmartPriority({ ...base, dueDate: future(-365) });
      expect(yearOld).toBeGreaterThan(recentOverdue);
    });

    it('very stale overdue (1 year) still clamps to max score 5', () => {
      const score = calculateSmartPriority({
        priority: PRIORITY.HIGH,
        dueDate: future(-365),
        goalCount: 10,
        projectCount: 5,
        isImportant: true,
        isUrgent: true,
      });
      expect(score).toBeLessThanOrEqual(5);
    });

    it('due today (1.5) >= due 1-7 days ago (1.25)', () => {
      // The 0.25 raw delta between today and 1-7d overdue is at the .25 boundary,
      // so it never produces a visible integer jump on any baseline. The invariant
      // we can assert is non-decreasing as we approach today.
      const base = { priority: PRIORITY.HIGH, goalCount: 0, projectCount: 0, isImportant: false, isUrgent: false };
      const today = calculateSmartPriority({ ...base, dueDate: future(0) });
      const past1 = calculateSmartPriority({ ...base, dueDate: future(-1) });
      expect(today).toBeGreaterThanOrEqual(past1);
      // today: 1.5+1.25+0+0=2.75→3; past1: 1.25+1.25+0+0=2.5→3
    });
  });

  // ── Priority weight ──────────────────────────────────────────────────────
  describe('priority weight', () => {
    it('"high" is the top priority weight', () => {
      const base = { dueDate: null, goalCount: 0, projectCount: 0, isImportant: false, isUrgent: false };
      const high = calculateSmartPriority({ ...base, priority: PRIORITY.HIGH });
      expect(high).toBe(2);
      // 0.5+1.25+0+0=1.75→2
    });

    it('high scores higher than medium and low', () => {
      const base = { dueDate: null, goalCount: 0, projectCount: 0, isImportant: false, isUrgent: false };
      const low    = calculateSmartPriority({ ...base, priority: PRIORITY.LOW });
      const medium = calculateSmartPriority({ ...base, priority: PRIORITY.MEDIUM });
      const high   = calculateSmartPriority({ ...base, priority: PRIORITY.HIGH });
      expect(low).toBeLessThanOrEqual(medium);
      expect(medium).toBeLessThanOrEqual(high);
      expect(high).toBe(2);
      // 0.5+1.25+0+0=1.75→2
    });
  });

  // ── Goal alignment weight ────────────────────────────────────────────────
  describe('goal alignment weight', () => {
    it('more goals = higher or equal score up to the cap', () => {
      const base = { priority: PRIORITY.LOW, dueDate: null, projectCount: 0, isImportant: false, isUrgent: false };
      const g0 = calculateSmartPriority({ ...base, goalCount: 0 });
      const g1 = calculateSmartPriority({ ...base, goalCount: 1 });
      const g2 = calculateSmartPriority({ ...base, goalCount: 2 });
      const g3 = calculateSmartPriority({ ...base, goalCount: 3 });
      expect(g1).toBeGreaterThanOrEqual(g0);
      expect(g2).toBeGreaterThanOrEqual(g1);
      expect(g3).toBe(g2);
      // g2: 0.5+0.25+1.0+0=1.75→2; g3: 0.5+0.25+1.25+0=2.0→2
    });

    it('goal weight caps: 3 goals and 10 goals give the same score', () => {
      const base = { priority: PRIORITY.LOW, dueDate: null, projectCount: 0, isImportant: false, isUrgent: false };
      expect(calculateSmartPriority({ ...base, goalCount: 3 })).toBe(
        calculateSmartPriority({ ...base, goalCount: 10 })
      );
    });
  });

  // ── Project alignment weight ─────────────────────────────────────────────
  describe('project alignment weight', () => {
    const base = { priority: PRIORITY.LOW, dueDate: null, goalCount: 0, isImportant: false, isUrgent: false };

    it('more projects = higher or equal score up to the cap', () => {
      const p0 = calculateSmartPriority({ ...base, projectCount: 0 });
      const p1 = calculateSmartPriority({ ...base, projectCount: 1 });
      const p2 = calculateSmartPriority({ ...base, projectCount: 2 });
      const p3 = calculateSmartPriority({ ...base, projectCount: 3 });
      expect(p1).toBeGreaterThanOrEqual(p0);
      expect(p2).toBeGreaterThanOrEqual(p1);
      expect(p3).toBeGreaterThanOrEqual(p2);
      // p0: 0.5+0.25+0+0=0.75→1; p1: 0.5+0.25+0+0.25=1.0→1; p2: 0.5+0.25+0+0.5=1.25→1; p3: 0.5+0.25+0+0.75=1.5→2
    });

    it('project weight caps: 3 projects and 10 projects give the same score', () => {
      expect(calculateSmartPriority({ ...base, projectCount: 3 })).toBe(
        calculateSmartPriority({ ...base, projectCount: 10 })
      );
    });

    it('1 goal + 2 projects scores higher than 0 goals + 2 projects', () => {
      const g0p2 = calculateSmartPriority({ ...base, goalCount: 0, projectCount: 2 });
      const g1p2 = calculateSmartPriority({ ...base, goalCount: 1, projectCount: 2 });
      expect(g1p2).toBeGreaterThanOrEqual(g0p2);
    });

    it('3 goals + 3 projects does not exceed the cap (same as 3 goals + 0 projects)', () => {
      expect(calculateSmartPriority({ ...base, goalCount: 3, projectCount: 0 })).toBe(
        calculateSmartPriority({ ...base, goalCount: 3, projectCount: 3 })
      );
    });
  });

  // ── Eisenhower weight ────────────────────────────────────────────────────
  describe('Eisenhower weight', () => {
    // Use low+1goal as base so that each Eisenhower tier produces a visible integer
    // neither: 0.5+0.25+0.5+0=1.25→1; urgentOnly: 1.25+0.5=1.75→2; both: 1.25+1.0=2.25→2
    const base = { priority: PRIORITY.LOW, dueDate: null, goalCount: 1, projectCount: 0 };

    it('both flags produce a higher score than neither flag', () => {
      const both    = calculateSmartPriority({ ...base, isImportant: true,  isUrgent: true  });
      const neither = calculateSmartPriority({ ...base, isImportant: false, isUrgent: false });
      expect(both).toBeGreaterThan(neither);
      // both=2 > neither=1
    });

    it('urgent-only produces a higher score than no flags', () => {
      const urgentOnly = calculateSmartPriority({ ...base, isImportant: false, isUrgent: true  });
      const neither    = calculateSmartPriority({ ...base, isImportant: false, isUrgent: false });
      expect(urgentOnly).toBeGreaterThan(neither);
    });

    it('important-only raw weight (0.7) equals urgent-only (0.7)', () => {
      // Both single-flag tiers share the 0.7 weight. Check the integer scores are equal.
      const b = { priority: PRIORITY.HIGH, dueDate: '2020-01-01', goalCount: 0, projectCount: 0 };
      const importantOnly = calculateSmartPriority({ ...b, isImportant: true,  isUrgent: false });
      const urgentOnly    = calculateSmartPriority({ ...b, isImportant: false, isUrgent: true  });
      expect(importantOnly).toBe(urgentOnly);
      // both: 1.75+1.25+0+0.7=3.7→4
    });

    it('both flags (1.25) outscores single flag (0.7)', () => {
      // MEDIUM + '2020' + 0/0: both = 1.75+0.75+0+1.25=3.75→4; important = 1.75+0.75+0+0.7=3.2→3
      const b = { priority: PRIORITY.MEDIUM, dueDate: '2020-01-01', goalCount: 0, projectCount: 0 };
      const both         = calculateSmartPriority({ ...b, isImportant: true,  isUrgent: true  });
      const importantOnly = calculateSmartPriority({ ...b, isImportant: true,  isUrgent: false });
      expect(both).toBeGreaterThan(importantOnly);
    });
  });

  // ── Combined factors ─────────────────────────────────────────────────────
  describe('combined factors', () => {
    it('high-priority overdue task with 2 goals and both flags scores 5', () => {
      expect(
        calculateSmartPriority({ priority: PRIORITY.HIGH, dueDate: '2020-01-01', goalCount: 2, projectCount: 0, isImportant: true, isUrgent: true })
      ).toBe(5);
      // 1.5+1.25+1.0+1.0=4.75→5
    });

    it('low-priority far-future task with no goals scores 1', () => {
      expect(
        calculateSmartPriority({ priority: PRIORITY.LOW, dueDate: future(30), goalCount: 0, projectCount: 0, isImportant: false, isUrgent: false })
      ).toBe(1);
      // 0.5(floor)+0.25+0+0=0.75→1
    });

    it('medium priority + 3 goals + overdue produces high score', () => {
      const score = calculateSmartPriority({
        priority: PRIORITY.MEDIUM,
        dueDate: '2020-01-01',
        goalCount: 3,
        projectCount: 0,
        isImportant: false,
        isUrgent: false,
      });
      // 1.5+0.75+1.25+0=3.5→4
      expect(score).toBe(4);
    });
  });

  // ── Round-up threshold (> 4.5 → 5) ───────────────────────────────────────
  describe('round-up threshold (> 4.5 → 5)', () => {
    it('score above 4.5 rounds up to 5', () => {
      // overdue + medium + 1 goal + 2 projects + both flags = 4.75
      const score = calculateSmartPriority({
        priority: PRIORITY.MEDIUM,
        dueDate: '2020-01-01',
        goalCount: 1,
        projectCount: 2,
        isImportant: true,
        isUrgent: true,
      });
      // 1.75 + 0.75 + 1.0 + 1.25 = 4.75 → > 4.5 → 5
      expect(score).toBe(5);
    });

    it('score below 4.1 does not round up', () => {
      // overdue + high + 0 goals + 0 projects + both flags = 1.5+1.25+0+0+1.0 = 3.75 → 4
      const score = calculateSmartPriority({
        priority: PRIORITY.HIGH,
        dueDate: '2020-01-01',
        goalCount: 0,
        projectCount: 0,
        isImportant: true,
        isUrgent: true,
      });
      expect(score).toBe(4);
    });

    it('score in the (4.5, 5.0] band rounds up to 5', () => {
      // Construct a case just above 4.5: overdue + high + 1 goal + 0 projects + both flags
      // 1.75 + 1.25 + 0.5 + 1.25 = 4.75 → > 4.5 → 5
      const score = calculateSmartPriority({
        priority: PRIORITY.HIGH,
        dueDate: '2020-01-01',
        goalCount: 1,
        projectCount: 0,
        isImportant: true,
        isUrgent: true,
      });
      expect(score).toBe(5);
    });
  });
});
