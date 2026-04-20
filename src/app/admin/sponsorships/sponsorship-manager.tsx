"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil } from "lucide-react";
import { SponsorshipDrawer } from "./sponsorship-drawer";
import type { SponsorshipItem, SponsorshipPurchase } from "@/types/database";

interface SponsorshipManagerProps {
  items: SponsorshipItem[];
  purchases: SponsorshipPurchase[];
}

type DrawerState = {
  open: boolean;
  mode: "create" | "edit";
  sponsorship: SponsorshipItem | null;
};

export function SponsorshipManager({
  items,
  purchases,
}: SponsorshipManagerProps) {
  const [drawer, setDrawer] = useState<DrawerState>({
    open: false,
    mode: "create",
    sponsorship: null,
  });

  const totalRevenue = purchases
    .filter((p) => p.payment_status === "paid")
    .reduce((sum, p) => sum + p.amount_paid_cents, 0);

  function handleDrawerSuccess() {
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-sm border border-border/60">
          <CardContent className="pt-4">
            <p className="font-display text-2xl font-bold text-foreground">{items.length}</p>
            <p className="font-sans text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground/80">Packages</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border border-border/60">
          <CardContent className="pt-4">
            <p className="font-display text-2xl font-bold text-foreground">{purchases.length}</p>
            <p className="font-sans text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground/80">Purchases</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border border-border/60">
          <CardContent className="pt-4">
            <p className="font-display text-2xl font-bold text-foreground">
              ${(totalRevenue / 100).toLocaleString()}
            </p>
            <p className="font-sans text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground/80">Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Sponsorship items */}
      <Card className="shadow-sm border border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-sans text-base font-semibold">Packages ({items.length})</CardTitle>
          <Button
            size="sm"
            onClick={() => setDrawer({ open: true, mode: "create", sponsorship: null })}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Package
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border/60 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50">
                  <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Name</TableHead>
                  <TableHead className="text-right text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Price</TableHead>
                  <TableHead className="text-right text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Sold</TableHead>
                  <TableHead className="text-right text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Max</TableHead>
                  <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground"
                    >
                      No sponsorship packages yet
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow
                      key={item.id}
                      className="border-t border-border/60 hover:bg-neutral-50/50 transition-colors duration-100 cursor-pointer"
                      onClick={() =>
                        setDrawer({ open: true, mode: "edit", sponsorship: item })
                      }
                    >
                      <TableCell>
                        <p className="font-medium text-[0.9375rem]">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {item.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums lining-nums font-medium">
                        {(item.price_cents / 100).toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono tabular-nums lining-nums ${
                          item.max_quantity && item.sold_count >= item.max_quantity
                            ? "text-warning font-semibold"
                            : "text-foreground"
                        }`}
                      >
                        {item.sold_count}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums lining-nums text-muted-foreground">
                        {item.max_quantity ?? "∞"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            `rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] ` +
                            (item.active
                              ? "bg-success-muted text-success"
                              : "bg-neutral-100 text-neutral-600")
                          }
                        >
                          {item.active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDrawer({ open: true, mode: "edit", sponsorship: item });
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Purchases */}
      {purchases.length > 0 && (
        <Card className="shadow-sm border border-border/60">
          <CardHeader>
            <CardTitle className="font-sans text-base font-semibold">Recent Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-border/60 shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50">
                    <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Purchaser</TableHead>
                    <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Company</TableHead>
                    <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</TableHead>
                    <TableHead className="text-right text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Amount</TableHead>
                    <TableHead className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="text-[0.9375rem] font-medium">{p.purchaser_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.purchaser_email}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.company_name || "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            `rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] ` +
                            (p.payment_status === "paid"
                              ? "bg-success-muted text-success"
                              : p.payment_status === "pending"
                              ? "bg-warning-muted text-warning"
                              : "bg-destructive/10 text-destructive")
                          }
                        >
                          {p.payment_status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums lining-nums">
                        {(p.amount_paid_cents / 100).toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </TableCell>
                      <TableCell className="font-mono text-[0.8125rem] text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <SponsorshipDrawer
        open={drawer.open}
        onOpenChange={(open) => setDrawer((d) => ({ ...d, open }))}
        mode={drawer.mode}
        sponsorship={drawer.sponsorship}
        onSubmit={handleDrawerSuccess}
        onDelete={handleDrawerSuccess}
      />
    </div>
  );
}
