import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useState } from "react";
import type { Movie } from "@/lib/api";
import MovieModal from "@/components/MovieModal";

vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/lib/api", () => ({ api: { similar: () => Promise.resolve([]) } }));

const MOVIE = { id: 1, title: "Up", genres: [], cast: [], director: [] } as unknown as Movie;

// Mirrors how the pages use the modal: always mounted, opened by setting a movie
function Page() {
  const [selected, setSelected] = useState<Movie | null>(null);
  return (
    <>
      <button onClick={() => setSelected(MOVIE)}>Open Up</button>
      <MovieModal movie={selected} onClose={() => setSelected(null)} />
    </>
  );
}

async function openModal() {
  render(<Page />);
  const opener = screen.getByRole("button", { name: "Open Up" });
  opener.focus();
  await act(async () => opener.click());
  return opener;
}

function press(key: string, shiftKey = false) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key, shiftKey }));
  });
}

describe("MovieModal accessibility", () => {
  it("is a modal dialog named after the movie, with focus moved into it", async () => {
    await openModal();
    const dialog = screen.getByRole("dialog", { name: "Up" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveFocus();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("closes on Escape and returns focus to what opened it", async () => {
    const opener = await openModal();
    press("Escape");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("keeps Tab focus inside the dialog", async () => {
    await openModal();
    const close = screen.getByRole("button", { name: "Close" });
    close.focus();
    // Close is the only focusable control for a logged-out user, so Tab wraps to it
    press("Tab");
    expect(close).toHaveFocus();
    press("Tab", true);
    expect(close).toHaveFocus();
  });
});
