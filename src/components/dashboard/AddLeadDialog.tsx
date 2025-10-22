import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { GoogleSheetsService, SheetLead } from "@/lib/googleSheets";
import { authService } from "@/lib/authService";
import { secureStorage } from "@/lib/secureStorage";
import AddLeadErrorDialog from "./AddLeadErrorDialog";

interface AddLeadDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const LEAD_STATUSES = [
  "Unfollowed",
  "Follow-up Calls",
  "Working on it",
  "Proposal 1 Shared",
  "Proposal 2 Shared",
  "Proposal 3 Shared",
  "Negotiations",
  "Hot Leads",
  "Booked With Us",
];

const HOTEL_CATEGORIES = ["Basic", "3 Star", "3 Star Plus", "4 Star", "5 Star"];

const AddLeadDialog = ({ open, onClose, onSuccess }: AddLeadDialogProps) => {
  const [formData, setFormData] = useState({
    tripId: "",
    travellerName: "",
    phone: "",
    email: "",
    travelDate: "",
    travelState: "",
    nights: "",
    pax: "",
    hotelCategory: "3 Star",
    mealPlan: "CP",
    status: "Unfollowed",
    remarks: "",
  });
  const [saving, setSaving] = useState(false);
  const [showProtectionError, setShowProtectionError] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const session = authLib.getSession();
      const sheetsService = new GoogleSheetsBackendService();
      
      await sheetsService.appendLead({
        tripId: formData.tripId,
        date: new Date().toISOString().split('T')[0],
        consultant: session?.user.name || '',
        status: formData.status,
        travellerName: formData.travellerName,
        travelDate: formData.travelDate,
        travelState: formData.travelState,
        remarks: formData.remarks,
        nights: formData.nights,
        pax: formData.pax,
        hotelCategory: formData.hotelCategory,
        mealPlan: formData.mealPlan,
        phone: formData.phone,
        email: formData.email,
      });

      toast({
        title: "Lead added successfully",
        description: "The lead has been added to Google Sheets",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      // Check if it's a protection error
      if (error.message && error.message.includes('protected')) {
        setShowProtectionError(true);
      } else {
        toast({
          variant: "destructive",
          title: "Error adding lead",
          description: error.message,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Traveller Name *</Label>
              <Input
                value={formData.travellerName}
                onChange={(e) => setFormData({ ...formData, travellerName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Travel Date</Label>
              <Input
                type="date"
                value={formData.travelDate}
                onChange={(e) => setFormData({ ...formData, travelDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Travel State</Label>
              <Input
                value={formData.travelState}
                onChange={(e) => setFormData({ ...formData, travelState: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Nights</Label>
              <Input
                value={formData.nights}
                onChange={(e) => setFormData({ ...formData, nights: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Pax</Label>
              <Input
                value={formData.pax}
                onChange={(e) => setFormData({ ...formData, pax: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Meal Plan</Label>
              <Input
                value={formData.mealPlan}
                onChange={(e) => setFormData({ ...formData, mealPlan: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Hotel Category</Label>
            <Select
              value={formData.hotelCategory}
              onValueChange={(value) => setFormData({ ...formData, hotelCategory: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOTEL_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Remarks</Label>
            <Textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !formData.travellerName || !formData.phone}>
              {saving ? "Adding..." : "Add Lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
      <AddLeadErrorDialog 
        open={showProtectionError} 
        onClose={() => {
          setShowProtectionError(false);
          onClose();
        }} 
      />
    </Dialog>
  );
};

export default AddLeadDialog;
