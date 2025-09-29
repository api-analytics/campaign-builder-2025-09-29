import { useState, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { HelpCircle, X, Check, Calendar as CalendarIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Comprehensive form schema based on screenshots - exact field order
const campaignFormSchema = z.object({
  // Basic campaign info (first tab in screenshots)
  baseUrl: z.string().url("Must be a valid URL"),
  anchorTag: z.string().optional(),
  campaignType: z.string().min(1, "Campaign type is required"),
  campaignSource: z.string().min(1, "Campaign source is required"), 
  adType: z.string().min(1, "Ad type is required"),
  adTypeDetail: z.string().optional(),
  targeting: z.boolean(),
  brand1: z.string().min(1, "Brand 1 is required"),
  brand2: z.string().optional(),
  brand3: z.string().optional(),
  productCategory: z.string().min(1, "Product category is required"),
  productBrand: z.string().optional(),
  
  // Campaign management (second tab in screenshots)
  campaignOwner: z.string().min(1, "Campaign owner is required"),
  startDate: z.date({ required_error: "Start date is required" }),
  endDate: z.date().optional(),
  campaignNotes: z.string().min(1, "Campaign notes are required"),
  projectReferenceNumber: z.string().min(1, "Project reference number is required"),
  budget: z.string().optional(),
  industry: z.string().min(1, "Industry is required"),
  tactic: z.string().min(1, "Tactic is required"),
  costCenter: z.string().optional(),
  subLedger: z.string().optional(),
  partnering: z.boolean(),
  partnerName: z.string().optional(),
  thirdParty: z.boolean(),
  thirdPartyName: z.string().optional(),
}).refine((data) => {
  // Sub Ledger is required when Cost Center is selected
  if (data.costCenter && data.costCenter.trim() !== '') {
    return data.subLedger && data.subLedger.trim() !== '';
  }
  return true;
}, {
  message: "Sub Ledger is required when Cost Center is selected",
  path: ["subLedger"], // This will show the error on the subLedger field
});

type CampaignFormData = z.infer<typeof campaignFormSchema>;

interface CampaignFormProps {
  onSubmit: (data: CampaignFormData) => void;
  initialData?: Partial<CampaignFormData>;
  isLoading?: boolean;
}

// Help content for each field
const helpContent: Record<string, { title: string; content: string }> = {
  baseUrl: {
    title: "Base URL",
    content: "Enter the destination URL where users will be directed when they click on your campaign link. This should be a complete URL including https://"
  },
  anchorTag: {
    title: "Anchor Tag", 
    content: "Optional anchor tag (e.g., #section1) to direct users to a specific section of the destination page."
  },
  campaignType: {
    title: "Campaign Type",
    content: "Select the primary type of marketing campaign. This helps categorize and track different campaign strategies."
  },
  campaignSource: {
    title: "Campaign Source",
    content: "Specify the source of your campaign traffic (e.g., Google, Facebook, Email Newsletter, etc.)"
  },
  adType: {
    title: "Ad Type",
    content: "Select the format or type of advertisement being used in this campaign (e.g., Banner, Video, Text, etc.)"
  },
  targeting: {
    title: "Targeting",
    content: "Indicates whether this campaign uses audience targeting. Select 'Yes' if you're targeting specific demographics, interests, or behaviors."
  },
  brand1: {
    title: "Primary Brand",
    content: "Select the main brand associated with this campaign. This is a required field for tracking brand performance."
  },
  productCategory: {
    title: "Product Category", 
    content: "Select the category that best describes the products or services being promoted in this campaign."
  },
  campaignOwner: {
    title: "Campaign Owner",
    content: "Select or enter the name of the person responsible for managing this campaign."
  },
  startDate: {
    title: "Start Date",
    content: "Select the date when this campaign will begin running. This is required for scheduling and reporting purposes."
  },
  campaignNotes: {
    title: "Campaign Notes",
    content: "Enter notes that will be displayed in Adobe Analytics. Use this field to provide context or special instructions for reporting."
  },
  projectReferenceNumber: {
    title: "Project Reference Number",
    content: "Enter the Workfront Project ID (7 digits). This links the campaign to your project management system for tracking and billing."
  },
  industry: {
    title: "Industry",
    content: "Select the industry or market segment this campaign is targeting. This helps with campaign categorization and analysis."
  },
  tactic: {
    title: "Tactic",
    content: "Select the marketing tactic or strategy being employed (e.g., Awareness, Consideration, Conversion, etc.)"
  },
  partnering: {
    title: "Partnering",
    content: "Select 'Yes' if this campaign involves a business partnership or co-marketing effort with another company. If yes, you'll need to specify the partner name."
  }
};

export function CampaignForm({ onSubmit, initialData, isLoading = false }: CampaignFormProps) {
  const [activeHelp, setActiveHelp] = useState<string | null>(null);
  const [completedFields, setCompletedFields] = useState<Set<string>>(new Set());
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showThirdPartyModal, setShowThirdPartyModal] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState("");
  const [newThirdPartyName, setNewThirdPartyName] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Query for partners
  const { data: partners = [], isLoading: partnersLoading, error: partnersError } = useQuery<{id: string, name: string}[]>({
    queryKey: ['/api/partners'],
    enabled: true,
  });
  
  // Query for third parties
  const { data: thirdParties = [], isLoading: thirdPartiesLoading, error: thirdPartiesError } = useQuery<{id: string, name: string}[]>({
    queryKey: ['/api/third-parties'],
    enabled: true,
  });
  
  // Mutation for adding new partner
  const addPartnerMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest('POST', '/api/partners', { name });
      return response.json();
    },
    onSuccess: (newPartner: any) => {
      // Optimistically update the cache first
      queryClient.setQueryData(['/api/partners'], (oldData: any[] = []) => [
        ...oldData,
        newPartner
      ]);
      
      // Then invalidate to refresh from server
      queryClient.invalidateQueries({ queryKey: ['/api/partners'] });
      
      // Use a small delay to ensure the component has re-rendered with the new option
      setTimeout(() => {
        form.setValue('partnerName', newPartner.name, { shouldDirty: true });
      }, 50);
      
      setShowPartnerModal(false);
      setNewPartnerName("");
      toast({
        title: "Partner added",
        description: `${newPartner.name} has been added to the partner list.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add partner",
        variant: "destructive",
      });
    },
  });
  
  // Mutation for adding new third party
  const addThirdPartyMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest('POST', '/api/third-parties', { name });
      return response.json();
    },
    onSuccess: (newThirdParty: any) => {
      // Optimistically update the cache first
      queryClient.setQueryData(['/api/third-parties'], (oldData: any[] = []) => [
        ...oldData,
        newThirdParty
      ]);
      
      // Then invalidate to refresh from server
      queryClient.invalidateQueries({ queryKey: ['/api/third-parties'] });
      
      // Use a small delay to ensure the component has re-rendered with the new option
      setTimeout(() => {
        form.setValue('thirdPartyName', newThirdParty.name, { shouldDirty: true });
      }, 50);
      
      setShowThirdPartyModal(false);
      setNewThirdPartyName("");
      toast({
        title: "Third party added",
        description: `${newThirdParty.name} has been added to the third party list.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add third party",
        variant: "destructive",
      });
    },
  });

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      baseUrl: initialData?.baseUrl || "",
      anchorTag: initialData?.anchorTag || "",
      campaignType: initialData?.campaignType || "",
      campaignSource: initialData?.campaignSource || "",
      adType: initialData?.adType || "",
      adTypeDetail: initialData?.adTypeDetail || "",
      targeting: initialData?.targeting || false,
      brand1: initialData?.brand1 || "",
      brand2: initialData?.brand2 || "",
      brand3: initialData?.brand3 || "",
      productCategory: initialData?.productCategory || "",
      productBrand: initialData?.productBrand || "",
      campaignOwner: initialData?.campaignOwner || "",
      startDate: initialData?.startDate,
      endDate: initialData?.endDate,
      campaignNotes: initialData?.campaignNotes || "",
      projectReferenceNumber: initialData?.projectReferenceNumber || "",
      budget: initialData?.budget || "",
      industry: initialData?.industry || "",
      tactic: initialData?.tactic || "",
      costCenter: initialData?.costCenter || "",
      subLedger: initialData?.subLedger || "",
      partnering: initialData?.partnering || false,
      partnerName: initialData?.partnerName || "",
      thirdParty: initialData?.thirdParty || false,
      thirdPartyName: initialData?.thirdPartyName || "",
    },
  });

  // Watch form values to track completion
  const formValues = form.watch();
  
  useEffect(() => {
    const newCompletedFields = new Set<string>();
    Object.entries(formValues).forEach(([key, value]) => {
      if (value !== "" && value !== undefined && value !== null) {
        newCompletedFields.add(key);
      }
    });
    setCompletedFields(newCompletedFields);
  }, [formValues]);

  const handleSubmit = (data: CampaignFormData) => {
    console.log('Campaign form submitted:', data);
    onSubmit(data);
  };
  
  // Handle adding new partner
  const handleAddPartner = () => {
    if (!newPartnerName.trim()) {
      toast({
        title: "Error",
        description: "Partner name is required",
        variant: "destructive",
      });
      return;
    }
    addPartnerMutation.mutate(newPartnerName.trim());
  };
  
  // Handle adding new third party
  const handleAddThirdParty = () => {
    if (!newThirdPartyName.trim()) {
      toast({
        title: "Error", 
        description: "Third party name is required",
        variant: "destructive",
      });
      return;
    }
    addThirdPartyMutation.mutate(newThirdPartyName.trim());
  };

  const isFieldRequired = (fieldName: string): boolean => {
    const baseRequiredFields = [
      'baseUrl', 'campaignType', 'campaignSource', 'adType', 
      'brand1', 'productCategory', 'campaignOwner', 'startDate',
      'campaignNotes', 'projectReferenceNumber', 'industry', 'tactic'
    ];
    
    // Check if it's a base required field
    if (baseRequiredFields.includes(fieldName)) {
      return true;
    }
    
    // Sub Ledger becomes required when Cost Center is selected
    if (fieldName === 'subLedger') {
      const costCenter = form.watch('costCenter');
      return !!costCenter;
    }
    
    return false;
  };

  const getFieldStatus = (fieldName: string) => {
    const hasError = !!form.formState.errors[fieldName as keyof CampaignFormData];
    const isCompleted = completedFields.has(fieldName);
    const isRequired = isFieldRequired(fieldName);
    
    if (hasError) return 'error';
    if (isRequired && !isCompleted) return 'required';
    if (isCompleted) return 'completed';
    return 'default';
  };

  const getFieldClassName = (fieldName: string) => {
    const status = getFieldStatus(fieldName);
    const baseClass = "transition-all duration-200";
    
    switch (status) {
      case 'error':
        return `${baseClass} border-destructive bg-destructive/5`;
      case 'required':
        return `${baseClass} border-pink-300 bg-pink-50 dark:bg-pink-950/20 dark:border-pink-800`;
      case 'completed':
        return `${baseClass} border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-800`;
      default:
        return baseClass;
    }
  };

  // Hierarchical data for dependent dropdowns
  const hierarchicalData = {
    // Campaign Type → Campaign Source → Ad Type → Ad Type Detail chain
    campaignHierarchy: {
      "Display Ads": {
        sources: ["Google", "Facebook", "LinkedIn"],
        adTypes: {
          "Google": ["Banner", "Video"],
          "Facebook": ["Image", "Video", "Carousel"],
          "LinkedIn": ["Banner", "Text"]
        },
        adTypeDetails: {
          "Banner": ["Standard Banner", "Rich Media"],
          "Video": ["Interstitial", "Native"],
          "Image": ["Standard Banner", "Native"],
          "Carousel": ["Rich Media", "Native"],
          "Text": ["Standard Banner"]
        }
      },
      "Email Campaign": {
        sources: ["Email Newsletter", "Organic Social"],
        adTypes: {
          "Email Newsletter": ["Text", "Image"],
          "Organic Social": ["Text", "Image", "Video"]
        },
        adTypeDetails: {
          "Text": ["Standard Banner"],
          "Image": ["Standard Banner", "Rich Media"],
          "Video": ["Native", "Interstitial"]
        }
      },
      "Google Ads": {
        sources: ["Google", "Paid Social"],
        adTypes: {
          "Google": ["Banner", "Video", "Text"],
          "Paid Social": ["Image", "Video", "Carousel"]
        },
        adTypeDetails: {
          "Banner": ["Standard Banner", "Rich Media", "Expandable"],
          "Video": ["Interstitial", "Native"],
          "Text": ["Standard Banner"],
          "Image": ["Standard Banner", "Rich Media"],
          "Carousel": ["Rich Media", "Native"]
        }
      },
      "Social Media": {
        sources: ["Facebook", "LinkedIn", "Organic Social", "Paid Social"],
        adTypes: {
          "Facebook": ["Image", "Video", "Carousel", "Story"],
          "LinkedIn": ["Banner", "Text", "Image"],
          "Organic Social": ["Text", "Image", "Video"],
          "Paid Social": ["Image", "Video", "Carousel"]
        },
        adTypeDetails: {
          "Image": ["Standard Banner", "Rich Media", "Native"],
          "Video": ["Interstitial", "Native"],
          "Carousel": ["Rich Media", "Native"],
          "Story": ["Native"],
          "Banner": ["Standard Banner", "Rich Media"],
          "Text": ["Standard Banner"]
        }
      },
      "Video Campaign": {
        sources: ["Google", "Facebook", "Paid Social"],
        adTypes: {
          "Google": ["Video"],
          "Facebook": ["Video", "Story"],
          "Paid Social": ["Video", "Carousel"]
        },
        adTypeDetails: {
          "Video": ["Interstitial", "Native", "Rich Media"],
          "Story": ["Native"],
          "Carousel": ["Rich Media", "Native"]
        }
      }
    },
    
    // Cost Center → Sub Ledger dependency
    costCenterSubLedgers: {
      "Engineering": ["Engineering Projects", "Engineering Operations", "Engineering R&D"],
      "Marketing": ["Marketing Campaigns", "Marketing Events", "Marketing Content"],
      "Operations": ["Operations Support", "Operations Infrastructure", "Operations Maintenance"],
      "Product": ["Product Development", "Product Support", "Product Research"],
      "Sales": ["Sales Activities", "Sales Support", "Sales Training"]
    }
  };

  // Base data for dropdowns
  const mockData = {
    campaignTypes: Object.keys(hierarchicalData.campaignHierarchy).sort(),
    brands: ["Brand A", "Brand B", "Brand C", "Brand D"].sort(),
    productCategories: ["Consulting", "Electronics", "Hardware", "Services", "Software"].sort(),
    productBrands: ["Product Brand 1", "Product Brand 2", "Product Brand 3"].sort(),
    campaignOwners: ["Campaign Manager", "Daniel Konig", "Marketing Manager"].sort(),
    industries: ["Finance", "Healthcare", "Manufacturing", "Retail", "Technology"].sort(),
    tactics: ["Acquisition", "Awareness", "Consideration", "Conversion", "Retention"].sort(),
    costCenters: Object.keys(hierarchicalData.costCenterSubLedgers).sort(),
  };

  // Watch form values to prevent infinite loops in filter functions
  const campaignType = form.watch("campaignType");
  const campaignSource = form.watch("campaignSource");
  const adType = form.watch("adType");
  const costCenter = form.watch("costCenter");

  // Dynamic dropdown data based on selections using useMemo
  const filteredCampaignSources = useMemo((): string[] => {
    if (!campaignType || !(campaignType in hierarchicalData.campaignHierarchy)) {
      return [];
    }
    const sources = hierarchicalData.campaignHierarchy[campaignType as keyof typeof hierarchicalData.campaignHierarchy].sources;
    return [...sources].sort();
  }, [campaignType]);

  const filteredAdTypes = useMemo((): string[] => {
    if (!campaignType || !campaignSource || !(campaignType in hierarchicalData.campaignHierarchy)) {
      return [];
    }
    const typeData = hierarchicalData.campaignHierarchy[campaignType as keyof typeof hierarchicalData.campaignHierarchy];
    if (!(campaignSource in typeData.adTypes)) {
      return [];
    }
    const adTypes = typeData.adTypes[campaignSource as keyof typeof typeData.adTypes];
    return [...adTypes].sort();
  }, [campaignType, campaignSource]);

  const filteredAdTypeDetails = useMemo((): string[] => {
    if (!campaignType || !adType || !(campaignType in hierarchicalData.campaignHierarchy)) {
      return [];
    }
    const typeData = hierarchicalData.campaignHierarchy[campaignType as keyof typeof hierarchicalData.campaignHierarchy];
    if (!(adType in typeData.adTypeDetails)) {
      return [];
    }
    const details = typeData.adTypeDetails[adType as keyof typeof typeData.adTypeDetails];
    return [...details].sort();
  }, [campaignType, adType]);

  const filteredSubLedgers = useMemo((): string[] => {
    if (!costCenter || !(costCenter in hierarchicalData.costCenterSubLedgers)) {
      return [];
    }
    const subLedgers = hierarchicalData.costCenterSubLedgers[costCenter as keyof typeof hierarchicalData.costCenterSubLedgers];
    return [...subLedgers].sort();
  }, [costCenter]);

  // Clear dependent fields when parent fields change - using separate effects to prevent infinite loops
  const prevCampaignType = useRef<string | null>(null);
  const prevCampaignSource = useRef<string | null>(null);
  const prevAdType = useRef<string | null>(null);
  const prevCostCenter = useRef<string | null>(null);

  useEffect(() => {
    // Skip clearing on first mount (when prev is null), only clear on actual changes
    if (prevCampaignType.current !== null && prevCampaignType.current !== campaignType) {
      form.setValue('campaignSource', '');
      form.setValue('adType', '');
      form.setValue('adTypeDetail', '');
    }
    prevCampaignType.current = campaignType;
  }, [campaignType, form]);

  useEffect(() => {
    // Skip clearing on first mount (when prev is null), only clear on actual changes
    if (prevCampaignSource.current !== null && prevCampaignSource.current !== campaignSource) {
      form.setValue('adType', '');
      form.setValue('adTypeDetail', '');
    }
    prevCampaignSource.current = campaignSource;
  }, [campaignSource, form]);

  useEffect(() => {
    // Skip clearing on first mount (when prev is null), only clear on actual changes
    if (prevAdType.current !== null && prevAdType.current !== adType) {
      form.setValue('adTypeDetail', '');
    }
    prevAdType.current = adType;
  }, [adType, form]);

  useEffect(() => {
    // Skip clearing on first mount (when prev is null), only clear on actual changes
    if (prevCostCenter.current !== null && prevCostCenter.current !== (costCenter || null)) {
      form.setValue('subLedger', '');
    }
    prevCostCenter.current = costCenter || null;
  }, [costCenter, form]);

  return (
    <div className="flex gap-6 max-w-7xl mx-auto">
      {/* Main Form */}
      <div className="flex-1">
        <Card className="shadow-card bg-gradient-card border-0">
          <CardHeader>
            <CardTitle className="text-2xl">Campaign Builder</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
              
              {/* Campaign Details - First Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Campaign Details</h3>
                
                {/* Row 1: Campaign Owner (wider), Start Date & End Date (smaller) */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                  <div className="lg:col-span-3 space-y-2">
                    <div className="flex items-center gap-2 h-5">
                      <Label className="flex items-center gap-1">
                        Campaign Owner
                        {isFieldRequired('campaignOwner') && <span className="text-pink-500">*</span>}
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => setActiveHelp('campaignOwner')}
                        data-testid="help-campaignOwner"
                      >
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                    <Select
                      value={form.watch("campaignOwner")}
                      onValueChange={(value) => form.setValue("campaignOwner", value)}
                    >
                      <SelectTrigger className={getFieldClassName('campaignOwner')} data-testid="select-campaignOwner">
                        <SelectValue placeholder="Select campaign owner" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockData.campaignOwners.map((owner) => (
                          <SelectItem key={owner} value={owner}>{owner}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.campaignOwner && (
                      <p className="text-sm text-destructive">{form.formState.errors.campaignOwner.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 h-5">
                      <Label className="flex items-center gap-1">
                        Start Date
                        {isFieldRequired('startDate') && <span className="text-pink-500">*</span>}
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => setActiveHelp('startDate')}
                        data-testid="help-startDate"
                      >
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !form.watch("startDate") && "text-muted-foreground",
                            getFieldClassName('startDate')
                          )}
                          data-testid="button-startDate"
                        >
                          <CalendarIcon className="mr-1 h-3 w-3" />
                          {form.watch("startDate") ? format(form.watch("startDate")!, "M/d/yy") : "9/24/25"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={form.watch("startDate")}
                          onSelect={(date) => form.setValue("startDate", date!)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {form.formState.errors.startDate && (
                      <p className="text-sm text-destructive">{form.formState.errors.startDate.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="h-5 flex items-center">
                      <Label>End Date</Label>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !form.watch("endDate") && "text-muted-foreground",
                            getFieldClassName('endDate')
                          )}
                          data-testid="button-endDate"
                        >
                          <CalendarIcon className="mr-1 h-3 w-3" />
                          {form.watch("endDate") ? format(form.watch("endDate")!, "M/d/yy") : "No End"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={form.watch("endDate")}
                          onSelect={(date) => form.setValue("endDate", date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Row 2: Campaign Notes (full width) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 h-5">
                    <Label className="flex items-center gap-1">
                      Campaign Notes
                      {isFieldRequired('campaignNotes') && <span className="text-pink-500">*</span>}
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0"
                      onClick={() => setActiveHelp('campaignNotes')}
                      data-testid="help-campaignNotes"
                    >
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                  <Textarea
                    {...form.register("campaignNotes")}
                    className={getFieldClassName('campaignNotes')}
                    placeholder="Add notes to be displayed in Adobe Analytics"
                    rows={2}
                    data-testid="input-campaignNotes"
                  />
                  {form.formState.errors.campaignNotes && (
                    <p className="text-sm text-destructive">{form.formState.errors.campaignNotes.message}</p>
                  )}
                </div>

                {/* Row 3: Project Reference & Budget */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 h-5">
                      <Label className="flex items-center gap-1">
                        Project Reference Number
                        {isFieldRequired('projectReferenceNumber') && <span className="text-pink-500">*</span>}
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => setActiveHelp('projectReferenceNumber')}
                        data-testid="help-projectReferenceNumber"
                      >
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                    <Input
                      {...form.register("projectReferenceNumber")}
                      className={getFieldClassName('projectReferenceNumber')}
                      placeholder="Workfront Project ID (7 digits)"
                      data-testid="input-projectReferenceNumber"
                    />
                    {form.formState.errors.projectReferenceNumber && (
                      <p className="text-sm text-destructive">{form.formState.errors.projectReferenceNumber.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="h-5 flex items-center">
                      <Label>Budget</Label>
                    </div>
                    <Input
                      {...form.register("budget")}
                      className={getFieldClassName('budget')}
                      placeholder="Enter budget amount"
                      data-testid="input-budget"
                    />
                  </div>
                </div>

                {/* Row 4: Industry & Tactic & Cost Center & Sub Ledger (smaller dropdowns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 h-5">
                      <Label className="flex items-center gap-1">
                        Industry
                        {isFieldRequired('industry') && <span className="text-pink-500">*</span>}
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => setActiveHelp('industry')}
                        data-testid="help-industry"
                      >
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                    <Select
                      value={form.watch("industry")}
                      onValueChange={(value) => form.setValue("industry", value)}
                    >
                      <SelectTrigger className={getFieldClassName('industry')} data-testid="select-industry">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockData.industries.map((industry) => (
                          <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.industry && (
                      <p className="text-sm text-destructive">{form.formState.errors.industry.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 h-5">
                      <Label className="flex items-center gap-1">
                        Tactic
                        {isFieldRequired('tactic') && <span className="text-pink-500">*</span>}
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => setActiveHelp('tactic')}
                        data-testid="help-tactic"
                      >
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                    <Select
                      value={form.watch("tactic")}
                      onValueChange={(value) => form.setValue("tactic", value)}
                    >
                      <SelectTrigger className={getFieldClassName('tactic')} data-testid="select-tactic">
                        <SelectValue placeholder="Select tactic" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockData.tactics.map((tactic) => (
                          <SelectItem key={tactic} value={tactic}>{tactic}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.tactic && (
                      <p className="text-sm text-destructive">{form.formState.errors.tactic.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="h-5 flex items-center">
                      <Label>Cost Center</Label>
                    </div>
                    <Select
                      value={form.watch("costCenter")}
                      onValueChange={(value) => form.setValue("costCenter", value)}
                    >
                      <SelectTrigger className={getFieldClassName('costCenter')} data-testid="select-costCenter">
                        <SelectValue placeholder="Select cost center" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockData.costCenters.map((center) => (
                          <SelectItem key={center} value={center}>{center}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="h-5 flex items-center">
                      <Label className="flex items-center gap-1">
                        Sub Ledger
                        {isFieldRequired('subLedger') && <span className="text-pink-500">*</span>}
                      </Label>
                    </div>
                    <Select
                      value={form.watch("subLedger")}
                      onValueChange={(value) => form.setValue("subLedger", value)}
                    >
                      <SelectTrigger className={getFieldClassName('subLedger')} data-testid="select-subLedger">
                        <SelectValue placeholder="Select sub ledger" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSubLedgers.map((ledger) => (
                          <SelectItem key={ledger} value={ledger}>{ledger}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 5: Partnering & 3rd Party (compact radio buttons) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 h-5">
                      <div className="flex items-center gap-2">
                        <Label className="flex items-center gap-1">
                          Partnering
                          {isFieldRequired('partnering') && <span className="text-pink-500">*</span>}
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0"
                          onClick={() => setActiveHelp('partnering')}
                          data-testid="help-partnering"
                        >
                          <HelpCircle className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                      <RadioGroup
                        value={form.watch("partnering") ? "yes" : "no"}
                        onValueChange={(value) => form.setValue("partnering", value === "yes")}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="partnering-yes" />
                          <Label htmlFor="partnering-yes">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="partnering-no" />
                          <Label htmlFor="partnering-no">No</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    {form.watch("partnering") && (
                      <div className="space-y-2">
                        <div className="h-5 flex items-center justify-between">
                          <Label>Partner Name</Label>
                          <Dialog open={showPartnerModal} onOpenChange={setShowPartnerModal}>
                            <DialogTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 text-blue-600 hover:text-blue-800"
                                disabled={addPartnerMutation.isPending}
                                data-testid="button-add-partner"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add New Partner
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Add New Partner</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="new-partner-name">Partner Name</Label>
                                  <Input
                                    id="new-partner-name"
                                    value={newPartnerName}
                                    onChange={(e) => setNewPartnerName(e.target.value)}
                                    placeholder="Enter partner name"
                                    data-testid="input-new-partner-name"
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                      setShowPartnerModal(false);
                                      setNewPartnerName("");
                                    }}
                                    data-testid="button-cancel-partner"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    type="button"
                                    onClick={handleAddPartner}
                                    disabled={addPartnerMutation.isPending}
                                    data-testid="button-save-partner"
                                  >
                                    {addPartnerMutation.isPending ? "Adding..." : "Add Partner"}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <Select
                          key={`partner-${partners.length}`}
                          value={form.watch("partnerName") || ""}
                          onValueChange={(value) => form.setValue("partnerName", value)}
                          disabled={partnersLoading}
                        >
                          <SelectTrigger 
                            className={getFieldClassName('partnerName')}
                            data-testid="select-partnerName"
                          >
                            <SelectValue placeholder={
                              partnersLoading ? "Loading partners..." : 
                              partnersError ? "Error loading partners" :
                              partners.length === 0 ? "No partners available" :
                              "Select a partner"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {partners
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map((partner) => (
                                <SelectItem key={partner.id} value={partner.name}>
                                  {partner.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-4 h-5">
                      <Label className="flex items-center gap-1">
                        3rd Party
                        {isFieldRequired('thirdParty') && <span className="text-pink-500">*</span>}
                      </Label>
                      <RadioGroup
                        value={form.watch("thirdParty") ? "yes" : "no"}
                        onValueChange={(value) => form.setValue("thirdParty", value === "yes")}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="thirdParty-yes" />
                          <Label htmlFor="thirdParty-yes">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="thirdParty-no" />
                          <Label htmlFor="thirdParty-no">No</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    {form.watch("thirdParty") && (
                      <div className="space-y-2">
                        <div className="h-5 flex items-center justify-between">
                          <Label>3rd Party Name</Label>
                          <Dialog open={showThirdPartyModal} onOpenChange={setShowThirdPartyModal}>
                            <DialogTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 text-blue-600 hover:text-blue-800"
                                disabled={addThirdPartyMutation.isPending}
                                data-testid="button-add-third-party"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add New 3rd Party
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Add New 3rd Party</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="new-third-party-name">3rd Party Name</Label>
                                  <Input
                                    id="new-third-party-name"
                                    value={newThirdPartyName}
                                    onChange={(e) => setNewThirdPartyName(e.target.value)}
                                    placeholder="Enter 3rd party name"
                                    data-testid="input-new-third-party-name"
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                      setShowThirdPartyModal(false);
                                      setNewThirdPartyName("");
                                    }}
                                    data-testid="button-cancel-third-party"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    type="button"
                                    onClick={handleAddThirdParty}
                                    disabled={addThirdPartyMutation.isPending}
                                    data-testid="button-save-third-party"
                                  >
                                    {addThirdPartyMutation.isPending ? "Adding..." : "Add 3rd Party"}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <Select
                          key={`thirdParty-${thirdParties.length}`}
                          value={form.watch("thirdPartyName") || ""}
                          onValueChange={(value) => form.setValue("thirdPartyName", value)}
                          disabled={thirdPartiesLoading}
                        >
                          <SelectTrigger 
                            className={getFieldClassName('thirdPartyName')}
                            data-testid="select-thirdPartyName"
                          >
                            <SelectValue placeholder={
                              thirdPartiesLoading ? "Loading 3rd parties..." : 
                              thirdPartiesError ? "Error loading 3rd parties" :
                              thirdParties.length === 0 ? "No 3rd parties available" :
                              "Choose a 3rd party"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {thirdParties
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map((thirdParty) => (
                                <SelectItem key={thirdParty.id} value={thirdParty.name}>
                                  {thirdParty.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Placement Details - Second Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Placement Details</h3>
                
                {/* Row 1: Base URL (wider) & Anchor Tag (smaller) */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                  <div className="lg:col-span-3 space-y-2">
                    <div className="flex items-center gap-2 h-5">
                      <Label htmlFor="baseUrl" className="flex items-center gap-1">
                        Base URL
                        {isFieldRequired('baseUrl') && <span className="text-pink-500">*</span>}
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => setActiveHelp('baseUrl')}
                        data-testid="help-baseUrl"
                      >
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                    <Input
                      id="baseUrl"
                      {...form.register("baseUrl")}
                      className={getFieldClassName('baseUrl')}
                      placeholder="https://example.com/page"
                      data-testid="input-baseUrl"
                    />
                    {form.formState.errors.baseUrl && (
                      <p className="text-sm text-destructive">{form.formState.errors.baseUrl.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 h-5">
                      <Label htmlFor="anchorTag">Anchor Tag</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => setActiveHelp('anchorTag')}
                        data-testid="help-anchorTag"
                      >
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                    <Input
                      id="anchorTag"
                      {...form.register("anchorTag")}
                      className={getFieldClassName('anchorTag')}
                      placeholder="Optional anchor tag"
                      data-testid="input-anchorTag"
                    />
                  </div>
                </div>

                {/* Row 2: Campaign Type, Campaign Source, Ad Type, Ad Type Detail (4 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 h-5">
                      <Label className="flex items-center gap-1">
                        Campaign Type
                        {isFieldRequired('campaignType') && <span className="text-pink-500">*</span>}
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => setActiveHelp('campaignType')}
                        data-testid="help-campaignType"
                      >
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                    <Select
                      value={form.watch("campaignType")}
                      onValueChange={(value) => form.setValue("campaignType", value)}
                    >
                      <SelectTrigger className={getFieldClassName('campaignType')} data-testid="select-campaignType">
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockData.campaignTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.campaignType && (
                      <p className="text-sm text-destructive">{form.formState.errors.campaignType.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 h-5">
                      <Label className="flex items-center gap-1">
                        Campaign Source
                        {isFieldRequired('campaignSource') && <span className="text-pink-500">*</span>}
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => setActiveHelp('campaignSource')}
                        data-testid="help-campaignSource"
                      >
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                    <Select
                      value={form.watch("campaignSource")}
                      onValueChange={(value) => form.setValue("campaignSource", value)}
                    >
                      <SelectTrigger className={getFieldClassName('campaignSource')} data-testid="select-campaignSource">
                        <SelectValue placeholder="Select Source" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCampaignSources.map((source) => (
                          <SelectItem key={source} value={source}>{source}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.campaignSource && (
                      <p className="text-sm text-destructive">{form.formState.errors.campaignSource.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 h-5">
                      <Label className="flex items-center gap-1">
                        Ad Type
                        {isFieldRequired('adType') && <span className="text-pink-500">*</span>}
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => setActiveHelp('adType')}
                        data-testid="help-adType"
                      >
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                    <Select
                      value={form.watch("adType")}
                      onValueChange={(value) => form.setValue("adType", value)}
                    >
                      <SelectTrigger className={getFieldClassName('adType')} data-testid="select-adType">
                        <SelectValue placeholder="Select Ad Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredAdTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.adType && (
                      <p className="text-sm text-destructive">{form.formState.errors.adType.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="h-5 flex items-center">
                      <Label>Ad Type Detail</Label>
                    </div>
                    <Select
                      value={form.watch("adTypeDetail")}
                      onValueChange={(value) => form.setValue("adTypeDetail", value)}
                    >
                      <SelectTrigger className={getFieldClassName('adTypeDetail')} data-testid="select-adTypeDetail">
                        <SelectValue placeholder="Select Detail" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredAdTypeDetails.map((detail) => (
                          <SelectItem key={detail} value={detail}>{detail}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 3: Targeting (compact radio) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-4 h-5">
                    <div className="flex items-center gap-2">
                      <Label className="flex items-center gap-1">
                        Targeting
                        {isFieldRequired('targeting') && <span className="text-pink-500">*</span>}
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => setActiveHelp('targeting')}
                        data-testid="help-targeting"
                      >
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                    <RadioGroup
                      value={form.watch("targeting") ? "yes" : "no"}
                      onValueChange={(value) => form.setValue("targeting", value === "yes")}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="targeting-yes" />
                        <Label htmlFor="targeting-yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="targeting-no" />
                        <Label htmlFor="targeting-no">No</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                {/* Row 4: Brand 1, Brand 2, Brand 3, Product Category, Product Brand (5 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 h-5">
                      <Label className="flex items-center gap-1">
                        Brand 1
                        {isFieldRequired('brand1') && <span className="text-pink-500">*</span>}
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => setActiveHelp('brand1')}
                        data-testid="help-brand1"
                      >
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                    <Select
                      value={form.watch("brand1")}
                      onValueChange={(value) => form.setValue("brand1", value)}
                    >
                      <SelectTrigger className={getFieldClassName('brand1')} data-testid="select-brand1">
                        <SelectValue placeholder="Find Items" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockData.brands.map((brand) => (
                          <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.brand1 && (
                      <p className="text-sm text-destructive">{form.formState.errors.brand1.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="h-5 flex items-center">
                      <Label>Brand 2</Label>
                    </div>
                    <Select
                      value={form.watch("brand2")}
                      onValueChange={(value) => form.setValue("brand2", value)}
                    >
                      <SelectTrigger className={getFieldClassName('brand2')} data-testid="select-brand2">
                        <SelectValue placeholder="Find Items" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockData.brands.map((brand) => (
                          <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="h-5 flex items-center">
                      <Label>Brand 3</Label>
                    </div>
                    <Select
                      value={form.watch("brand3")}
                      onValueChange={(value) => form.setValue("brand3", value)}
                    >
                      <SelectTrigger className={getFieldClassName('brand3')} data-testid="select-brand3">
                        <SelectValue placeholder="Find Items" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockData.brands.map((brand) => (
                          <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 h-5">
                      <Label className="flex items-center gap-1">
                        Product Category
                        {isFieldRequired('productCategory') && <span className="text-pink-500">*</span>}
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => setActiveHelp('productCategory')}
                        data-testid="help-productCategory"
                      >
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                    <Select
                      value={form.watch("productCategory")}
                      onValueChange={(value) => form.setValue("productCategory", value)}
                    >
                      <SelectTrigger className={getFieldClassName('productCategory')} data-testid="select-productCategory">
                        <SelectValue placeholder="Find Items" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockData.productCategories.map((category) => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.productCategory && (
                      <p className="text-sm text-destructive">{form.formState.errors.productCategory.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="h-5 flex items-center">
                      <Label>Product Brand</Label>
                    </div>
                    <Select
                      value={form.watch("productBrand")}
                      onValueChange={(value) => form.setValue("productBrand", value)}
                    >
                      <SelectTrigger className={getFieldClassName('productBrand')} data-testid="select-productBrand">
                        <SelectValue placeholder="Find Items" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockData.productBrands.map((brand) => (
                          <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>


              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="flex-1 bg-gradient-primary shadow-glow hover:shadow-xl transition-all duration-300"
                  data-testid="button-submit"
                >
                  {isLoading ? "Creating Campaign..." : "Create Campaign"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  className="flex-1"
                  data-testid="button-preview"
                >
                  Preview Campaign
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Sliding Help Panel */}
      {activeHelp && (
        <div className="fixed inset-y-0 right-0 w-96 bg-background border-l border-border shadow-xl z-50 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Field Help</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveHelp(null)}
                data-testid="button-close-help"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {helpContent[activeHelp] && (
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">{helpContent[activeHelp].title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {helpContent[activeHelp].content}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay when help panel is open */}
      {activeHelp && (
        <div 
          className="fixed inset-0 bg-black/20 z-40" 
          onClick={() => setActiveHelp(null)}
        />
      )}
    </div>
  );
}