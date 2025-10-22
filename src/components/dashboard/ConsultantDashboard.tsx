import { useState, useEffect, useMemo, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { GoogleSheetsService, SheetLead } from "@/lib/googleSheets";
import { authService } from "@/lib/authService";
import { secureStorage } from "@/lib/secureStorage";
import { LeadCard } from "./LeadCard";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LeadDetailsDialog from "./LeadDetailsDialog";
import AddLeadDialog from "./AddLeadDialog";
import LeadFilters from "./LeadFilters";
import SearchBar from "./SearchBar";
import DashboardStats from "./DashboardStats";

const ConsultantDashboard = () => {
  const [leads, setLeads] = useState<SheetLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<SheetLead | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [priorityFilter, setPriorityFilter] = useState("All Priorities");
  const [dateFilter, setDateFilter] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const { toast } = useToast();
  const session = authService.getSession();
  const sheetsServiceRef = useRef<GoogleSheetsService | null>(null);

  const fetchLeads = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const credentials = await secureStorage.getCredentials();
      if (!credentials) throw new Error('Google Sheets not configured');

      const sheetsService = new GoogleSheetsService({
        apiKey: credentials.googleApiKey || '',
        sheetId: credentials.googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] || '',
        worksheetNames: credentials.worksheetNames,
        columnMappings: credentials.columnMappings
      });

      const data = await sheetsService.fetchLeads();
      const myLeads = data.filter(l => l.consultant?.toLowerCase() === session?.user.name?.toLowerCase());
      setLeads(myLeads);
    try {
      if (!silent) setLoading(true);
      
      const data = await sheetsService.current.fetchLeads();
      
      // Filter leads assigned to this consultant
      const myLeads = data.filter(lead => 
        lead.consultant && 
        lead.consultant.toLowerCase().includes(session?.user.name.toLowerCase() || '')
      );
      
      setLeads(myLeads);
      
      if (silent) {
        console.log('Background sync completed');
      }
    } catch (error: any) {
      if (!silent) {
        toast({
          variant: "destructive",
          title: "Error fetching leads",
          description: error.message,
        });
      } else {
        console.error('Background sync error:', error);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Silent background sync every 30 seconds without navigation
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLeads(true); // Silent sync
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter and search logic
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = !searchQuery || 
        lead.tripId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.travellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone.includes(searchQuery);
      
      const matchesStatus = statusFilter === "All Statuses" || lead.status === statusFilter;
      const matchesPriority = priorityFilter === "All Priorities" || lead.priority?.toLowerCase() === priorityFilter.toLowerCase();
      const matchesDate = !dateFilter || lead.date === dateFilter;
      
      return matchesSearch && matchesStatus && matchesPriority && matchesDate;
    });
  }, [leads, searchQuery, statusFilter, priorityFilter, dateFilter]);

  // Categorize leads by status
  const newLeads = useMemo(() => 
    filteredLeads.filter(lead => 
      lead.status.toLowerCase().includes('unfollowed') || 
      lead.status.toLowerCase().includes('follow-up')
    ), [filteredLeads]
  );

  const workingLeads = useMemo(() => 
    filteredLeads.filter(lead => 
      lead.status.toLowerCase().includes('working') || 
      lead.status.toLowerCase().includes('whatsapp') ||
      lead.status.toLowerCase().includes('proposal') ||
      lead.status.toLowerCase().includes('negotiations') ||
      lead.status.toLowerCase().includes('hot')
    ), [filteredLeads]
  );

  const bookedLeads = useMemo(() => 
    filteredLeads.filter(lead => 
      lead.status.toLowerCase().includes('booked with us')
    ), [filteredLeads]
  );

  const renderLeadGrid = (leadsToRender: SheetLead[]) => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your leads...</p>
        </div>
      );
    }

    if (leadsToRender.length === 0) {
      return (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">No leads found matching the criteria.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {leadsToRender.map((lead, index) => (
          <LeadCard 
            key={`${lead.tripId}-${index}`} 
            lead={lead} 
            onClick={() => setSelectedLead(lead)} 
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">My Leads</h2>
          <p className="text-muted-foreground">Manage your assigned leads</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
          <Button onClick={() => fetchLeads()} variant="outline" className="gap-2" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <SearchBar value={searchQuery} onChange={setSearchQuery} />

      <LeadFilters
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        dateFilter={dateFilter}
        onStatusChange={setStatusFilter}
        onPriorityChange={setPriorityFilter}
        onDateFilterChange={setDateFilter}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">
            Dashboard ({leads.length})
          </TabsTrigger>
          <TabsTrigger value="new">
            New Leads ({newLeads.length})
          </TabsTrigger>
          <TabsTrigger value="working">
            Working ({workingLeads.length})
          </TabsTrigger>
          <TabsTrigger value="booked">
            Booked ({bookedLeads.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <DashboardStats leads={leads} />
          {renderLeadGrid(filteredLeads)}
        </TabsContent>

        <TabsContent value="new">
          {renderLeadGrid(newLeads)}
        </TabsContent>

        <TabsContent value="working">
          {renderLeadGrid(workingLeads)}
        </TabsContent>

        <TabsContent value="booked">
          {renderLeadGrid(bookedLeads)}
        </TabsContent>
      </Tabs>

      {selectedLead && (
        <LeadDetailsDialog
          lead={selectedLead}
          open={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={fetchLeads}
        />
      )}

      {showAddDialog && (
        <AddLeadDialog
          open={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onSuccess={fetchLeads}
        />
      )}
    </div>
  );
};

export default ConsultantDashboard;
