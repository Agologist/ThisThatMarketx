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
 * Generate a data URL for a placeholder image with text
 * @param text The text to display on the placeholder
 * @returns A data URL for the generated image
 */
export function generatePlaceholderImage(text: string): string {
  // Get a deterministic color based on the text
  const getHashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  };
  
  const intToRGB = (i: number) => {
    const c = (i & 0x00FFFFFF)
      .toString(16)
      .toUpperCase();
    return '00000'.substring(0, 6 - c.length) + c;
  };
  
  // Generate a color based on the text
  const hashCode = getHashCode(text);
  const color = '#' + intToRGB(hashCode);
  
  // Create a canvas element
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 300;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  // Fill the background
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add a pattern or texture
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  for (let i = 0; i < canvas.width; i += 20) {
    for (let j = 0; j < canvas.height; j += 20) {
      if ((i + j) % 40 === 0) {
        ctx.fillRect(i, j, 10, 10);
      }
    }
  }
  
  // Add the text
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'white';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  // Word wrap for longer texts
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];
  
  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + ' ' + words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > canvas.width - 40) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);
  
  // Draw each line of text
  const lineHeight = 40;
  const startY = canvas.height / 2 - (lines.length - 1) * lineHeight / 2;
  
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], canvas.width / 2, startY + i * lineHeight);
  }
  
  return canvas.toDataURL('image/png');
}

/**
 * Get a fallback image URL when search fails
 * @param text The text to use for generating a placeholder
 * @returns A placeholder image URL
 */
export function getFallbackImage(text: string): string {
  return generatePlaceholderImage(text);
}
