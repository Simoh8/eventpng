# Premium Image Gallery Platform

A high-quality image gallery platform where photographers can showcase their work and users can purchase downloads.

## Features

- **High-Quality Image Hosting**: Upload and display images without quality degradation
- **Responsive Gallery Interface**: Beautiful, mobile-friendly galleries
- **Secure Payment Processing**: Integrated with Stripe for secure transactions
- **User Authentication**: JWT-based authentication system
- **Gallery Management**: Create, update, and manage photo galleries
- **Watermarked Previews**: Protect your images with watermarks
- **Download Management**: Control access to high-resolution downloads
- **Order History**: Track purchases and downloads

## Tech Stack

- **Backend**: Django 4.2.7 with Django REST Framework
- **Frontend**: React.js with TypeScript
- **Database**: PostgreSQL (SQLite for development)
- **Storage**: AWS S3 (production) / Local storage (development)
- **Payments**: Stripe Checkout
- **Authentication**: JWT with djangorestframework-simplejwt
- **Image Processing**: Pillow
- **Deployment**: Docker, Gunicorn, Nginx

## 📸 Screenshots

<div align="center">
  <img src="./docs/screenshots/events-page.png" alt="Events Page" width="30%">
  <img src="./docs/screenshots/event-detail.png" alt="Event Detail" width="30%">
  <img src="./docs/screenshots/checkout.png" alt="Checkout" width="30%">
</div>

*More Screenshots coming soon*

## 🚀 Getting Started

### Prerequisites

- Python 3.9+
- Node.js 16+
- PostgreSQL 13+
- AWS Account (for S3 storage in production)
- Stripe Account
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/premium-gallery.git
   cd premium-gallery
   ```

2. **Set up Python environment**
   ```bash
   # Create and activate virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install Python dependencies
   cd backend
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   Create a `.env` file in the `backend` directory with the following variables:
   ```
   # Django
   DEBUG=True
   SECRET_KEY=your-secret-key-here
   ALLOWED_HOSTS=localhost,127.0.0.1
   
   # Database
   DATABASE_URL=sqlite:///db.sqlite3  # For development
   # DATABASE_URL=postgres://user:password@localhost:5432/gallery  # For production
   
   # Stripe
   STRIPE_SECRET_KEY=your-stripe-secret-key
   STRIPE_PUBLIC_KEY=your-stripe-public-key
   STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
   
   # AWS S3 (for production)
   AWS_ACCESS_KEY_ID=your-aws-access-key
   AWS_SECRET_ACCESS_KEY=your-aws-secret-key
   AWS_STORAGE_BUCKET_NAME=your-s3-bucket-name
   AWS_S3_REGION_NAME=your-s3-region
   
   # Email (for production)
   EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend  # For development
   # EMAIL_BACKEND=...  # For production
   DEFAULT_FROM_EMAIL=your-email@example.com
   ```

4. **Set up the database**
   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```

5. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

6. **Run the development servers**
   In the project root:
   ```bash
   # Backend
   python manage.py runserver
   
   # Frontend (in a new terminal)
   cd frontend
   npm start
   ```

## Project Structure

```
images_project/
├── backend/              # Django project
│   ├── accounts/         # User authentication
│   ├── gallery/          # Gallery app
│   ├── payments/         # Payment processing
│   └── config/           # Project settings
├── frontend/             # React frontend
│   ├── public/
│   └── src/
│       ├── components/   # Reusable components
│       ├── pages/        # Page components
│       ├── services/     # API services
│       └── styles/       # Global styles
├── .env                  # Environment variables
└── requirements.txt      # Python dependencies
```

## Deployment

### Backend

1. Set up a production database (PostgreSQL recommended)
2. Configure environment variables in production
3. Use Gunicorn with Nginx or deploy to a platform like Heroku/Railway

### Frontend

Build for production:
```bash
cd frontend
npm run build
```

## License

This project is licensed under the MIT License.





{
  "email": "photogapher1@example.com",
  "full_name": "John Photographer",
  "password": "securepassword123",
  "confirm_password": "securepassword123",
  "is_photographer": true
}