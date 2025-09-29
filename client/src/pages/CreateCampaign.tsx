import { CampaignForm } from "@/components/CampaignForm";
import { useToast } from "@/hooks/use-toast";

export default function CreateCampaignPage() {
  const { toast } = useToast();

  const handleSubmit = (data: any) => {
    console.log('Creating campaign:', data);
    toast({
      title: "Campaign Created",
      description: "Your campaign has been created successfully with all the specified details.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-background p-6">
      <CampaignForm onSubmit={handleSubmit} />
    </div>
  );
}