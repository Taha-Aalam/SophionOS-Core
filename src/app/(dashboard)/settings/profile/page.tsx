"use client";

import { useRef, useState } from "react";
import { BadgeCheck, ImageUp } from "lucide-react";
import { toast } from "sonner";

import { useClerk, useUser } from "@clerk/nextjs";
import type { ClerkAPIError, UserResource } from "@clerk/nextjs/types";

import { SettingsDetailHeader } from "@/components/settings/settings-detail-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  clerkErrorMessage,
  useProfileContact,
  useUpdateProfileContact,
  useUpdateUsername,
  useUploadAvatar,
} from "@/lib/hooks/use-profile";

const USERNAME_PATTERN = /^[a-z0-9_-]{4,64}$/;

/** First Clerk error for a param ("username"), if any. */
function clerkParamError(error: unknown, param: string): string | null {
  const e = error as { errors?: Array<ClerkAPIError> } | undefined;
  const match = e?.errors?.find((err) => err.meta?.paramName === param);
  return match?.longMessage || match?.message || null;
}

function initialsOf(name: string | null | undefined): string {
  if (!name) return "U";
  const parts = name.split(/\s+/).filter(Boolean);
  const base = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2);
  return base.toUpperCase();
}

/** E.164-ish mask: digits/spaces/dashes/parens, leading +. */
function sanitizePhoneInput(raw: string): string {
  return raw.replace(/[^\d\s()+-]/g, "").slice(0, 20);
}

/**
 * Downscales to at most 512x512 JPEG so a 10-megapixel phone shot never leaves
 * the device; avatar renders at 96px. Returns the original file when it is
 * already small and square enough.
 */
async function downscaleAvatar(file: File): Promise<File> {
  const MAX_DIMENSION = 512;
  const MAX_BYTES = 512 * 1024;
  if (file.size <= MAX_BYTES && /^image\/(jpeg|png|webp)$/.test(file.type)) {
    return file;
  }
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9),
    );
    if (!blob) return file;
    return new File([blob], "avatar.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}

export default function ProfileSettingsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { openUserProfile } = useClerk();
  const { mutate: updateUsername, isPending: usernamePending, error: usernameError } =
    useUpdateUsername();
  const { mutate: uploadAvatar, isPending: avatarPending } = useUploadAvatar();
  const { data: profileContact, isLoading: contactLoading } = useProfileContact();
  const { mutate: saveContact, isPending: contactPending } = useUpdateProfileContact();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [usernameDraft, setUsernameDraft] = useState<string | null>(null);
  const [phoneDraft, setPhoneDraft] = useState<string | null>(null);

  // Sync the local draft once the saved value arrives (null = untouched).
  const savedPhone = profileContact?.phone_number ?? "";
  const phoneValue = phoneDraft ?? savedPhone;
  const phoneDirty = phoneValue.trim() !== savedPhone.trim();

  if (!isLoaded || !isSignedIn || !user || contactLoading) {
    return (
      <div
        className="reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full"
        aria-busy="true"
        role="status"
        aria-label="Loading profile"
      >
        <div className="space-y-6">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
          <div className="h-48 w-full rounded-lg border border-border/40 bg-muted/30 animate-pulse" />
        </div>
      </div>
    );
  }

  const draft = usernameDraft ?? user.username ?? "";
  const usernameDirty = draft !== (user.username ?? "");

  const primaryEmail = user.primaryEmailAddress;
  const memberSince = user.createdAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(user.createdAt)
    : null;

  const signInMethod = user.passwordEnabled
    ? "Email and password"
    : primaryEmail?.verification?.status === "verified"
      ? "Verified email"
      : "External account";

  return (
    <div className="content-fade-in reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <SettingsDetailHeader
        title="Profile"
        description="Your photo, username, and phone number. These appear across SophionOS."
      />

      {/* Identity header */}
      <Card>
        <CardContent className="flex items-center gap-5 p-6">
          <div className="relative size-24 shrink-0">
            <span className="block size-full rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-0.5">
              <Avatar className="size-full rounded-full">
                {user.imageUrl ? <AvatarImage src={user.imageUrl} alt={displayNameOf(user)} /> : null}
                <AvatarFallback className="rounded-full bg-background text-lg font-medium text-foreground">
                  {initialsOf(user.fullName || user.username)}
                </AvatarFallback>
              </Avatar>
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                if (!file.type.startsWith("image/")) {
                  toast.error("Choose an image file (PNG, JPEG, or WebP).");
                  return;
                }
                if (file.size > 10 * 1024 * 1024) {
                  toast.error("Image is too large. Pick something under 10 MB.");
                  return;
                }
                uploadAvatar(await downscaleAvatar(file), {
                  onSuccess: () => fileInputRef.current?.blur(),
                });
              }}
              aria-label="Upload profile photo"
            />
            <button
              type="button"
              className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 rounded-full bg-foreground/60 text-xs font-medium text-background opacity-0 outline-none transition-opacity hover:opacity-100 focus-visible:opacity-100 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarPending}
            >
              {avatarPending ? (
                <Spinner className="text-background" />
              ) : (
                <>
                  <ImageUp className="size-4" />
                  <span>Upload</span>
                </>
              )}
            </button>
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold tracking-tight">
              {displayNameOf(user)}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {primaryEmail?.emailAddress ?? "No email on file"}
            </p>
            {user.username ? (
              <p className="mt-1 truncate text-sm text-muted-foreground">
                @{user.username}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Username */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Username</CardTitle>
          <CardDescription>
            4 to 64 characters: lowercase letters, numbers, hyphens, and underscores.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex-1 space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={draft}
              onChange={(e) => setUsernameDraft(e.target.value)}
              placeholder="e.g. maverick"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={64}
              aria-invalid={Boolean(usernameError) || undefined}
            />
            {clerkParamError(usernameError, "username") ? (
              <p className="text-sm text-destructive">
                {clerkParamError(usernameError, "username")}
              </p>
            ) : usernameError ? (
              <p className="text-sm text-destructive">{clerkErrorMessage(usernameError)}</p>
            ) : null}
          </div>
          <Button
            className="sm:mt-7"
            disabled={
              usernamePending ||
              !usernameDirty ||
              !USERNAME_PATTERN.test(draft)
            }
            onClick={() =>
              updateUsername(draft.trim(), {
                onSuccess: () => {
                  setUsernameDraft(null);
                  toast.success("Username saved");
                },
              })
            }
          >
            {usernamePending ? <Spinner data-icon="inline-start" /> : null}
            Save username
          </Button>
        </CardContent>
      </Card>

      {/* Phone numbers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Phone number</CardTitle>
          <CardDescription>
            A contact number for your account. It is not used to sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex-1 space-y-2">
            <Label htmlFor="phone-number">Phone number</Label>
            <Input
              id="phone-number"
              value={phoneValue}
              onChange={(e) => setPhoneDraft(sanitizePhoneInput(e.target.value))}
              placeholder="+1 555 000 1234"
              inputMode="tel"
              autoComplete="tel"
              disabled={contactPending}
            />
            <p className="text-xs text-muted-foreground">
              Optional. Stored with your account settings.
            </p>
          </div>
          <Button
            className="sm:mt-7"
            disabled={contactPending || !phoneDirty}
            onClick={() =>
              saveContact(
                { phone_number: phoneValue.trim() || null },
                {
                  onSuccess: () => {
                    setPhoneDraft(null);
                  },
                },
              )
            }
          >
            {contactPending ? <Spinner data-icon="inline-start" /> : null}
            Save phone number
          </Button>
        </CardContent>
      </Card>

      {/* Account (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>How you sign in and how long you have been here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">Email</p>
              <p className="truncate text-sm text-muted-foreground">
                {primaryEmail?.emailAddress ?? "Not set"}
              </p>
            </div>
            {primaryEmail ? (
              <Badge variant="secondary" className="shrink-0 gap-1">
                <BadgeCheck className="size-3" />
                Verified
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Sign-in method</p>
              <p className="text-sm text-muted-foreground">{signInMethod}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Member since</p>
              <p className="text-sm text-muted-foreground">{memberSince ?? "Just now"}</p>
            </div>
          </div>
          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void openUserProfile()}
            >
              Manage email, password, and MFA
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

function displayNameOf(user: UserResource): string {
  return user.fullName || user.firstName || user.username || "Your account";
}
