import Link from "next/link";
import { Table2 } from "lucide-react";

import { translate, type Locale, type ResourceDefinition } from "@dashild/core";

import { Button } from "../ui/button.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card.js";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty.js";

interface DashboardHomeProps {
  resources: ResourceDefinition[];
  path: string;
  locale?: Locale;
}

export function DashboardHome({
  resources,
  path,
  locale,
}: DashboardHomeProps) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
        {translate(locale, "shell.dashboard")}
      </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {translate(locale, "shell.dashboardDescription").split("panel.ts")[0]}
          <code className="text-foreground">panel.ts</code>
          {translate(locale, "shell.dashboardDescription").split("panel.ts")[1] ?? ""}
        </p>
      </div>

      {resources.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Table2 />
            </EmptyMedia>
            <EmptyTitle>{translate(locale, "shell.noResources")}</EmptyTitle>
            <EmptyDescription>
              {translate(locale, "shell.noResourcesDescription")}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <code className="rounded-md bg-muted px-3 py-2 text-sm">
              pnpm dashild make:resource User
            </code>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {resources.map((resource) => (
            <Card key={resource.navigation.slug}>
              <CardHeader>
                <CardTitle>{resource.navigation.label}</CardTitle>
                <CardDescription>
                  {translate(locale, "shell.model")}{" "}
                  <code>{resource.model}</code>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild size="sm">
                  <Link href={`${path}/${resource.navigation.slug}`}>
                    {translate(locale, "shell.open")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
