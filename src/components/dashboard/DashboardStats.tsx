import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SheetLead } from "@/lib/googleSheets";
import { Users, TrendingUp, CheckCircle, Clock, Flame, Target } from "lucide-react";
import { useMemo, useState } from "react";
import LeadsDetailDialog from "./LeadsDetailDialog";
import HotLeadsDialog from "./HotLeadsDialog";

interface DashboardStatsProps {
  leads: SheetLead[];
}

type StatCategory = 'total' | 'new' | 'working' | 'booked' | 'hot';

const DashboardStats = ({ leads }: DashboardStatsProps) => {
  const [selectedCategory, setSelectedCategory] = useState<StatCategory | null>(null);

  // 🆕 NEW LEADS: blank or "unfollowed"
  const newLeads = useMemo(() =>
    leads.filter(lead => {
      const status = (lead.status || "").toLowerCase();
      const hasData =
        lead.travellerName?.trim() ||
        lead.phone?.trim() ||
        lead.tripId?.trim();

      return (
        hasData &&
        (status === "" || status.includes("unfollowed"))
      );
    }),
    [leads]
  );

  // ⚙️ WORKING LEADS: follow-up + all ongoing statuses (excluding hot)
  const workingLeads = useMemo(() =>
    leads.filter(lead => {
      const status = (lead.status || "").toLowerCase();
      return (
        status.includes("follow-up") ||
        status.includes("working") ||
        status.includes("whatsapp") ||
        status.includes("proposal") ||
        status.includes("negotiations")
      );
    }),
    [leads]
  );

  // ✅ BOOKED LEADS: booked with us
  const bookedLeads = useMemo(() =>
    leads.filter(lead =>
      (lead.status || "").toLowerCase().includes("booked with us")
    ),
    [leads]
  );

  // 🔥 HOT LEADS: status contains "hot"
  const hotLeads = useMemo(() =>
    leads.filter(lead =>
      (lead.status || "").toLowerCase().includes("hot")
    ),
    [leads]
  );

  const totalLeads = leads.length;
  const conversionRate = totalLeads > 0 ? ((bookedLeads.length / totalLeads) * 100).toFixed(1) : '0';
  const activeEngagement = workingLeads.length + hotLeads.length;

  const topStats = [
    {
      title: "Total Leads",
      value: totalLeads,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
      category: 'total' as StatCategory,
      leads: leads,
    },
    {
      title: "New/Unfollowed",
      value: newLeads.length,
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      category: 'new' as StatCategory,
      leads: newLeads,
    },
    {
      title: "Working On",
      value: workingLeads.length,
      icon: TrendingUp,
      color: "text-warning",
      bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
      category: 'working' as StatCategory,
      leads: workingLeads,
    },
    {
      title: "Hot Leads",
      value: hotLeads.length,
      icon: Flame,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
      category: 'hot' as StatCategory,
      leads: hotLeads,
    },
    {
      title: "Booked",
      value: bookedLeads.length,
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-green-50 dark:bg-green-950/20",
      category: 'booked' as StatCategory,
      leads: bookedLeads,
    },
  ];

  // ✅ Bottom analytics cards (NO Hot Leads here)
  const analyticsCards = [
    {
      title: "Conversion Rate",
      value: `${conversionRate}%`,
      subtitle: `${bookedLeads.length} of ${totalLeads} leads converted`,
      status: "Needs Focus",
      statusColor: "text-red-600",
      icon: Target,
    },
    {
      title: "Active Engagement",
      value: `${((activeEngagement / totalLeads) * 100).toFixed(1)}%`,
      subtitle: `${activeEngagement} leads being worked on`,
      status: "Good",
      statusColor: "text-green-600",
      icon: TrendingUp,
    },
    {
      title: "New/Unfollowed",
      value: newLeads.length.toString(),
      subtitle: "Leads awaiting initial contact",
      status: "Action Needed",
      statusColor: "text-orange-600",
      icon: Clock,
    },
  ];

  const handleCardClick = (category: StatCategory) => {
    setSelectedCategory(category);
  };

  const selectedStat = topStats.find(s => s.category === selectedCategory);

  return (
    <>
      <div className="space-y-4">
        {/* Top Stats Row - 5 cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {topStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={stat.title} 
                className="hover:shadow-lg transition-all duration-300 animate-fade-in cursor-pointer hover:scale-105 active:scale-95"
                onClick={() => handleCardClick(stat.category)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <div className={`${stat.bgColor} p-2 rounded-lg`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  {stat.title === "Booked" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {conversionRate}% conversion rate
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Click to view details →
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Bottom Analytics Row - 3 cards (NO Hot Leads) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {analyticsCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {card.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{card.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                  <p className={`text-xs font-medium mt-2 ${card.statusColor}`}>
                    {card.status}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Detail Dialog for Total, New, Working, Booked */}
      {selectedStat && selectedCategory !== 'hot' && (
        <LeadsDetailDialog
          open={!!selectedCategory}
          onClose={() => setSelectedCategory(null)}
          title={selectedStat.title}
          leads={selectedStat.leads}
          color={selectedStat.color}
        />
      )}

      {/* Hot Leads Grid Dialog */}
      {selectedCategory === 'hot' && (
        <HotLeadsDialog
          open={selectedCategory === 'hot'}
          onClose={() => setSelectedCategory(null)}
          leads={hotLeads}
        />
      )}
    </>
  );
};

export default DashboardStats;
