import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Award, Camera, DollarSign } from "lucide-react";
import { AdminPageHeading } from "@/components/admin/admin-page-heading";
import { LinkButton } from "@/components/ui/link-button";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

export default function AdminDashboardPage() {
  return (
    <div>
      <AdminPageHeading
        title="Dashboard"
        description="Tournament overview and quick navigation."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Registrations
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-bold text-foreground">0</p>
            <p className="font-sans text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground/80">
              teams registered
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sponsors
            </CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-bold text-foreground">0</p>
            <p className="font-sans text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground/80">
              active sponsors
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-bold text-foreground">$0</p>
            <p className="font-sans text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground/80">
              total collected
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Photos
            </CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-bold text-foreground">0</p>
            <p className="font-sans text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground/80">
              awaiting review
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <LinkButton href="/admin/teams" variant="outline" size="sm">
          Manage Registrations
        </LinkButton>
        <LinkButton href="/admin/scores" variant="outline" size="sm">
          Upload Scores
        </LinkButton>
      </div>
    </div>
  );
}
