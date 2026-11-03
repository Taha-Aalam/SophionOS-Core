// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element -- test double for the avatar primitive */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserAvatar, useUserIdentity } from "@/components/user-avatar";

// The avatar primitives pull in image-loading state that never resolves in
// jsdom; stub them so the test observes the identity wiring, not base-ui.
vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-slot="avatar" className={className}>
      {children}
    </div>
  ),
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) => (
    <img data-slot="avatar-image" src={src} alt={alt} />
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="avatar-fallback">{children}</div>
  ),
}));

const authState: {
  user: { id: string; name: string | null; email: string | null; imageUrl: string | null } | null;
} = { user: null };

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({ user: authState.user }),
}));

function IdentityProbe() {
  const { displayName, initials, avatarUrl } = useUserIdentity();
  return (
    <span data-testid="probe" data-name={displayName} data-initials={initials} data-url={avatarUrl ?? ""} />
  );
}

describe("useUserIdentity", () => {
  beforeEach(() => {
    authState.user = null;
  });

  it("title-cases the name and derives initials from the same value", () => {
    authState.user = { id: "u1", name: "taha hassan", email: "t@example.com", imageUrl: null };
    render(<IdentityProbe />);

    const probe = screen.getByTestId("probe");
    expect(probe).toHaveAttribute("data-name", "Taha Hassan");
    expect(probe).toHaveAttribute("data-initials", "TA");
  });

  it("falls back to the email, then to User", () => {
    authState.user = { id: "u1", name: null, email: "taha@example.com", imageUrl: null };
    const { unmount } = render(<IdentityProbe />);
    // Same derivation as the topbar has always used: name -> email -> "User".
    expect(screen.getByTestId("probe")).toHaveAttribute("data-initials", "TA");
    unmount();

    authState.user = { id: "u1", name: null, email: null, imageUrl: null };
    render(<IdentityProbe />);
    expect(screen.getByTestId("probe")).toHaveAttribute("data-name", "User");
    expect(screen.getByTestId("probe")).toHaveAttribute("data-initials", "US");
  });

  it("exposes the profile image when one exists", () => {
    authState.user = {
      id: "u1",
      name: "Taha",
      email: "t@example.com",
      imageUrl: "https://img.clerk.com/taha.png",
    };
    render(<IdentityProbe />);

    expect(screen.getByTestId("probe")).toHaveAttribute("data-url", "https://img.clerk.com/taha.png");
  });
});

describe("UserAvatar", () => {
  beforeEach(() => {
    authState.user = null;
  });

  it("renders the profile image when the user has one", () => {
    authState.user = {
      id: "u1",
      name: "Taha Hassan",
      email: "t@example.com",
      imageUrl: "https://img.clerk.com/taha.png",
    };
    render(<UserAvatar />);

    expect(screen.getByRole("img")).toHaveAttribute("src", "https://img.clerk.com/taha.png");
    expect(screen.getByRole("img")).toHaveAttribute("alt", "Taha Hassan");
  });

  it("falls back to initials derived from the same name when there is no image", () => {
    authState.user = { id: "u1", name: "taha hassan", email: "t@example.com", imageUrl: null };
    render(<UserAvatar />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("TA")).toBeInTheDocument();
  });
});
