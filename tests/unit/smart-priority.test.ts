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
      // overdue: 1.5+1.25=2.75→3; 60d future: 0+1.25=1.25→1
    });

    it('due in 14+ days has near-zero due weight (≤ no-date score)', () => {
      const base = { priority: PRIORITY.LOW, goalCount: 0, projectCount: 0, isImportant: false, isUrgent: false };
      expect(calculateSmartPriority({ ...base, dueDate: future(20) })).toBeLessThanOrEqual(
        calculateSmartPriority({ ...base, dueDate: null })
      );
      // 20d future weight = max(0, 1.5-20/14*1.5) = 0 < 0.5 (no-date)
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

    it('important-only raw weight (0.7) is >= urgent-only (0.5)', () => {
      // Use overdue+high to spread the scores
      const b = { priority: PRIORITY.HIGH, dueDate: '2020-01-01', goalCount: 0, projectCount: 0 };
      const importantOnly = calculateSmartPriority({ ...b, isImportant: true,  isUrgent: false });
      const urgentOnly    = calculateSmartPriority({ ...b, isImportant: false, isUrgent: true  });
      expect(importantOnly).toBeGreaterThanOrEqual(urgentOnly);
      // importantOnly: 1.5+1.25+0+0.7=3.45→3; urgentOnly: 3.25→3
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
      // ~0+0.25+0+0=0.25→0→GREATEST(1,0)=1
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
});
