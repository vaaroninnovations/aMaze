import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ContactPage from "./page.tsx";

const { submitContact } = vi.hoisted(() => ({
  submitContact: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useAction: () => submitContact,
}));

vi.mock("@/components/app-header.tsx", () => ({ default: () => null }));

describe("contact page", () => {
  beforeEach(() => {
    submitContact.mockReset();
  });

  it("is public and sends valid contact form data", async () => {
    const user = userEvent.setup();
    submitContact.mockResolvedValue(null);
    render(
      <MemoryRouter>
        <ContactPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Get in Touch" })).toBeVisible();
    await user.type(screen.getByLabelText("Full Name *"), "Research User");
    await user.type(
      screen.getByLabelText("Email Address *"),
      "researcher@example.org",
    );
    await user.selectOptions(
      screen.getByLabelText("Subject"),
      "Research Collaboration",
    );
    await user.type(
      screen.getByLabelText("Message *"),
      "I would like to discuss a research collaboration.",
    );
    await user.click(screen.getByRole("button", { name: "Send Message" }));

    await waitFor(() => {
      expect(submitContact).toHaveBeenCalledWith({
        name: "Research User",
        email: "researcher@example.org",
        subject: "Research Collaboration",
        message: "I would like to discuss a research collaboration.",
        website: "",
      });
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Your message has been sent",
    );
  });

  it("uses native validation and reports delivery failures", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ContactPage />
      </MemoryRouter>,
    );

    const submitButton = screen.getByRole("button", { name: "Send Message" });
    await user.click(submitButton);
    expect(submitContact).not.toHaveBeenCalled();

    submitContact.mockRejectedValueOnce(new Error("provider failure"));
    await user.type(screen.getByLabelText("Full Name *"), "Research User");
    await user.type(
      screen.getByLabelText("Email Address *"),
      "researcher@example.org",
    );
    await user.type(
      screen.getByLabelText("Message *"),
      "Please help me with an analysis issue.",
    );
    await user.click(submitButton);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn’t send your message.",
    );
  });
});
