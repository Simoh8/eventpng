import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaInstagram, FaEnvelope, FaMapMarkerAlt, FaPhone, FaUser } from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-gray-900 to-black text-white pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div>
            <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              EventPNG
            </h3>
            <p className="text-gray-400 mb-4">
              Capturing your special moments with professional photography services for all types of events.
            </p>
            {/* <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors duration-200">
                <FaFacebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors duration-200">
                <FaTwitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-pink-400 transition-colors duration-200">
                <FaInstagram className="w-5 h-5" />
              </a>
            </div> */}
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Navigation</h4>
            <ul className="space-y-3">
              <li><Link to="/" className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center">Home</Link></li>
              <li><Link to="/events" className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center">Events</Link></li>
              <li><Link to="/pricing" className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center">Pricing</Link></li>
              <li><Link to="/faq" className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center">FAQ</Link></li>
              <li><Link to="/contact" className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center">Contact</Link></li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Legal</h4>
            <ul className="space-y-3">
              <li><Link to="/terms" className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center">Terms of Service</Link></li>
              <li><Link to="/terms" className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center">Cookie Policy</Link></li>
              <li><Link to="/terms" className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center">Data Protection</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Get in Touch</h4>
            <ul className="space-y-3">
              <li className="flex items-start">
                <FaMapMarkerAlt className="mt-1 mr-3 text-blue-400 flex-shrink-0" />
                <span className="text-gray-400">Nairobi, Kenya</span>
              </li>
              <li className="flex items-center">
                <FaEnvelope className="mr-3 text-blue-400" />
                <a href="mailto:simomutu8@gmail.com" className="text-gray-400 hover:text-white transition-colors duration-200">
                  simomutu8@gmail.com
                </a>
              </li>
              <li className="flex items-center">
                <FaPhone className="mr-3 text-blue-400" />
                <a href="tel:+254742582849" className="text-gray-400 hover:text-white transition-colors duration-200">
                  +254 742 582 849
                </a>
              </li>
              <li className="flex items-center pt-2">
                <FaUser className="mr-3 text-blue-400" />
                <Link to="/login" className="text-gray-400 hover:text-white transition-colors duration-200 font-medium">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              &copy; {currentYear} EventPNG. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <Link to="/terms" className="text-gray-400 hover:text-white text-sm transition-colors duration-200">
                Privacy
              </Link>
              <Link to="/terms" className="text-gray-400 hover:text-white text-sm transition-colors duration-200">
                Terms
              </Link>
              <Link to="/sitemap" className="text-gray-400 hover:text-white text-sm transition-colors duration-200">
                Sitemap
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;