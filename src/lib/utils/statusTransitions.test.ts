import { getNextPossibleStatuses, isValidTransition } from "./statusTransitions";

describe("statusTransitions", () => {
  describe("isValidTransition", () => {
    // Admin Transitions
    it("should allow Admin to move from DRAFT to ASSIGNED", () => {
      expect(isValidTransition("DRAFT", "ASSIGNED", "ADMIN")).toBe(true);
    });

    it("should NOT allow Admin to move from ASSIGNED to a rejected state", () => {
        expect(getNextPossibleStatuses("ASSIGNED", "ADMIN")).toEqual(["CLOSED"]);
    });

    it("should allow Admin to move from PENDING_REVIEW to APPROVED", () => {
      expect(isValidTransition("PENDING_REVIEW", "APPROVED", "ADMIN")).toBe(true);
    });

    it("should allow Admin to move from PENDING_REVIEW to NEEDS_REWORK", () => {
      expect(isValidTransition("PENDING_REVIEW", "NEEDS_REWORK", "ADMIN")).toBe(true);
    });

    it("should NOT offer REJECTED from PENDING_REVIEW", () => {
        expect(getNextPossibleStatuses("PENDING_REVIEW", "ADMIN")).not.toContain("REJECTED");
    });

    it("should allow Admin to move from any status to CLOSED", () => {
        expect(isValidTransition("DRAFT", "CLOSED", "ADMIN")).toBe(true);
        expect(isValidTransition("ASSIGNED", "CLOSED", "ADMIN")).toBe(true);
        expect(isValidTransition("IN_PROGRESS", "CLOSED", "ADMIN")).toBe(true);
    });

    it("should NOT allow Admin to move from DRAFT to IN_PROGRESS", () => {
      expect(isValidTransition("DRAFT", "IN_PROGRESS", "ADMIN")).toBe(false);
    });

    // Contractor Transitions
    it("should allow Contractor to move from ASSIGNED to IN_ROUTE", () => {
      expect(isValidTransition("ASSIGNED", "IN_ROUTE", "CONTRACTOR")).toBe(true);
    });

    it("should allow Contractor to move from IN_ROUTE to ON_SITE", () => {
      expect(isValidTransition("IN_ROUTE", "ON_SITE", "CONTRACTOR")).toBe(true);
    });

    it.each([
      ['ON_SITE', 'IN_PROGRESS'], ['IN_PROGRESS', 'COMPLETE'], ['COMPLETE', 'PENDING_REVIEW'], ['NEEDS_REWORK', 'IN_PROGRESS'],
    ] as const)("does not expose legacy contractor transition %s -> %s", (current, next) => {
      expect(isValidTransition(current, next, "CONTRACTOR")).toBe(false);
    });

    it("does not let team leads bypass the ticket review workflow", () => {
      expect(getNextPossibleStatuses('ASSIGNED', 'TEAM_LEAD')).toEqual([]);
    });

    it("should NOT allow Contractor to move from DRAFT to ASSIGNED", () => {
      expect(isValidTransition("DRAFT", "ASSIGNED", "CONTRACTOR")).toBe(false);
    });

    it("should NOT allow Contractor to move from ASSIGNED to COMPLETE directly", () => {
      expect(isValidTransition("ASSIGNED", "COMPLETE", "CONTRACTOR")).toBe(false);
    });

    it("should NOT allow Contractor to move from PENDING_REVIEW to APPROVED", () => {
      expect(isValidTransition("PENDING_REVIEW", "APPROVED", "CONTRACTOR")).toBe(false);
    });
  });
});
