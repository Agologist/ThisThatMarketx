import { apiRequest } from "@/lib/queryClient";

export interface ImageSearchResult {
  id: string;
  url: string;
  thumb: string;
  description: string;
}

/**
 * Search for images using the app's API
 * @param query The search query
 * @returns Array of image results
 */
export async function searchImages(query: string): Promise<ImageSearchResult[]> {
  try {
    // Encode the query for URL parameters
    const encodedQuery = encodeURIComponent(query);
    
    // Make the API request
    const response = await fetch(`/api/search/images?q=${encodedQuery}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Image search failed: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    return data as ImageSearchResult[];
  } catch (error) {
    console.error("Error searching for images:", error);
    throw error;
  }
}

/**
 * Get a fallback image URL when search fails
 * @param category The image category
 * @returns A placeholder image URL
 */
export function getFallbackImage(category: string): string {
  // Default placeholders for common categories
  const placeholders: Record<string, string> = {
    "car": "https://cdn-icons-png.flaticon.com/512/4955/4955169.png",
    "food": "https://cdn-icons-png.flaticon.com/512/1046/1046784.png",
    "nature": "https://cdn-icons-png.flaticon.com/512/628/628283.png",
    "technology": "https://cdn-icons-png.flaticon.com/512/3659/3659898.png",
    "default": "https://cdn-icons-png.flaticon.com/512/1160/1160358.png"
  };
  
  return placeholders[category.toLowerCase()] || placeholders.default;
}
