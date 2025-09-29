import { BarChart3, TrendingUp, Users, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Track performance across all your marketing campaigns</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="30d">
            <SelectTrigger className="w-32" data-testid="select-analytics-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" data-testid="button-export">
            Export Data
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card data-testid="card-total-clicks">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Clicks</CardTitle>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">12,847</div>
            <p className="text-sm text-green-600">+15.2% from last month</p>
          </CardContent>
        </Card>

        <Card data-testid="card-conversion-rate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">4.2%</div>
            <p className="text-sm text-green-600">+0.8% from last month</p>
          </CardContent>
        </Card>

        <Card data-testid="card-active-campaigns">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Campaigns</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">24</div>
            <p className="text-sm text-green-600">+3 new this month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Performing Channels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Social Media", clicks: 4250, rate: "5.2%" },
                { name: "Email Campaign", clicks: 3100, rate: "4.8%" },
                { name: "Google Ads", clicks: 2890, rate: "3.9%" },
                { name: "LinkedIn Ads", clicks: 1650, rate: "3.2%" },
              ].map((channel, index) => (
                <div key={index} className="flex items-center justify-between" data-testid={`channel-${index}`}>
                  <div>
                    <div className="font-medium text-foreground">{channel.name}</div>
                    <div className="text-sm text-muted-foreground">{channel.clicks.toLocaleString()} clicks</div>
                  </div>
                  <Badge variant="secondary">{channel.rate} CTR</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: "Campaign Created", item: "Summer Product Launch", time: "2 hours ago" },
                { action: "High Traffic Alert", item: "Email Newsletter Signup", time: "4 hours ago" },
                { action: "Campaign Updated", item: "Google Ads - Retargeting", time: "6 hours ago" },
                { action: "New Channel Added", item: "TikTok Ads", time: "1 day ago" },
              ].map((activity, index) => (
                <div key={index} className="flex items-start gap-3" data-testid={`activity-${index}`}>
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{activity.action}</div>
                    <div className="text-sm text-muted-foreground">{activity.item}</div>
                    <div className="text-xs text-muted-foreground">{activity.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-16 text-muted-foreground">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Charts Coming Soon</h3>
            <p>Interactive analytics charts will be integrated in the full application</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}