import { describe, it, expect } from "vitest"
import { isValidEvidenceUrl } from "./MilestoneSubmitDialog"

describe("isValidEvidenceUrl", () => {
  it("allows empty or blank strings (evidence url is optional)", () => {
    expect(isValidEvidenceUrl("")).toBe(true)
    expect(isValidEvidenceUrl("   ")).toBe(true)
  })

  it("validates well-formed https URLs", () => {
    expect(isValidEvidenceUrl("https://github.com/stellar/soroban")).toBe(true)
    expect(isValidEvidenceUrl("https://example.com/project?id=1#sec")).toBe(true)
  })

  it("validates well-formed http URLs", () => {
    expect(isValidEvidenceUrl("http://localhost:3000")).toBe(true)
    expect(isValidEvidenceUrl("http://myproject.org")).toBe(true)
  })

  it("rejects non-http/https protocols", () => {
    expect(isValidEvidenceUrl("ftp://files.example.com")).toBe(false)
    expect(isValidEvidenceUrl("javascript:alert(1)")).toBe(false)
    expect(isValidEvidenceUrl("file:///home/user/code")).toBe(false)
  })

  it("rejects invalid URL strings and bare paths", () => {
    expect(isValidEvidenceUrl("github.com/user/repo")).toBe(false)
    expect(isValidEvidenceUrl("/path/to/evidence")).toBe(false)
    expect(isValidEvidenceUrl("just a string")).toBe(false)
  })
})
