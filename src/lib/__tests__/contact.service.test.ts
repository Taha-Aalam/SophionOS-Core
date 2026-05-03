import { describe, expect, it } from "vitest";
import { contactService } from "@/lib/services/contact.service";

describe("contactService", () => {
  describe("computeFollowUpStatus", () => {
    it("returns ON TRACK when intervalDays is undefined (no follow-up required)", () => {
      expect(contactService.computeFollowUpStatus(null, undefined)).toBe("ON TRACK");
    });

    it("returns ON TRACK when intervalDays is null (no follow-up required)", () => {
      expect(contactService.computeFollowUpStatus(null, null)).toBe("ON TRACK");
    });

    it("returns ON TRACK when intervalDays is 0 (explicit no-follow-up)", () => {
      expect(contactService.computeFollowUpStatus(null, 0)).toBe("ON TRACK");
    });

    it("returns FOLLOW UP when interval is set and no last interaction", () => {
      expect(contactService.computeFollowUpStatus(null, 14)).toBe("FOLLOW UP");
    });

    it("returns ON TRACK when interaction is recent (within interval)", () => {
      const recent = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(); // 1 day ago
      expect(contactService.computeFollowUpStatus(recent, 14)).toBe("ON TRACK");
    });

    it("returns FOLLOW UP when interaction is older than interval", () => {
      const old = new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(); // 20 days ago
      expect(contactService.computeFollowUpStatus(old, 14)).toBe("FOLLOW UP");
    });

    it("returns ON TRACK when interval is undefined regardless of last interaction", () => {
      const recent = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString();
      expect(contactService.computeFollowUpStatus(recent, undefined)).toBe("ON TRACK");

      const older = new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString();
      expect(contactService.computeFollowUpStatus(older, undefined)).toBe("ON TRACK");
    });
  });

  describe("computeDaysSinceInteraction", () => {
    it("returns null when last_interaction_at is null", () => {
      expect(contactService.computeDaysSinceInteraction(null)).toBeNull();
    });

    it("returns 0 for today", () => {
      const today = new Date().toISOString();
      expect(contactService.computeDaysSinceInteraction(today)).toBe(0);
    });

    it("returns positive number for past dates", () => {
      const fiveDaysAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString();
      expect(contactService.computeDaysSinceInteraction(fiveDaysAgo)).toBe(5);
    });
  });

  describe("getByGroupSync", () => {
    it("groups contacts by group name", () => {
      const contacts = [
        { id: "1", name: "Alice", group: "Client" } as any,
        { id: "2", name: "Bob", group: "Client" } as any,
        { id: "3", name: "Carol", group: "Mentor" } as any,
      ];

      const grouped = contactService.getByGroupSync(contacts);

      expect(grouped["Client"]).toHaveLength(2);
      expect(grouped["Mentor"]).toHaveLength(1);
    });

    it("places contacts without group in Ungrouped", () => {
      const contacts = [
        { id: "1", name: "Alice", group: null } as any,
        { id: "2", name: "Bob", group: "Client" } as any,
      ];

      const grouped = contactService.getByGroupSync(contacts);

      expect(grouped["Ungrouped"]).toHaveLength(1);
      expect(grouped["Client"]).toHaveLength(1);
    });
  });
});