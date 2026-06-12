import { describe, expect, it } from "vitest";
import { classifyReply, calculateLeadScore, defaultICP, generateNextStep, mockLeads } from "./index.js";

describe("LeadPilot rules", () => {
  it("scores the same lead deterministically", () => {
    expect(calculateLeadScore(mockLeads[0], defaultICP)).toEqual(calculateLeadScore(mockLeads[0], defaultICP));
  });
  it("classifies every governed reply category", () => {
    expect(classifyReply("请不要再联系我")).toBe("Rejection");
    expect(classifyReply("可以提供价格方案吗？")).toBe("Pricing Question");
    expect(classifyReply("我休假到周一")).toBe("Auto Reply");
    expect(classifyReply("请联系我们的营收运营负责人")).toBe("Referral");
    expect(classifyReply("产品如何集成？")).toBe("Product Question");
    expect(classifyReply("请下季度再联系")).toBe("Not Now");
    expect(classifyReply("请发一个会议链接")).toBe("Interested");
  });
  it("stops outreach after rejection", () => {
    expect(generateNextStep("Rejection", mockLeads[0])).toContain("停止触达");
  });
});
