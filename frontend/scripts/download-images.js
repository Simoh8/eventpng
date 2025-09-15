const fs = require('fs');
const https = require('https');
const path = require('path');

// Create images directory if it doesn't exist
const imagesDir = path.join(__dirname, '../src/assets/images/sports-events');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Image URLs to download (sample images from Unsplash)
const images = [
  {
    url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195b86?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    filename: 'football.jpg'
  },
  {
    url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    filename: 'basketball.jpg'
  },
  {
    url: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    filename: 'marathon.jpg'
  },
  {
    url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    filename: 'tennis.jpg'
  },
  {
    url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    filename: 'swimming.jpg'
  },
  {
    url: 'https://images.unsplash.com/photo-1507035895480-2a3834d4aec6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    filename: 'cycling.jpg'
  }
];

// Function to download an image
const downloadImage = (url, filename) => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(imagesDir, filename);
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {}); // Delete the file if there's an error
      reject(err);
    });
  });
};

// Download all images
const downloadAllImages = async () => {
  try {
    for (const image of images) {
      await downloadImage(image.url, image.filename);
    }
  } catch (error) {
    console.error('Error downloading images:', error);
  }
};

// Run the downloader
downloadAllImages();
