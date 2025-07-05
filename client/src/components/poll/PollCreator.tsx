import { useState, useEffect, useRef } from "react";
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
import { Loader2, ImageIcon, HelpCircle, Upload, Camera } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { searchImages, getFallbackImage, compressImageDataUrl } from "@/utils/imageSearch";
import { useLocation } from "wouter";

const pollFormSchema = z.object({
  question: z.string().min(5, "Challenge title must be at least 5 characters"),
  optionAText: z.string().min(1, "Challenger 1 title is required"),
  optionBText: z.string().min(1, "Challenger 2 title is required"),
  duration: z.string(),
  audience: z.string(),
  // For custom duration - support both string and number input types
  customHours: z.coerce.number().min(0).max(72).optional(),
  customMinutes: z.coerce.number().min(0).max(59).optional(),
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
  const [typingTimeoutA, setTypingTimeoutA] = useState<NodeJS.Timeout | null>(null);
  const [typingTimeoutB, setTypingTimeoutB] = useState<NodeJS.Timeout | null>(null);
  
  // Refs for file inputs
  const fileInputA = useRef<HTMLInputElement>(null);
  const fileInputB = useRef<HTMLInputElement>(null);
  
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
      // Calculate end time based on duration using milliseconds for precision
      const now = new Date();
      let endTimeMs = now.getTime(); // Base timestamp in milliseconds
      
      console.log("Current time:", now.toISOString());
      
      switch (values.duration) {
        case "1h":
          endTimeMs += 1 * 60 * 60 * 1000; // 1 hour in ms
          break;
        case "3h":
          endTimeMs += 3 * 60 * 60 * 1000; // 3 hours in ms
          break;
        case "6h":
          endTimeMs += 6 * 60 * 60 * 1000; // 6 hours in ms
          break;
        case "12h":
          endTimeMs += 12 * 60 * 60 * 1000; // 12 hours in ms
          break;
        case "48h":
          endTimeMs += 48 * 60 * 60 * 1000; // 48 hours in ms
          break;
        case "72h":
          endTimeMs += 72 * 60 * 60 * 1000; // 72 hours in ms
          break;
        case "1w":
          endTimeMs += 7 * 24 * 60 * 60 * 1000; // 7 days in ms
          break;
        case "custom":
          // Add custom hours and minutes
          const hours = values.customHours || 0;
          const minutes = values.customMinutes || 0;
          
          // Ensure at least 5 minutes total duration
          if ((hours === 0 && minutes < 5) || (hours === 0 && minutes === 0)) {
            throw new Error("Challenge duration must be at least 5 minutes");
          }
          
          // Convert hours and minutes to milliseconds and add to current time
          const hoursMs = hours * 60 * 60 * 1000;
          const minutesMs = minutes * 60 * 1000;
          endTimeMs += hoursMs + minutesMs;
          break;
        default: // 24h
          endTimeMs += 24 * 60 * 60 * 1000; // 24 hours in ms
      }
      
      const endTime = new Date(endTimeMs);
      console.log("Calculated end time:", endTime.toISOString());
      
      // Compress images before submitting to reduce payload size
      let compressedOptionAImage = optionAImage;
      let compressedOptionBImage = optionBImage;
      
      try {
        // Compress option A image if it exists
        if (optionAImage) {
          compressedOptionAImage = await compressImageDataUrl(optionAImage, 800, 0.7);
        }
        
        // Compress option B image if it exists  
        if (optionBImage) {
          compressedOptionBImage = await compressImageDataUrl(optionBImage, 800, 0.7);
        }
      } catch (error) {
        console.error("Error compressing images:", error);
        // Continue with uncompressed images if compression fails
      }
      
      // Ensure we have all required fields with proper types
      const pollData = {
        userId: user?.id,
        question: values.question,
        optionAText: values.optionAText,
        optionAImage: compressedOptionAImage || null,
        optionBText: values.optionBText,
        optionBImage: compressedOptionBImage || null,
        endTime: endTime.toISOString(),
        isPublic: values.audience === "public" ? true : false,
      };
      
      console.log("Submitting poll data:", pollData);
      
      const res = await apiRequest("/api/polls", "POST", pollData);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Challenge Created",
        description: "Your challenge has been created successfully",
      });
      // Invalidate all the queries that might be affected by a new poll creation
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/polls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/warpasses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/votes"] });
      
      navigate(`/polls/${data.id}`);
      form.reset();
      setOptionAImage(null);
      setOptionBImage(null);
    },
    onError: (error: any) => {
      console.error("Challenge creation error:", error);
      
      // Try to extract detailed error information if available
      let errorMsg = "An error occurred while creating the challenge";
      
      if (error.message) {
        errorMsg = error.message;
      }
      
      // If there's a response with more details (axios error format)
      if (error.response && error.response.data) {
        console.error("Error details:", error.response.data);
        
        if (error.response.data.errors) {
          if (Array.isArray(error.response.data.errors)) {
            // Format validation errors from array format
            errorMsg = error.response.data.errors
              .map((err: any) => `${err.path.join('.')}: ${err.message}`)
              .join(', ');
          } else {
            // Format validation errors from object format
            errorMsg = Object.entries(error.response.data.errors)
              .map(([field, msgs]) => `${field}: ${msgs}`)
              .join(', ');
          }
        } else if (error.response.data.message) {
          errorMsg = error.response.data.message;
        }
      }
      
      toast({
        title: "Failed to create challenge",
        description: errorMsg,
        variant: "destructive",
      });
    },
  });
  
  // Cleanup timeouts when the component unmounts
  useEffect(() => {
    return () => {
      if (typingTimeoutA) clearTimeout(typingTimeoutA);
      if (typingTimeoutB) clearTimeout(typingTimeoutB);
    };
  }, [typingTimeoutA, typingTimeoutB]);

  const onSubmit = (values: PollFormValues) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create a challenge",
        variant: "destructive",
      });
      return;
    }
    
    // Additional validation for "Custom" duration
    if (values.duration === "custom") {
      // Get values from the custom fields
      const hours = values.customHours || 0;
      const minutes = values.customMinutes || 0;
      
      console.log("Duration validation:", { hours, minutes });
      
      // Ensure we have a minimum valid duration (at least 5 minutes)
      if (hours === 0 && minutes < 5) {
        toast({
          title: "Invalid Duration",
          description: "Challenge duration must be at least 5 minutes",
          variant: "destructive",
        });
        return;
      }
      
      // Ensure we have a valid duration
      if (hours === 0 && minutes === 0) {
        toast({
          title: "Invalid Duration",
          description: "Please specify a valid challenge duration",
          variant: "destructive",
        });
        return;
      }
    }
    
    createPollMutation.mutate(values);
  };
  
  // Handle image file uploads
  const handleImageUpload = (option: "A" | "B", event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an image file (JPEG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }
    
    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }
    
    // Read the file as a data URL
    const reader = new FileReader();
    
    if (option === "A") setIsSearchingA(true);
    else setIsSearchingB(true);
    
    reader.onload = async (e) => {
      const result = e.target?.result as string;
      
      try {
        // Compress image immediately after loading
        const compressedImage = await compressImageDataUrl(result, 800, 0.7);
        
        if (option === "A") {
          setOptionAImage(compressedImage);
          setIsSearchingA(false);
        } else {
          setOptionBImage(compressedImage);
          setIsSearchingB(false);
        }
      } catch (error) {
        console.error("Error compressing uploaded image:", error);
        // Fall back to uncompressed image if compression fails
        if (option === "A") {
          setOptionAImage(result);
          setIsSearchingA(false);
        } else {
          setOptionBImage(result);
          setIsSearchingB(false);
        }
      }
    };
    
    reader.onerror = () => {
      toast({
        title: "Error Reading File",
        description: "There was an error reading the image file",
        variant: "destructive",
      });
      if (option === "A") setIsSearchingA(false);
      else setIsSearchingB(false);
    };
    
    reader.readAsDataURL(file);
  };
  
  // Function to open file picker
  const openFilePicker = (option: "A" | "B") => {
    if (option === "A" && fileInputA.current) {
      fileInputA.current.click();
    } else if (option === "B" && fileInputB.current) {
      fileInputB.current.click();
    }
  };

  const searchImageForOption = async (option: "A" | "B") => {
    const searchText = option === "A" 
      ? form.getValues("optionAText") 
      : form.getValues("optionBText");
    
    if (!searchText) {
      toast({
        title: "Input Required",
        description: `Please enter text for ${option === "A" ? "This" : "That"} first`,
        variant: "destructive",
      });
      return;
    }
    
    try {
      if (option === "A") setIsSearchingA(true);
      else setIsSearchingB(true);
      
      try {
        // First try to get images from the API
        const images = await searchImages(searchText);
        
        if (images && images.length > 0) {
          try {
            // For external URLs, we'll need to fetch and convert to data URL first
            const response = await fetch(images[0].url);
            const blob = await response.blob();
            
            // Convert blob to data URL
            const reader = new FileReader();
            reader.onload = async (e) => {
              const dataUrl = e.target?.result as string;
              
              // Compress the image
              const compressedImage = await compressImageDataUrl(dataUrl, 800, 0.7);
              
              if (option === "A") setOptionAImage(compressedImage);
              else setOptionBImage(compressedImage);
            };
            
            reader.readAsDataURL(blob);
            return;
          } catch (fetchError) {
            console.error("Error fetching/compressing image:", fetchError);
            // Fall back to direct URL if fetch/compression fails
            if (option === "A") setOptionAImage(images[0].url);
            else setOptionBImage(images[0].url);
            return;
          }
        }
      } catch (apiError) {
        console.log("Image API search failed, using fallback:", apiError);
        // If API fails, we'll continue to use the fallback
      }
      
      // If we're here, either the API failed or returned no images
      // Generate a fallback image
      const fallbackImage = getFallbackImage(searchText);
      
      if (option === "A") setOptionAImage(fallbackImage);
      else setOptionBImage(fallbackImage);
      
    } catch (error) {
      toast({
        title: "Image Generation Failed",
        description: "Failed to generate an image. Please try again.",
        variant: "destructive",
      });
    } finally {
      if (option === "A") setIsSearchingA(false);
      else setIsSearchingB(false);
    }
  };
  
  return (
    <Card className="bg-card border-primary/30">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-montserrat font-bold">Create a New Challenge</CardTitle>
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
                      <FormLabel>This</FormLabel>
                      <div className="bg-black border border-primary/30 rounded overflow-hidden">
                        <div 
                          className="h-32 bg-black flex items-center justify-center relative"
                          onClick={() => !isSearchingA && openFilePicker("A")}
                        >
                          {optionAImage ? (
                            <img 
                              src={optionAImage} 
                              alt="This" 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <div 
                              className="flex flex-col items-center justify-center cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                openFilePicker("A");
                              }}
                            >
                              {isSearchingA ? (
                                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                              ) : (
                                <Upload className="h-8 w-8 text-primary/70" />
                              )}
                              <span className="text-xs text-muted-foreground mt-1">
                                {isSearchingA ? "Processing..." : "Click to upload image"}
                              </span>
                            </div>
                          )}
                          
                          {/* Image search button removed */}
                          
                          <input
                            type="file"
                            ref={fileInputA}
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleImageUpload("A", e)}
                          />
                        </div>
                        <div className="p-3">
                          <FormControl>
                            <Input 
                              placeholder="This title"
                              className="bg-black border-0"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                // Auto image search removed
                              }}
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
                      <FormLabel>That</FormLabel>
                      <div className="bg-black border border-primary/30 rounded overflow-hidden">
                        <div 
                          className="h-32 bg-black flex items-center justify-center relative"
                          onClick={() => !isSearchingB && openFilePicker("B")}
                        >
                          {optionBImage ? (
                            <img 
                              src={optionBImage} 
                              alt="That" 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <div 
                              className="flex flex-col items-center justify-center cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                openFilePicker("B");
                              }}
                            >
                              {isSearchingB ? (
                                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                              ) : (
                                <Upload className="h-8 w-8 text-primary/70" />
                              )}
                              <span className="text-xs text-muted-foreground mt-1">
                                {isSearchingB ? "Processing..." : "Click to upload image"}
                              </span>
                            </div>
                          )}
                          
                          {/* Image search button for option B removed */}
                          
                          <input
                            type="file"
                            ref={fileInputB}
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleImageUpload("B", e)}
                          />
                        </div>
                        <div className="p-3">
                          <FormControl>
                            <Input 
                              placeholder="That title"
                              className="bg-black border-0"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                // Auto image search removed
                              }}
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
