import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiRunButton, DefectStatusSelect } from "./WorkflowControls";

describe("API simulation control", () => {
  it("starts the API simulation from the real run control", async () => {
    const user = userEvent.setup(); const onRun = vi.fn();
    render(<ApiRunButton running={false} onRun={onRun} />);
    await user.click(screen.getByRole("button", { name: "Run request" }));
    expect(onRun).toHaveBeenCalledTimes(1);
  });
});

describe("defect status control", () => {
  it("allows valid transitions and blocks invalid closed-defect transitions", async () => {
    const user = userEvent.setup(); const onChange = vi.fn(); const onBlocked = vi.fn();
    const { rerender } = render(<DefectStatusSelect status="open" onChange={onChange} onBlocked={onBlocked} />);
    await user.selectOptions(screen.getByLabelText("Defect status"), "resolved");
    expect(onChange).toHaveBeenCalledWith("resolved");
    rerender(<DefectStatusSelect status="closed" onChange={onChange} onBlocked={onBlocked} />);
    await user.selectOptions(screen.getByLabelText("Defect status"), "in_progress");
    expect(onBlocked).toHaveBeenCalledTimes(1);
  });
});
