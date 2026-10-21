import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { useConvexAuth } from "@convex-dev/auth/react";
import { UserRound } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import AppHeader from "@/components/app-header.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import AccountAuthDialog from "@/components/account-auth-dialog.tsx";

export default function ProfilePage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );
  const updateProfile = useMutation(api.users.updateProfile);
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
    setInstitution(user.institution ?? "");
  }, [user]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ name, institution });
      toast.success("Profile updated.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update the profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-2xl space-y-6 p-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="text-sm text-muted-foreground">
            Manage your aMaze account and profile details.
          </p>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading account…</p>
        ) : !isAuthenticated ? (
          <div className="space-y-4 rounded-lg border p-5">
            <p className="text-sm text-muted-foreground">
              Sign in or create an account to view and edit your profile.
            </p>
            <AccountAuthDialog
              redirectTo={new URL(
                "/profile",
                window.location.origin,
              ).toString()}
              trigger={<Button>Sign in or create account</Button>}
            />
          </div>
        ) : user ? (
          <form onSubmit={save} className="space-y-5 rounded-lg border p-5">
            <div className="flex items-center gap-3">
              {user.image ? (
                <img
                  src={user.image}
                  alt=""
                  className="size-12 rounded-full object-cover"
                />
              ) : (
                <div className="grid size-12 place-items-center rounded-full bg-secondary">
                  <UserRound className="size-6" />
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-medium">{user.email}</p>
                <p className="text-sm text-muted-foreground">aMaze account</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-institution">Institution</Label>
              <Input
                id="profile-institution"
                value={institution}
                onChange={(event) => setInstitution(event.target.value)}
                maxLength={160}
                placeholder="Optional"
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">Loading profile…</p>
        )}
      </main>
    </div>
  );
}
