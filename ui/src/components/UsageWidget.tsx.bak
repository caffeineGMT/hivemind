import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Download, AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";

interface UsageData {
  account_id: string;
  tier: string;
  agent_hours: {
    used: number;
    included: number;
    overage: number;
    overage_charge: number;
  };
  api_spend: {
    used: number;
    included: number;
    overage: number;
    overage_charge: number;
  };
  estimated_bill: number;
  total_overage_charge: number;
}

interface UsageWidgetProps {
  accountId: string;
}

export function UsageWidget({ accountId }: UsageWidgetProps) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsage();
    // Refresh every 5 minutes
    const interval = setInterval(fetchUsage, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [accountId]);

  const fetchUsage = async () => {
    try {
      const res = await fetch(`/api/accounts/${accountId}/usage`);
      if (!res.ok) throw new Error("Failed to fetch usage");
      const data = await res.json();
      setUsage(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startDate = startOfMonth.toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];

    const url = `/api/accounts/${accountId}/usage/export?startDate=${startDate}&endDate=${endDate}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage & Billing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading usage data...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage & Billing</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!usage) return null;

  const agentHoursPct = usage.agent_hours.included
    ? (usage.agent_hours.used / usage.agent_hours.included) * 100
    : 0;
  const apiSpendPct = usage.api_spend.included
    ? (usage.api_spend.used / usage.api_spend.included) * 100
    : 0;

  const hasOverage = usage.total_overage_charge > 0;
  const approaching80 = agentHoursPct >= 80 || apiSpendPct >= 80;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Usage & Billing</CardTitle>
            <CardDescription>
              Current month • {usage.tier.charAt(0).toUpperCase() + usage.tier.slice(1)} plan
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadCSV}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alerts */}
        {hasOverage && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Overage charges: ${usage.total_overage_charge.toFixed(2)}</strong>
              <br />
              You've exceeded your monthly quota. Additional usage will be billed at overage rates.
            </AlertDescription>
          </Alert>
        )}

        {!hasOverage && approaching80 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You're approaching your monthly quota limits. Consider upgrading your plan.
            </AlertDescription>
          </Alert>
        )}

        {/* Agent Hours */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="font-medium">Agent Hours</div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {usage.agent_hours.used.toFixed(2)} / {usage.agent_hours.included || '∞'} hours
              </span>
              {usage.agent_hours.overage > 0 && (
                <Badge variant="destructive">
                  +{usage.agent_hours.overage.toFixed(2)} hrs (${usage.agent_hours.overage_charge.toFixed(2)})
                </Badge>
              )}
            </div>
          </div>
          <Progress
            value={Math.min(agentHoursPct, 100)}
            className={agentHoursPct > 100 ? "bg-red-200" : agentHoursPct >= 80 ? "bg-yellow-200" : ""}
          />
          <p className="text-xs text-muted-foreground">
            {agentHoursPct.toFixed(0)}% of quota used
            {usage.agent_hours.overage > 0 && " (over quota)"}
          </p>
        </div>

        {/* API Spend */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="font-medium">API Spend</div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                ${usage.api_spend.used.toFixed(2)} / ${usage.api_spend.included || '∞'}
              </span>
              {usage.api_spend.overage > 0 && (
                <Badge variant="destructive">
                  +${usage.api_spend.overage.toFixed(2)} (${usage.api_spend.overage_charge.toFixed(2)})
                </Badge>
              )}
            </div>
          </div>
          <Progress
            value={Math.min(apiSpendPct, 100)}
            className={apiSpendPct > 100 ? "bg-red-200" : apiSpendPct >= 80 ? "bg-yellow-200" : ""}
          />
          <p className="text-xs text-muted-foreground">
            {apiSpendPct.toFixed(0)}% of quota used
            {usage.api_spend.overage > 0 && " (over quota)"}
          </p>
        </div>

        {/* Estimated Bill */}
        {usage.estimated_bill > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estimated overage charges</span>
              <span className="text-lg font-bold text-destructive">
                ${usage.estimated_bill.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Billed monthly via Paddle
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
