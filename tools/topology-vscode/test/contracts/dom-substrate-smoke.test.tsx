// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { useState, useEffect } from "react";

afterEach(cleanup);

describe("dom substrate (happy-dom + @testing-library/react)", () => {
  it("renders a component into the DOM", () => {
    render(<div data-testid="probe">hello</div>);
    expect(screen.getByTestId("probe").textContent).toBe("hello");
  });

  it("runs effects under renderHook", () => {
    let installs = 0;
    const useThing = () => {
      const [n, setN] = useState(0);
      useEffect(() => {
        installs += 1;
        setN(1);
      }, []);
      return n;
    };
    const { result } = renderHook(() => useThing());
    expect(installs).toBe(1);
    expect(result.current).toBe(1);
  });
});
