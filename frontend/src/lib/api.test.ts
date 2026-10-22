import { describe, it, expect, vi } from "vitest";
import { api, API_BASE } from "@/lib/api";

function mockFetch(response: { ok: boolean; status?: number; body?: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? 200,
    json: async () => response.body ?? [],
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function sentBody(fetchMock: ReturnType<typeof vi.fn>) {
  const [, init] = fetchMock.mock.calls[0];
  return JSON.parse(init.body);
}

describe("api client", () => {
  it("URL-encodes search queries", async () => {
    const fetchMock = mockFetch({ ok: true });
    await api.searchMovies("Amélie & Co", 8);
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/movies/search?q=Am%C3%A9lie%20%26%20Co&limit=8`);
  });

  it("returns the parsed JSON body", async () => {
    mockFetch({ ok: true, body: [{ id: 1, title: "Up" }] });
    await expect(api.topRatedMovies()).resolves.toEqual([{ id: 1, title: "Up" }]);
  });

  it("throws on a non-2xx GET", async () => {
    mockFetch({ ok: false, status: 503 });
    await expect(api.getMovie(1)).rejects.toThrow("API error 503");
  });

  it("throws on a non-2xx POST", async () => {
    mockFetch({ ok: false, status: 404 });
    await expect(api.similar("Nope")).rejects.toThrow("API error 404");
  });

  // The request bodies must match the backend's Pydantic schemas field-for-field
  it("sends /recommend/similar with the schema's field names", async () => {
    const fetchMock = mockFetch({ ok: true });
    await api.similar("Up", 2, 12, true, [7]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_BASE}/recommend/similar`);
    expect(init).toMatchObject({ method: "POST", headers: { "Content-Type": "application/json" } });
    expect(sentBody(fetchMock)).toEqual({
      movie_title: "Up",
      max_per_franchise: 2,
      n_results: 12,
      include_wildcard: true,
      exclude_ids: [7],
    });
  });

  it("defaults coldstart to the normal overlap preset", async () => {
    const fetchMock = mockFetch({ ok: true });
    await api.coldstart(["Up", "Coco"]);
    expect(sentBody(fetchMock)).toEqual({
      movie_titles: ["Up", "Coco"],
      max_per_franchise: 2,
      n_results: 24,
      overlap: "normal",
      exclude_ids: [],
    });
  });

  it("sends watched-before with a keyword weight", async () => {
    const fetchMock = mockFetch({ ok: true });
    await api.watchedBefore(["Up"]);
    expect(sentBody(fetchMock)).toMatchObject({ movie_titles: ["Up"], keyword_weight: 0.3 });
  });
});
