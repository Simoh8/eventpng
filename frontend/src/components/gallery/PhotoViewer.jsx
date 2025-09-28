import React, { useState, useEffect, useRef, useCallback } from 'react';

const PhotoViewer = ({
  photo,
  onClose,
  onNavigate,
  children,
  className = '',
  showWatermark = false
}) => {
  const [watermarkedImage, setWatermarkedImage] = useState(null);
  const [isWatermarking, setIsWatermarking] = useState(false);
  const canvasRef = useRef(null);
  const watermarkText = 'EventPNG';

  // Memoize the watermarking function
  const applyWatermark = useCallback((img) => {
    return new Promise((resolve) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas dimensions
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the original image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Set text style - larger and bolder
        const fontSize = Math.max(canvas.width * 0.06, 30);
        ctx.font = `900 ${fontSize}px Arial Black, Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Calculate text metrics
        const textWidth = ctx.measureText(watermarkText).width;
        const spacing = textWidth * 1.2; // More dense pattern
        const angle = -20 * Math.PI / 180;
        
        // Move to center of canvas
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(angle);
        
        // Draw watermark pattern - more dense and prominent
        for (let x = -canvas.width; x < canvas.width * 2; x += spacing) {
          for (let y = -canvas.height; y < canvas.height * 2; y += spacing * 0.8) {
            // Draw text shadow - more prominent
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 12;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            
            // Draw outline - thicker and more visible
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 3;
            ctx.strokeText(watermarkText, x, y);
            
            // Draw main text - more opaque and bolder
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillText(watermarkText, x, y);
            
            // Add a subtle second outline for better visibility
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 6;
            ctx.strokeText(watermarkText, x, y);
            
            // Reset shadow
            ctx.shadowColor = 'transparent';
          }
        }
        
        ctx.restore();
        
        // Get the watermarked image as data URL
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } catch (error) {
        console.error('Error applying watermark:', error);
        resolve(null);
      }
    });
  }, [watermarkText]);

  // Load image with watermark immediately
  useEffect(() => {
    if (!photo?.image) return;
    
    let isMounted = true;
    
    const loadAndWatermarkImage = async () => {
      setIsWatermarking(true);
      
      try {
        // Create a new image to load
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        
        // Create a promise to handle image loading
        const imageLoaded = new Promise((resolve, reject) => {
          img.onload = () => resolve(img);
          img.onerror = reject;
          // Add timestamp to prevent caching issues
          img.src = `${photo.image}${photo.image.includes('?') ? '&' : '?'}t=${new Date().getTime()}`;
        });
        
        // Wait for the image to load
        const loadedImg = await imageLoaded;
        
        // Apply watermark to the loaded image
        const watermarked = await applyWatermark(loadedImg);
        
        // Only update if component is still mounted
        if (isMounted && watermarked) {
          setWatermarkedImage(watermarked);
        }
      } catch (error) {
        console.error('Error processing image:', error);
        // Fallback to original image if there's an error
        if (isMounted) setWatermarkedImage(photo.image);
      } finally {
        if (isMounted) setIsWatermarking(false);
      }
    };
    
    // Start the process
    loadAndWatermarkImage();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [photo?.image, applyWatermark]);

  if (!photo) return null;

  return (
    <div className="relative max-w-full max-h-full">
      <img
        src={watermarkedImage || photo.image}
        alt={photo.caption || 'Selected photo'}
        className={`max-w-full max-h-[80vh] object-contain rounded-sm transition-opacity duration-300 ${
          isWatermarking ? 'opacity-75' : 'opacity-100'
        } ${className}`}
        style={{
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          userSelect: 'none',
          pointerEvents: 'none'
        }}
        ref={canvasRef}
      />
      {children}
    </div>
  );
};

export default PhotoViewer;
