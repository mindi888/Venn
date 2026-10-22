import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import StarRating from "@/components/StarRating";

describe("StarRating", () => {
  it("renders a read-only rating as one labelled image with no buttons", () => {
    render(<StarRating value={7} readOnly />);
    expect(screen.getByRole("img", { name: "Rated 7 out of 10" })).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("marks the selected star as pressed and reports clicks", () => {
    const onChange = vi.fn();
    render(<StarRating value={3} onChange={onChange} />);
    expect(screen.getAllByRole("button")).toHaveLength(10);
    expect(screen.getByRole("button", { name: "Rate 3 out of 10" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Rate 4 out of 10" })).toHaveAttribute("aria-pressed", "false");

    screen.getByRole("button", { name: "Rate 8 out of 10" }).click();
    expect(onChange).toHaveBeenCalledWith(8);
  });
});
