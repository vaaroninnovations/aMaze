import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { Copy, Link2, Mail, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { errorMessage } from "@/lib/errors.ts";

type Props = {
  experimentId: Id<"experiments">;
  experimentName: string;
  shareToken?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function absoluteUrl(path: string) {
  return `${window.location.origin}${path}`;
}

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied.`);
  } catch {
    toast.error(`Could not copy the ${label.toLowerCase()}.`);
  }
}

export default function SharingDialog({
  experimentId,
  experimentName,
  shareToken,
  open,
  onOpenChange,
}: Props) {
  const members = useQuery(
    api.experiments.sharing.listMembers,
    open ? { experimentId } : "skip",
  );
  const updateShareLink = useMutation(api.experiments.sharing.updateShareLink);
  const invite = useMutation(api.experiments.sharing.invite);
  const removeMember = useMutation(api.experiments.sharing.removeMember);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [createdInvite, setCreatedInvite] = useState<{
    url: string;
    email: string;
    role: "viewer" | "editor";
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const setLink = async () => {
    setBusy(true);
    try {
      await updateShareLink({ experimentId, enabled: !shareToken });
      toast.success(
        shareToken ? "Share link disabled." : "Share link created.",
      );
    } catch (error) {
      toast.error(errorMessage(error, "Could not update the share link."));
    } finally {
      setBusy(false);
    }
  };

  const sendInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await invite({ experimentId, email, role });
      const url = absoluteUrl(`/invite/${result.inviteToken}`);
      setCreatedInvite({ url, email: result.email, role: result.role });
      setEmail("");
      toast.success(
        "Invitation created. Send it by email to the invited address.",
      );
    } catch (error) {
      toast.error(errorMessage(error, "Could not create the invitation."));
    } finally {
      setBusy(false);
    }
  };

  const mailto = createdInvite
    ? `mailto:${encodeURIComponent(createdInvite.email)}?subject=${encodeURIComponent(
        `Invitation to ${experimentName} on aMaze`,
      )}&body=${encodeURIComponent(
        `You have been invited as a ${createdInvite.role}.\n\nAccept the invitation: ${createdInvite.url}`,
      )}`
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-4" /> Share project
          </DialogTitle>
          <DialogDescription>
            Share{" "}
            <span className="font-medium text-foreground">
              {experimentName}
            </span>{" "}
            with a read-only link or invite collaborators by email.
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium">Read-only link</h3>
              <p className="text-xs text-muted-foreground">
                Anyone with the link can view project results.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={setLink}
            >
              <Link2 /> {shareToken ? "Disable link" : "Create link"}
            </Button>
          </div>
          {shareToken && (
            <div className="flex gap-2">
              <Input
                readOnly
                aria-label="Read-only share link"
                value={absoluteUrl(`/share/${shareToken}`)}
              />
              <Button
                size="icon"
                variant="outline"
                aria-label="Copy read-only link"
                onClick={() =>
                  void copyText(
                    absoluteUrl(`/share/${shareToken}`),
                    "Share link",
                  )
                }
              >
                <Copy />
              </Button>
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-lg border p-4">
          <div>
            <h3 className="text-sm font-medium">Invite by email</h3>
            <p className="text-xs text-muted-foreground">
              Invited users must sign in with the invited Google account.
            </p>
          </div>
          <form onSubmit={sendInvite} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="collaborator-email">Email address</Label>
              <Input
                id="collaborator-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="colleague@example.org"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collaborator-role">Permission</Label>
              <select
                id="collaborator-role"
                value={role}
                onChange={(event) =>
                  setRole(event.target.value as "viewer" | "editor")
                }
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="viewer">
                  Viewer — read project and results
                </option>
                <option value="editor">
                  Editor — change project and results
                </option>
              </select>
            </div>
            <Button type="submit" size="sm" disabled={busy}>
              <Mail /> Create email invitation
            </Button>
          </form>
          {createdInvite && (
            <div className="space-y-2 rounded-md bg-secondary/60 p-3">
              <p className="text-xs text-muted-foreground">
                Open an email draft or copy the invitation link to send it
                manually.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <a href={mailto}>
                    <Mail /> Open email
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void copyText(createdInvite.url, "Invitation link")
                  }
                >
                  <Copy /> Copy invite link
                </Button>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium">Invitations and collaborators</h3>
          {members === undefined ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : members.length === 0 ? (
            <p className="text-xs text-muted-foreground">No invitations yet.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {members.map((member) => (
                <li
                  key={member._id}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">{member.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.role} · {member.status}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {member.status === "pending" && (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Copy invite link for ${member.email}`}
                        onClick={() =>
                          void copyText(
                            absoluteUrl(`/invite/${member.inviteToken}`),
                            "Invitation link",
                          )
                        }
                      >
                        <Copy />
                      </Button>
                    )}
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Remove ${member.email}`}
                      onClick={() =>
                        void removeMember({
                          experimentId,
                          memberId: member._id,
                        }).catch((error: unknown) =>
                          toast.error(
                            errorMessage(
                              error,
                              "Could not remove collaborator.",
                            ),
                          ),
                        )
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
