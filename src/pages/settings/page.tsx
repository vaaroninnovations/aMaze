import { useRef, useState, type FormEvent } from "react";
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { useAction, useMutation, useQuery } from "convex/react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ImagePlus,
  LockKeyhole,
  Settings2,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import AccountAuthDialog from "@/components/account-auth-dialog.tsx";
import AppHeader from "@/components/app-header.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { TEMPLATES } from "@/lib/tracking/templates.ts";
import { errorMessage } from "@/lib/errors.ts";

const DEFAULT_PREFERENCES = {
  theme: "system" as const,
  landingPage: "/" as const,
  defaultMazeType: "open-field",
  measurementUnits: "metric" as const,
  notifications: true,
};

type Preferences = {
  theme: "light" | "dark" | "system";
  landingPage: "/" | "/track" | "/projects" | "/experiments";
  defaultMazeType: string;
  measurementUnits: "metric" | "imperial";
  notifications: boolean;
};

async function uploadFile(
  url: string,
  file: File,
): Promise<Id<"_storage">> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!response.ok) throw new Error("Image upload failed. Please try again.");
  const result = (await response.json()) as { storageId: Id<"_storage"> };
  return result.storageId;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length
    ? `${parts[0]?.[0] ?? ""}${parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : ""}`.toUpperCase()
    : "U";
}

export default function SettingsPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );
  const updateProfile = useMutation(api.users.updateProfile);
  const updatePreferences = useMutation(api.users.updatePreferences);
  const generateUploadUrl = useMutation(api.users.generateProfileImageUploadUrl);
  const saveProfileImage = useAction(api.users.saveProfileImage);
  const deleteAccount = useMutation(api.users.deleteAccount);
  const { signIn, signOut } = useAuthActions();
  const navigate = useNavigate();
  const imageInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string | undefined>();
  const [institution, setInstitution] = useState<string | undefined>();
  const [preferences, setPreferences] = useState<Preferences>();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);

  const currentName = name ?? user?.name ?? "";
  const currentInstitution = institution ?? user?.institution ?? "";
  const currentPreferences: Preferences = {
    ...DEFAULT_PREFERENCES,
    ...user?.preferences,
    ...preferences,
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({ name: currentName, institution: currentInstitution });
      toast.success("Profile information saved.");
    } catch (error) {
      toast.error(errorMessage(error, "Could not save profile information."));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePreferences = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingPreferences(true);
    try {
      await updatePreferences({ preferences: currentPreferences });
      toast.success("Preferences saved.");
    } catch (error) {
      toast.error(errorMessage(error, "Could not save preferences."));
    } finally {
      setSavingPreferences(false);
    }
  };

  const changeImage = async (file: File | undefined) => {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      toast.error("Choose a JPEG, PNG, or WebP image up to 5 MB.");
      return;
    }
    setUploadingImage(true);
    try {
      const url = await generateUploadUrl({});
      const storageId = await uploadFile(url, file);
      await saveProfileImage({ storageId });
      toast.success("Profile image updated.");
    } catch (error) {
      toast.error(errorMessage(error, "Could not update the profile image."));
    } finally {
      setUploadingImage(false);
      if (imageInput.current) imageInput.current.value = "";
    }
  };

  const removeAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount({});
      window.location.assign("/");
    } catch (error) {
      toast.error(errorMessage(error, "Could not delete the account."));
    } finally {
      setDeleting(false);
    }
  };

  const requestPasswordReset = async () => {
    const email = user?.email;
    if (!email) return;
    setSendingPasswordReset(true);
    try {
      await signIn("password", {
        flow: "reset",
        email,
        redirectTo: "/reset-password",
      });
      toast.success(
        "If a password account matches your email, a reset link has been sent.",
      );
    } catch {
      toast.error("Could not send the reset email. Please try again later.");
    } finally {
      setSendingPasswordReset(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="mx-auto max-w-3xl p-4 py-8 text-sm text-muted-foreground">
          Checking account…
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="mx-auto max-w-3xl space-y-4 p-4 py-8">
          <h1 className="text-2xl font-semibold">Account Settings</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to view and manage your account settings.
          </p>
          <AccountAuthDialog
            redirectTo={new URL("/settings", window.location.origin).toString()}
            trigger={<Button>Sign in</Button>}
          />
          <p className="text-sm text-muted-foreground">
            Read our{" "}
            <Link
              to="/terms-of-service"
              className="text-primary underline underline-offset-4"
            >
              Terms of Service
            </Link>
            {" "}and{" "}
            <Link
              to="/privacy-policy"
              className="text-primary underline underline-offset-4"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="mx-auto max-w-3xl p-4 py-8 text-sm text-muted-foreground">
          Loading account settings…
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl space-y-7 p-4 py-8">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-primary">
            Account
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Account Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your profile, workspace defaults, and account security.
          </p>
        </div>

        <section className="space-y-5 rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2">
            <UserRound className="size-4 text-primary" />
            <h2 className="font-semibold">Profile information</h2>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Avatar className="size-16 border">
              <AvatarImage
                src={user?.imageUrl ?? undefined}
                alt={user?.name ?? "Profile"}
              />
              <AvatarFallback className="bg-primary/15 font-semibold text-primary">
                {initials(user?.name ?? "")}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <input
                ref={imageInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                aria-label="Choose a profile image"
                onChange={(event) => void changeImage(event.target.files?.[0])}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={uploadingImage}
                onClick={() => imageInput.current?.click()}
              >
                <ImagePlus />
                {uploadingImage ? "Uploading…" : "Change profile image"}
              </Button>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, or WebP; up to 5 MB.
              </p>
            </div>
          </div>
          <form onSubmit={(event) => void saveProfile(event)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="settings-name">Full name</Label>
                <Input
                  id="settings-name"
                  value={currentName}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={120}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-email">Email address</Label>
                <Input
                  id="settings-email"
                  type="email"
                  value={user?.email ?? ""}
                  readOnly
                  aria-describedby="email-note"
                />
                <p id="email-note" className="text-xs text-muted-foreground">
                  Email changes are not supported by the configured Google and
                  password sign-in flows.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-institution">Institution</Label>
              <Input
                id="settings-institution"
                value={currentInstitution}
                onChange={(event) => setInstitution(event.target.value)}
                maxLength={160}
                placeholder="Optional"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Authentication provider:{" "}
              <span className="font-medium text-foreground">
                {user?.authenticationProvider ?? "Loading…"}
              </span>
            </p>
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Save profile"}
            </Button>
          </form>
        </section>

        <section className="space-y-5 rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2">
            <Settings2 className="size-4 text-primary" />
            <h2 className="font-semibold">General preferences</h2>
          </div>
          <form onSubmit={(event) => void savePreferences(event)} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select
                  value={currentPreferences.theme}
                  onValueChange={(value) =>
                    setPreferences({
                      ...currentPreferences,
                      theme: value as Preferences["theme"],
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default landing page</Label>
                <Select
                  value={currentPreferences.landingPage}
                  onValueChange={(value) =>
                    setPreferences({
                      ...currentPreferences,
                      landingPage: value as Preferences["landingPage"],
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="/">Home</SelectItem>
                    <SelectItem value="/track">Tracking workspace</SelectItem>
                    <SelectItem value="/projects">My projects</SelectItem>
                    <SelectItem value="/experiments">Experiments</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default maze type</Label>
                <Select
                  value={currentPreferences.defaultMazeType}
                  onValueChange={(value) =>
                    setPreferences({
                      ...currentPreferences,
                      defaultMazeType: value,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATES.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Preferred measurement units</Label>
                <Select
                  value={currentPreferences.measurementUnits}
                  onValueChange={(value) =>
                    setPreferences({
                      ...currentPreferences,
                      measurementUnits:
                        value as Preferences["measurementUnits"],
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metric">Metric (cm, m)</SelectItem>
                    <SelectItem value="imperial">Imperial (in, ft)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div>
                <Label htmlFor="settings-notifications">
                  Account notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Store your notification preference for future account updates.
                </p>
              </div>
              <Switch
                id="settings-notifications"
                checked={currentPreferences.notifications}
                onCheckedChange={(checked) =>
                  setPreferences({
                    ...currentPreferences,
                    notifications: checked,
                  })
                }
              />
            </div>
            <Button type="submit" disabled={savingPreferences}>
              {savingPreferences ? "Saving…" : "Save preferences"}
            </Button>
          </form>
        </section>

        <section className="space-y-3 rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <h2 className="font-semibold">Account security</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Signed in using{" "}
            <span className="font-medium text-foreground">
              {user?.authenticationProvider ?? "the configured provider"}
            </span>
            . Sessions are managed by Convex Auth.
          </p>
          {user?.authenticationProvider
            ?.toLowerCase()
            .split(", ")
            .includes("password") && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Password changes are verified through a time-limited link sent
                to your account email.
              </p>
              <Button
                type="button"
                variant="secondary"
                disabled={sendingPasswordReset}
                onClick={() => void requestPasswordReset()}
              >
                {sendingPasswordReset
                  ? "Sending reset link…"
                  : "Send password reset link"}
              </Button>
            </div>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              void signOut()
                .then(() => navigate("/", { replace: true }))
                .catch(() => toast.error("Could not sign out. Please try again."))
            }
          >
            <LockKeyhole /> Sign out securely
          </Button>
        </section>

        <section className="space-y-3 rounded-xl border border-destructive/50 bg-destructive/[0.03] p-5">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-4" />
            <h2 className="font-semibold">Danger zone</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Delete your aMaze account and permanently remove its projects,
            tracking records, experiment metadata, uploaded videos, and saved
            analyses. Related stored data is removed through a secure
            server-side cleanup.
          </p>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              setDeleteConfirmation("");
              setDeleteOpen(true);
            }}
          >
            <Trash2 /> Delete account
          </Button>
        </section>
        <p className="text-sm text-muted-foreground">
          <Link
            to="/terms-of-service"
            className="text-primary underline underline-offset-4"
          >
            Terms of Service
          </Link>
          <span className="mx-2">·</span>
          <Link
            to="/privacy-policy"
            className="text-primary underline underline-offset-4"
          >
            Privacy Policy
          </Link>
        </p>
      </main>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => !deleting && setDeleteOpen(open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Permanently delete your account?
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. Your projects, trial tracking
              coordinates, experiment metadata, uploaded videos, saved analyses,
              profile image, and active authentication sessions will be removed.
              For your security, the server requires a sign-in from the last 15
              minutes. If that check fails, sign out and sign in again before
              retrying.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-confirmation">
              Type <span className="font-mono font-semibold">DELETE</span> to
              confirm
            </Label>
            <Input
              id="delete-confirmation"
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={deleting}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting || deleteConfirmation !== "DELETE"}
              onClick={() => void removeAccount()}
            >
              {deleting ? "Deleting…" : "Delete account permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
