import { describe, expect, it } from "vitest";
import { addressFieldValue, looksLikeMapsLink, parseMapsLink, safeMapsHref } from "./maps-link";

describe("parseMapsLink", () => {
  it("returns null when nothing was typed", () => {
    expect(parseMapsLink("")).toBeNull();
    expect(parseMapsLink("   ")).toBeNull();
    expect(parseMapsLink(null)).toBeNull();
    expect(parseMapsLink(undefined)).toBeNull();
  });

  it("keeps a shared Google Maps short link", () => {
    expect(parseMapsLink("https://maps.app.goo.gl/AbC123")).toBe("https://maps.app.goo.gl/AbC123");
  });

  it("adds https:// to a link typed without the protocol", () => {
    expect(parseMapsLink("maps.app.goo.gl/AbC123")).toBe("https://maps.app.goo.gl/AbC123");
  });

  it("accepts a google.com maps place link", () => {
    expect(parseMapsLink("https://www.google.com/maps/place/Barbearia+Do+Chef/@-8.1,-35.1,17z")).toBe(
      "https://www.google.com/maps/place/Barbearia+Do+Chef/@-8.1,-35.1,17z",
    );
  });

  it("accepts maps.google.com and the .com.br domain", () => {
    expect(parseMapsLink("https://maps.google.com/?q=Rua+das+Flores,10")).toBe(
      "https://maps.google.com/?q=Rua+das+Flores,10",
    );
    expect(parseMapsLink("https://www.google.com.br/maps/place/Rua+Azul")).toBe(
      "https://www.google.com.br/maps/place/Rua+Azul",
    );
  });

  it("rejects links that are not Google Maps", () => {
    expect(() => parseMapsLink("https://example.com/maps")).toThrow("Cole um link do Google Maps válido.");
    expect(() => parseMapsLink("https://www.google.com/")).toThrow("Cole um link do Google Maps válido.");
    expect(() => parseMapsLink("perto da praça")).toThrow("Cole um link do Google Maps válido.");
    expect(() => parseMapsLink("javascript:alert(1)")).toThrow("Cole um link do Google Maps válido.");
  });
});

describe("safeMapsHref", () => {
  it("returns null instead of throwing on a bad stored link", () => {
    expect(safeMapsHref("javascript:alert(1)")).toBeNull();
    expect(safeMapsHref("")).toBeNull();
    expect(safeMapsHref("https://maps.app.goo.gl/AbC123")).toBe("https://maps.app.goo.gl/AbC123");
  });
});

describe("looksLikeMapsLink", () => {
  it("is true only for Google Maps links", () => {
    expect(looksLikeMapsLink("maps.app.goo.gl/AbC123")).toBe(true);
    expect(looksLikeMapsLink("Rua das Flores, 10")).toBe(false);
    expect(looksLikeMapsLink("https://example.com/maps")).toBe(false);
    expect(looksLikeMapsLink("")).toBe(false);
  });
});

describe("addressFieldValue", () => {
  it("shows the saved link ahead of the address text", () => {
    expect(addressFieldValue("Rua das Flores, 10", "https://maps.app.goo.gl/AbC123")).toBe(
      "https://maps.app.goo.gl/AbC123",
    );
    expect(addressFieldValue("Rua das Flores, 10", null)).toBe("Rua das Flores, 10");
    expect(addressFieldValue("  ", "")).toBe("");
  });
});
