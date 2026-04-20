import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Award, Camera, DollarSign, Mail, Trophy } from "lucide-react";
import { AdminPageHeading } from "@/components/admin/admin-page-heading";
import { getDashboardStats } from "./dashboard-actions";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  const formatRevenue = (cents: number) =>
    (cents / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });

  const cards = [
    {
      label: "Registrations",
      value: String(stats.registrations),
      sub: "teams registered",
      href: "/admin/teams",
      icon: Users,
    },
    {
      label: "Sponsors",
      value: String(stats.sponsors),
      sub: "active sponsors",
      href: "/admin/sponsors",
      icon: Award,
    },
    {
      label: "Revenue",
      value: formatRevenue(stats.revenue_cents),
      sub: "total collected",
      href: "/admin/sponsorships",
      icon: DollarSign,
    },
    {
      label: "Pending Photos",
      value: String(stats.pending_photos),
      sub: "awaiting review",
      href: "/admin/photos",
      icon: Camera,
    },
    {
      label: "Contacts",
      value: String(stats.contacts),
      sub: "total contacts",
      href: "/admin/contacts",
      icon: Mail,
    },
    {
      label: "Scores",
      value: String(stats.scores),
      sub: "entered",
      href: "/admin/scores",
      icon: Trophy,
    },
  ];

  return (
    <div>
      <AdminPageHeading
        title="Dashboard"
        description="Tournament overview and quick navigation."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="block rounded-lg transition-colors hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Card className="shadow-sm border border-border/60 transition-colors hover:border-border hover:bg-accent/30 cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.label}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="font-display text-2xl font-bold text-foreground">
                    {card.value}
                  </p>
                  <p className="font-sans text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground/80">
                    {card.sub}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
