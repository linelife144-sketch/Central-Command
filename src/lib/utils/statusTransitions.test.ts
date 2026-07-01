import { TicketStatus, UserRole } from "@/types";
import { isValidTransition } from "./statusTransitions";

describe("statusTransitions", () => {
  describe("isValidTransition", () => {
    // Admin Transitions
    it("should allow Admin to move from DRAFT to ASSIGNED", () => {
      expect(isValidTransition("DRAFT", "ASSIGNED", "ADMIN")).toBe(true);
    });

    it("should allow Admin to move from ASSIGNED to REJECTED", () => {
        expect(isValidTransition("ASSIGNED", "REJECTED", "ADMIN")).toBe(true);
    });

    it("should allow Admin to move from PENDING_REVIEW to APPROVED", () => {
      expect(isValidTransition("PENDING_REVIEW", "APPROVED", "ADMIN")).toBe(true);
    });

    it("should allow Admin to move from PENDING_REVIEW to NEEDS_REWORK", () => {
      expect(isValidTransition("PENDING_REVIEW", "NEEDS_REWORK", "ADMIN")).toBe(true);
    });

    it("should allow Admin to move from PENDING_REVIEW to REJECTED", () => {
        expect(isValidTransition("PENDING_REVIEW", "REJECTED", "ADMIN")).toBe(true);
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

    it("should allow Contractor to move from ON_SITE to IN_PROGRESS", () => {
      expect(isValidTransition("ON_SITE", "IN_PROGRESS", "CONTRACTOR")).toBe(true);
    });

    it("should allow Contractor to move from IN_PROGRESS to COMPLETE", () => {
      expect(isValidTransition("IN_PROGRESS", "COMPLETE", "CONTRACTOR")).toBe(true);
    });
    
    it("should allow Contractor to move from COMPLETE to PENDING_REVIEW (System auto)", () => {
        // Usually system auto-transitions, but if client-triggered:
        expect(isValidTransition("COMPLETE", "PENDING_REVIEW", "CONTRACTOR")).toBe(true);
    });

    it("should allow Contractor to move from NEEDS_REWORK to IN_PROGRESS", () => {
        expect(isValidTransition("NEEDS_REWORK", "IN_PROGRESS", "CONTRACTOR")).toBe(true);
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
