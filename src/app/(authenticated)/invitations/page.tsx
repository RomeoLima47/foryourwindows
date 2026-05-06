"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/toast";

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function InvitationsPage() {
  const { toast } = useToast();
  const invitations = useQuery(api.invitations.listMyPending);
  const acceptInvite = useMutation(api.invitations.accept);
  const declineInvite = useMutation(api.invitations.decline);

  const handleAccept = async (id: any, projectName: string) => {
    await acceptInvite({ id });
    toast(`Joined "${projectName}"! 🎉`);
  };

  const handleDecline = async (id: any, projectName: string) => {
    await declineInvite({ id });
    toast(`Declined invite to "${projectName}"`, "info");
  };

  if (invitations === undefined) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Invitations</h1>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Invitations</h1>
        <p className="text-sm text-muted-foreground">
          {invitations.length} pending invitation{invitations.length !== 1 ? "s" : ""}
        </p>
      </div>

      {invitations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="mb-2 text-3xl">📬</p>
            <p className="text-muted-foreground">No pending invitations.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              When someone invites you to a project, it will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invitations.map((invite) => (
            <Card key={invite._id} className="transition-all hover:shadow-md">
              <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-2xl">📬</span>
                  <div>
                    <p className="font-medium">
                      {invite.inviterName} invited you to{" "}
                      <span className="text-primary">{invite.projectName}</span>
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {invite.role}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(invite.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pl-9 sm:pl-0">
                  <Button
                    size="sm"
                    onClick={() => handleAccept(invite._id, invite.projectName)}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDecline(invite._id, invite.projectName)}
                  >
                    Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
