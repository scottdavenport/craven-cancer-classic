"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { getSponsors } from "./actions";
import { SponsorDrawer } from "./sponsor-drawer";
import type { SponsorshipItemOption } from "./sponsor-form";
import type { Sponsor } from "@/types/database";

interface SponsorListProps {
  sponsors: Sponsor[];
  sponsorshipItems: SponsorshipItemOption[];
}

type DrawerState = {
  open: boolean;
  mode: "create" | "edit";
  sponsor: Sponsor | null;
};

export function SponsorList({ sponsors: initialSponsors, sponsorshipItems }: SponsorListProps) {
  const [sponsors, setSponsors] = useState<Sponsor[]>(initialSponsors);
  const [isPending, startTransition] = useTransition();
  const [drawer, setDrawer] = useState<DrawerState>({
    open: false,
    mode: "create",
    sponsor: null,
  });

  function refetch() {
    startTransition(async () => {
      try {
        const fresh = await getSponsors();
        setSponsors(fresh);
      } catch (err) {
        console.error("[SponsorList] refetch failed:", err);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Sponsors table */}
      <Card
        className="shadow-sm border border-border/60"
        style={{ opacity: isPending ? 0.6 : 1 }}
      >
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-sans text-base font-semibold">
            Sponsors ({sponsors.length})
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setDrawer({ open: true, mode: "create", sponsor: null })}
          >
            <Plus className="mr-1 h-4 w-4" />
            New Sponsor
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border/60 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50">
                  <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Name</TableHead>
                  <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tier</TableHead>
                  <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Contact</TableHead>
                  <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Website</TableHead>
                  <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sponsors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No sponsors yet. Click &quot;New Sponsor&quot; to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  sponsors.map((sponsor) => (
                    <TableRow
                      key={sponsor.id}
                      className="border-t border-border/60 hover:bg-neutral-50/50 transition-colors duration-100 cursor-pointer"
                      onClick={() =>
                        setDrawer({ open: true, mode: "edit", sponsor })
                      }
                    >
                      <TableCell className="font-medium text-[0.9375rem]">
                        {sponsor.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sponsorshipItems.find((item) => item.id === sponsor.tier_id)?.name ?? (
                          <span className="text-muted-foreground/50">Unknown tier</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sponsor.contact_name || "—"}
                      </TableCell>
                      <TableCell>
                        {sponsor.website ? (
                          <span className="font-mono text-xs text-muted-foreground/70 truncate max-w-[160px] block">
                            {sponsor.website}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            `rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] ` +
                            (sponsor.payment_status === "paid"
                              ? "bg-success-muted text-success"
                              : sponsor.payment_status === "comped"
                              ? "bg-neutral-100 text-neutral-600"
                              : "bg-warning-muted text-warning")
                          }
                        >
                          {sponsor.payment_status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        ${(sponsor.amount_paid_cents / 100).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <SponsorDrawer
        open={drawer.open}
        onOpenChange={(open) => setDrawer((d) => ({ ...d, open }))}
        mode={drawer.mode}
        sponsor={drawer.sponsor ?? undefined}
        sponsorshipItems={sponsorshipItems}
        onSuccess={refetch}
      />
    </div>
  );
}
