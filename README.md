# 📸 EventPNG - Professional Event Photography Platform

A premium image gallery platform for professional photographers to showcase their work and sell high-quality digital downloads. Built with modern web technologies to deliver a seamless experience for both photographers and customers.

## ✨ Features

### For Photographers
- **Portfolio Showcase** - Create beautiful, responsive galleries to display your best work
- **Digital Sales** - Sell high-resolution image downloads with secure payment processing
- **Watermark Protection** - Automatic watermarking of preview images
- **Gallery Management** - Organize photos into custom galleries and collections
- **Analytics** - Track views and downloads of your work

### For Customers
- **High-Quality Downloads** - Purchase and download full-resolution images
- **Responsive Viewing** - Browse galleries on any device
- **Secure Checkout** - Safe and easy payment processing
- **Purchase History** - Access your purchased images anytime

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **State Management**: React Context API
- **Styling**: Tailwind CSS
- **Form Handling**: React Hook Form with Yup validation
- **Routing**: React Router v6
- **UI Components**: Headless UI, Heroicons
- **Authentication**: JWT with Google OAuth integration

### Backend
- **Framework**: Django 4.2 with Django REST Framework
- **Database**: PostgreSQL (production) / SQLite (development)
- **Authentication**: djangorestframework-simplejwt
- **Image Processing**: Pillow, django-storages
- **Payments**: Stripe Checkout integration
- **Email**: SendGrid for transactional emails

### Infrastructure
- **Storage**: AWS S3 for media storage
- **Hosting**: Docker containerization
- **Web Server**: Nginx with Gunicorn
- **CI/CD**: GitHub Actions

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+
- PostgreSQL
- AWS S3 bucket (for production)
- Stripe account
- Google OAuth credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/eventpng.git
   cd eventpng
   ```

2. **Set up backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py createsuperuser
   ```

3. **Set up frontend**
   ```bash
   cd ../frontend
   npm install
   cp .env.example .env.local
   # Update environment variables in .env.local
   ```

4. **Run the application**
   ```bash
   # In backend directory
   python manage.py runserver
   
   # In frontend directory (new terminal)
   npm start
   ```

## 📸 Screenshots

<div align="center">
  <img src="./docs/screenshots/events-page.png" alt="Events Page" width="30%">
  <img src="./docs/screenshots/event-detail.png" alt="Event Detail" width="30%">
  <img src="./docs/screenshots/checkout.png" alt="Checkout" width="30%">
</div>

## 🤝 Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) to get started.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📬 Contact

For inquiries, please contact [your-email@example.com](mailto:your-email@example.com) or open an issue on GitHub.

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
   git clone https://github.com/Simoh8/eventpng.git
   cd eventpng
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




now if they dont set it as public generate a otp code to that gallary which i want the user to use in order to access the inages in that gallary 