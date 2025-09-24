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

  // Load image with lazy loading for watermark
  useEffect(() => {
    if (!photo?.image) return;
    
    let isMounted = true;
    
    const loadImage = async () => {
      if (!showWatermark) {
        if (isMounted) setWatermarkedImage(photo.image);
        return;
      }

      // Show original image first
      if (isMounted) setWatermarkedImage(photo.image);
      
      // Then apply watermark in the background
      setIsWatermarking(true);
      
      try {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        
        // Load the image
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          const timestamp = new Date().getTime();
          img.src = `${photo.image}${photo.image.includes('?') ? '&' : '?'}t=${timestamp}`;
        });
        
        // Apply watermark
        const watermarked = await applyWatermark(img);
        
        // Only update if component is still mounted and we have a valid result
        if (isMounted && watermarked) {
          setWatermarkedImage(watermarked);
        }
      } catch (error) {
        console.error('Error processing image:', error);
      } finally {
        if (isMounted) setIsWatermarking(false);
      }
    };
    
    loadImage();
    
    return () => {
      isMounted = false;
    };
  }, [photo, showWatermark, applyWatermark]);

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
