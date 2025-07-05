import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ImageIcon, HelpCircle, Upload, Camera, Sword, Coins } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { searchImages, getFallbackImage, compressImageDataUrl } from "@/utils/imageSearch";
import { useLocation } from "wouter";
import { Switch } from "@/components/ui/switch";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

const challengeFormSchema = z.object({
  question: z.string().min(5, "Challenge title must be at least 5 characters"),
  optionAText: z.string().min(1, "Challenger 1 title is required"),
  optionBText: z.string().min(1, "Challenger 2 title is required"),
  duration: z.string(),
  audience: z.string(),
  // For custom duration - support both string and number input types
  customHours: z.coerce.number().min(0).max(72).optional(),
  customMinutes: z.coerce.number().min(0).max(59).optional(),
  isWar: z.boolean().default(false),
  memeCoinMode: z.boolean().default(false),
  creatorWallet: z.string().optional(),
});

type ChallengeFormValues = z.infer<typeof challengeFormSchema>;

interface Package {
  id: number;
  status: string;
  remainingPolls: number;
  totalPolls: number;
}

export default function ChallengeCreator() {
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

  // Check user's active package for MemeCoin mode
  const { data: activePackage } = useQuery<Package>({
    queryKey: ["/api/user/packages/active"],
    enabled: !!user,
    retry: false,
  });
  
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
  
  const form = useForm<ChallengeFormValues>({
    resolver: zodResolver(challengeFormSchema),
    defaultValues: {
      question: "",
      optionAText: "",
      optionBText: "",
      duration: "24h",
      audience: "public",
      customHours: 1,
      customMinutes: 0,
      isWar: false,
      memeCoinMode: false,
      creatorWallet: "",
    },
  });
  
  const createChallengeMutation = useMutation({
    mutationFn: async (values: ChallengeFormValues) => {
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
      const challengeData = {
        userId: user?.id,
        question: values.question,
        optionAText: values.optionAText,
        optionAImage: compressedOptionAImage || null,
        optionBText: values.optionBText,
        optionBImage: compressedOptionBImage || null,
        endTime: endTime.toISOString(),
        isPublic: values.audience === "public" ? true : false,
        isWar: values.isWar,
        memeCoinMode: values.memeCoinMode,
        creatorWallet: values.creatorWallet || null,
      };
      
      console.log("Submitting challenge data:", challengeData);
      
      const res = await apiRequest("/api/polls", "POST", challengeData);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Challenge Created",
        description: "Your challenge has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      navigate(`/challenges/${data.id}`);
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

  const onSubmit = (values: ChallengeFormValues) => {
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
    
    createChallengeMutation.mutate(values);
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
        description: `Please enter text for Challenger ${option} first`,
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" id="challenge-creator-form">
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
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/50">
                                <img 
                                  src={optionAImage} 
                                  alt="This" 
                                  className="w-full h-full object-cover" 
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="text-center p-4">
                              {isSearchingA ? (
                                <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                              ) : (
                                <>
                                  <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                  <p className="text-sm text-muted-foreground">Upload Image</p>
                                </>
                              )}
                            </div>
                          )}
                          
                          {/* Hidden file input */}
                          <input 
                            type="file" 
                            ref={fileInputA}
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleImageUpload("A", e)}
                          />
                        </div>
                        
                        <div className="p-2">
                          <FormControl>
                            <Input 
                              placeholder="Name for This" 
                              className="bg-black border-primary/30"
                              {...field} 
                              onChange={(e) => {
                                // Call the regular field.onChange
                                field.onChange(e);
                                
                                // Set up auto-search with debounce if needed
                                /*
                                if (typingTimeoutA) clearTimeout(typingTimeoutA);
                                setTypingTimeoutA(setTimeout(() => {
                                  searchImageForOption("A");
                                }, 800));
                                */
                              }}
                            />
                          </FormControl>
                        </div>
                        
                        <div className="flex border-t border-primary/30">
                          <Button 
                            type="button"
                            variant="ghost" 
                            className="flex-1 rounded-none h-10 text-xs py-1 px-2"
                            onClick={() => searchImageForOption("A")}
                          >
                            <ImageIcon className="h-4 w-4 mr-1" /> Find Image
                          </Button>
                          <Button 
                            type="button"
                            variant="ghost" 
                            className="flex-1 rounded-none h-10 text-xs py-1 px-2 border-l border-primary/30"
                            onClick={() => openFilePicker("A")}
                          >
                            <Upload className="h-4 w-4 mr-1" /> Upload
                          </Button>
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
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/50">
                                <img 
                                  src={optionBImage} 
                                  alt="That" 
                                  className="w-full h-full object-cover" 
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="text-center p-4">
                              {isSearchingB ? (
                                <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                              ) : (
                                <>
                                  <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                  <p className="text-sm text-muted-foreground">Upload Image</p>
                                </>
                              )}
                            </div>
                          )}
                          
                          {/* Hidden file input */}
                          <input 
                            type="file" 
                            ref={fileInputB}
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleImageUpload("B", e)}
                          />
                        </div>
                        
                        <div className="p-2">
                          <FormControl>
                            <Input 
                              placeholder="Name for That" 
                              className="bg-black border-primary/30"
                              {...field} 
                              onChange={(e) => {
                                // Call the regular field.onChange
                                field.onChange(e);
                                
                                // Set up auto-search with debounce if needed
                                /*
                                if (typingTimeoutB) clearTimeout(typingTimeoutB);
                                setTypingTimeoutB(setTimeout(() => {
                                  searchImageForOption("B");
                                }, 800));
                                */
                              }}
                            />
                          </FormControl>
                        </div>
                        
                        <div className="flex border-t border-primary/30">
                          <Button 
                            type="button"
                            variant="ghost" 
                            className="flex-1 rounded-none h-10 text-xs py-1 px-2"
                            onClick={() => searchImageForOption("B")}
                          >
                            <ImageIcon className="h-4 w-4 mr-1" /> Find Image
                          </Button>
                          <Button 
                            type="button"
                            variant="ghost" 
                            className="flex-1 rounded-none h-10 text-xs py-1 px-2 border-l border-primary/30"
                            onClick={() => openFilePicker("B")}
                          >
                            <Upload className="h-4 w-4 mr-1" /> Upload
                          </Button>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setShowCustomDuration(value === "custom");
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-black border-primary/30">
                          <SelectValue placeholder="Select a duration" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-black border-primary/30">
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
                      <SelectContent className="bg-black border-primary/30">
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
            
            {showCustomDuration && (
              <div className="grid grid-cols-2 gap-4 border border-primary/30 rounded p-4 bg-black/30">
                <div>
                  <FormField
                    control={form.control}
                    name="customHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hours (0-72)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            max="72"
                            placeholder="0"
                            className="bg-black border-primary/30"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div>
                  <FormField
                    control={form.control}
                    name="customMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minutes (0-59)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            max="59"
                            placeholder="0"
                            className="bg-black border-primary/30"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-2 flex items-center text-xs text-muted-foreground">
                  <HelpCircle className="h-4 w-4 mr-2 text-primary" />
                  Challenge duration must be at least 5 minutes and no more than 72 hours.
                </div>
              </div>
            )}
            
            <FormField
              control={form.control}
              name="isWar"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-lg border border-primary/30 p-4 bg-black/20">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base flex items-center">
                      <Sword className="w-5 h-5 mr-2 text-primary" />
                      Enable War Mode
                    </FormLabel>
                    <FormDescription>
                      After challenge ends, a car game will start where cars battle based on votes
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-primary"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="memeCoinMode"
              render={({ field }) => (
                <FormItem className="space-y-3 rounded-lg border border-primary/30 p-4 bg-black/20">
                  <div className="flex flex-row items-center justify-between space-y-0">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center">
                        <Coins className="w-5 h-5 mr-2 text-primary" />
                        Enable MemeCoin Mode
                      </FormLabel>
                      <FormDescription>
                        Voters automatically receive real Solana meme coins when they vote
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-primary"
                      />
                    </FormControl>
                  </div>
                  
                  {field.value && (
                    <div className="border-t border-primary/20 pt-3">
                      {activePackage ? (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-green-400">Package Active</span>
                          </div>
                          <div className="text-primary font-medium">
                            {activePackage.remainingPolls} credits remaining
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-red-400">No active package - Real coins require payment</span>
                          </div>
                          <div className="text-xs text-gray-400">
                            <Link href="/packages" className="text-primary hover:underline">
                              Purchase a package ($1 = 3 polls)
                            </Link> to enable real Solana coin generation
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </FormItem>
              )}
            />

            {form.watch("memeCoinMode") && (
              <FormField
                control={form.control}
                name="creatorWallet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Creator Wallet Address (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your Solana wallet address" 
                        className="bg-black border-primary/30"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Leave empty to use demo mode. Provide your Solana wallet to receive real coins.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <div className="pt-4">
              <Button 
                type="submit" 
                className="btn-gold w-full"
                disabled={createChallengeMutation.isPending}
              >
                {createChallengeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Challenge...
                  </>
                ) : (
                  'Create Challenge'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}