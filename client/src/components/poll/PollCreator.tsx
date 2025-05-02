import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ImageIcon, HelpCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { searchImages } from "@/utils/imageSearch";
import { useLocation } from "wouter";

const pollFormSchema = z.object({
  question: z.string().min(5, "Challenge title must be at least 5 characters"),
  optionAText: z.string().min(1, "Challenger 1 title is required"),
  optionBText: z.string().min(1, "Challenger 2 title is required"),
  duration: z.string(),
  audience: z.string(),
  // For custom duration
  customHours: z.number().min(0).max(72).optional(),
  customMinutes: z.number().min(0).max(59).optional(),
});

type PollFormValues = z.infer<typeof pollFormSchema>;

export default function PollCreator() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [optionAImage, setOptionAImage] = useState<string | null>(null);
  const [optionBImage, setOptionBImage] = useState<string | null>(null);
  const [isSearchingA, setIsSearchingA] = useState(false);
  const [isSearchingB, setIsSearchingB] = useState(false);
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  
  const durations = [
    { value: "1h", label: "1 hour" },
    { value: "24h", label: "24 hours" },
    { value: "48h", label: "48 hours" },
    { value: "72h", label: "72 hours" },
    { value: "1w", label: "1 week" },
    { value: "custom", label: "Custom" },
  ];
  
  const audiences = [
    { value: "public", label: "Public" },
    { value: "private", label: "Private" },
  ];
  
  const form = useForm<PollFormValues>({
    resolver: zodResolver(pollFormSchema),
    defaultValues: {
      question: "",
      optionAText: "",
      optionBText: "",
      duration: "24h",
      audience: "public",
      customHours: 1,
      customMinutes: 0,
    },
  });
  
  const createPollMutation = useMutation({
    mutationFn: async (values: PollFormValues) => {
      // Calculate end time based on duration
      const now = new Date();
      let endTime = new Date(now);
      
      switch (values.duration) {
        case "1h":
          endTime.setHours(now.getHours() + 1);
          break;
        case "48h":
          endTime.setHours(now.getHours() + 48);
          break;
        case "72h":
          endTime.setHours(now.getHours() + 72);
          break;
        case "1w":
          endTime.setDate(now.getDate() + 7);
          break;
        case "custom":
          // Add custom hours and minutes
          const hours = values.customHours || 0;
          const minutes = values.customMinutes || 0;
          
          // Ensure at least 5 minutes total duration
          if (hours === 0 && minutes < 5) {
            throw new Error("Challenge duration must be at least 5 minutes");
          }
          
          endTime.setHours(now.getHours() + hours);
          endTime.setMinutes(now.getMinutes() + minutes);
          break;
        default: // 24h
          endTime.setHours(now.getHours() + 24);
      }
      
      const pollData = {
        userId: user?.id,
        question: values.question,
        optionAText: values.optionAText,
        optionAImage: optionAImage || undefined,
        optionBText: values.optionBText,
        optionBImage: optionBImage || undefined,
        endTime: endTime.toISOString(),
        isPublic: values.audience === "public",
      };
      
      const res = await apiRequest("POST", "/api/polls", pollData);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Challenge Created",
        description: "Your challenge has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      navigate(`/polls/${data.id}`);
      form.reset();
      setOptionAImage(null);
      setOptionBImage(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to create challenge",
        description: error.message || "An error occurred while creating the challenge",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: PollFormValues) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create a challenge",
        variant: "destructive",
      });
      return;
    }
    
    createPollMutation.mutate(values);
  };
  
  const searchImageForOption = async (option: "A" | "B") => {
    const searchText = option === "A" 
      ? form.getValues("optionAText") 
      : form.getValues("optionBText");
    
    if (!searchText) {
      toast({
        title: "Input Required",
        description: `Please enter text for Challenger ${option} first`,
        variant: "destructive",
      });
      return;
    }
    
    try {
      if (option === "A") setIsSearchingA(true);
      else setIsSearchingB(true);
      
      const images = await searchImages(searchText);
      
      if (images && images.length > 0) {
        if (option === "A") setOptionAImage(images[0].url);
        else setOptionBImage(images[0].url);
      } else {
        toast({
          title: "No Images Found",
          description: `No images found for "${searchText}"`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Image Search Failed",
        description: "Failed to search for images. Please try again.",
        variant: "destructive",
      });
    } finally {
      if (option === "A") setIsSearchingA(false);
      else setIsSearchingB(false);
    }
  };
  
  return (
    <Card className="bg-card border-primary/30">
      <CardHeader className="flex justify-between items-center pb-4">
        <CardTitle className="text-xl font-montserrat font-bold">Create a New Challenge</CardTitle>
        <Button variant="ghost" size="icon">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title of the Challenge</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Which one is better?" 
                      className="bg-black border-primary/30"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FormField
                  control={form.control}
                  name="optionAText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Challenger 1</FormLabel>
                      <div className="bg-black border border-primary/30 rounded overflow-hidden">
                        <div 
                          className="h-32 bg-black flex items-center justify-center relative"
                          onClick={() => !isSearchingA && searchImageForOption("A")}
                        >
                          {optionAImage ? (
                            <img 
                              src={optionAImage} 
                              alt="Challenger 1" 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center cursor-pointer">
                              {isSearchingA ? (
                                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                              ) : (
                                <ImageIcon className="h-6 w-6 text-primary/50" />
                              )}
                              <span className="text-xs text-muted-foreground mt-1">
                                {isSearchingA ? "Searching..." : "Click to search images"}
                              </span>
                            </div>
                          )}
                          
                          {optionAImage && (
                            <Button 
                              type="button"
                              variant="ghost" 
                              size="sm" 
                              className="absolute top-1 right-1 bg-black/50 hover:bg-black/70"
                              onClick={(e) => {
                                e.stopPropagation();
                                searchImageForOption("A");
                              }}
                            >
                              Change
                            </Button>
                          )}
                        </div>
                        <div className="p-3">
                          <FormControl>
                            <Input 
                              placeholder="Challenger 1 title"
                              className="bg-black border-0"
                              {...field}
                            />
                          </FormControl>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div>
                <FormField
                  control={form.control}
                  name="optionBText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Challenger 2</FormLabel>
                      <div className="bg-black border border-primary/30 rounded overflow-hidden">
                        <div 
                          className="h-32 bg-black flex items-center justify-center relative"
                          onClick={() => !isSearchingB && searchImageForOption("B")}
                        >
                          {optionBImage ? (
                            <img 
                              src={optionBImage} 
                              alt="Challenger 2" 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center cursor-pointer">
                              {isSearchingB ? (
                                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                              ) : (
                                <ImageIcon className="h-6 w-6 text-primary/50" />
                              )}
                              <span className="text-xs text-muted-foreground mt-1">
                                {isSearchingB ? "Searching..." : "Click to search images"}
                              </span>
                            </div>
                          )}
                          
                          {optionBImage && (
                            <Button 
                              type="button"
                              variant="ghost" 
                              size="sm" 
                              className="absolute top-1 right-1 bg-black/50 hover:bg-black/70"
                              onClick={(e) => {
                                e.stopPropagation();
                                searchImageForOption("B");
                              }}
                            >
                              Change
                            </Button>
                          )}
                        </div>
                        <div className="p-3">
                          <FormControl>
                            <Input 
                              placeholder="Challenger 2 title"
                              className="bg-black border-0"
                              {...field}
                            />
                          </FormControl>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Challenge Duration</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setShowCustomDuration(value === "custom");
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-black border-primary/30">
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {durations.map((duration) => (
                            <SelectItem key={duration.value} value={duration.value}>
                              {duration.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {showCustomDuration && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <FormField
                      control={form.control}
                      name="customHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Hours</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="72"
                              className="bg-black border-primary/30"
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              value={field.value}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="customMinutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Minutes</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="59"
                              className="bg-black border-primary/30"
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              value={field.value}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
              
              <FormField
                control={form.control}
                name="audience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Audience</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-black border-primary/30">
                          <SelectValue placeholder="Select audience" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {audiences.map((audience) => (
                          <SelectItem key={audience.value} value={audience.value}>
                            {audience.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex justify-end">
              <Button 
                type="submit" 
                className="btn-gold"
                disabled={createPollMutation.isPending}
              >
                {createPollMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <span className="mr-2">+</span>
                    Create Challenge
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
