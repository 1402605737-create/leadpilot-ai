import { describe, expect, it } from "vitest";
import { classifyReply, calculateLeadScore, defaultICP, generateNextStep, mockLeads } from "./index";

describe("LeadPilot rules", () => {
  it("scores the same lead deterministically", () => {
    expect(calculateLeadScore(mockLeads[0], defaultICP)).toEqual(calculateLeadScore(mockLeads[0], defaultICP));
  });
  it("classifies every governed reply category", () => {
    expect(classifyReply("Please remove me and stop")).toBe("Rejection");
    expect(classifyReply("What is your pricing?")).toBe("Pricing Question");
    expect(classifyReply("I am out of office until Monday")).toBe("Auto Reply");
    expect(classifyReply("Please speak with our RevOps lead")).toBe("Referral");
    expect(classifyReply("How does the product integrate?")).toBe("Product Question");
    expect(classifyReply("Check back next quarter")).toBe("Not Now");
    expect(classifyReply("Send a calendar link")).toBe("Interested");
  });
  it("stops outreach after rejection", () => {
    expect(generateNextStep("Rejection", mockLeads[0])).toContain("Stop outreach");
  });
});

