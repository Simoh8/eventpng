import React from 'react';
import { Link } from 'react-router-dom';

const TermsAndPrivacy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 w-[90vw] mx-auto">
      <div className="w-full bg-white rounded-lg shadow-md p-4 sm:p-6 lg:p-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl mb-4">
            Terms of Service & Privacy Policy
          </h1>
          <p className="text-xl text-gray-600">
            Last Updated: August 29, 2025
          </p>
        </div>

        <div className="prose prose-lg max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Data Protection and Image Usage</h2>
            <p className="mb-4">
              This website operates in compliance with the Kenya Data Protection Act (2019) and the 2021 General Regulations. We are committed to protecting your personal data and privacy rights.
            </p>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">1.1 Photography at Events</h3>
            <p className="mb-4">
              By attending events where we are providing photography services, you acknowledge that:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Photography and filming will be taking place for event coverage</li>
              <li>Images may be published in a private online gallery for viewing and purchase</li>
              <li>You may be identifiable in photographs</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">1.2 Lawful Basis for Processing</h3>
            <p className="mb-4">
              We process personal data (including images) based on:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Legitimate Interests:</strong> For event coverage and making images available for purchase</li>
              <li><strong>Consent:</strong> For any marketing or promotional use of images</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Your Rights</h2>
            <p className="mb-4">
              Under the Data Protection Act, you have the right to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Request access to your personal data</li>
              <li>Request correction of your personal data</li>
              <li>Object to processing of your personal data</li>
              <li>Request erasure of your personal data</li>
              <li>Request restriction of processing</li>
              <li>Data portability (where applicable)</li>
              <li>Withdraw consent at any time</li>
            </ul>

            <div className="bg-blue-50 p-4 rounded-lg my-6">
              <h3 className="font-semibold text-blue-800">Image Removal Requests</h3>
              <p className="text-blue-700">
                If you wish to have an image removed from our gallery, please contact us at 
                <a href="mailto:privacy@imagegallery.com" className="text-blue-600 hover:underline">privacy@imagegallery.com</a> 
                with the image details. We will respond to all valid requests within 30 days.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Children's Privacy</h2>
            <p className="mb-4">
              We take special care with images of children:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>We will not knowingly photograph children under 13 without parental/guardian consent</li>
              <li>Images of minors will only be used in accordance with parental consent</li>
              <li>Parents/guardians may request removal of images of their children at any time</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Image Licensing and Usage</h2>
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.1 Copyright</h3>
            <p className="mb-4">
              All photographs are protected by copyright. The copyright for all images remains the property of the photographer.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.2 Purchased Images</h3>
            <p className="mb-4">
              When you purchase a digital image, you receive a non-exclusive, non-transferable license to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Use the image for personal, non-commercial purposes</li>
              <li>Print and share the image with friends and family</li>
              <li>Post the image on personal social media accounts</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.3 Prohibited Uses</h3>
            <p className="mb-4">
              You may not:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Resell or redistribute the images</li>
              <li>Use images for commercial purposes without additional licensing</li>
              <li>Claim ownership of the images</li>
              <li>Edit or alter the images beyond basic cropping</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. No Refund Policy</h2>
            <p className="mb-4">
              Due to the digital nature of our products, all sales are final. We do not offer refunds or exchanges for purchased digital images. Please ensure you have selected the correct images before completing your purchase.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Security</h2>
            <p className="mb-4">
              We implement appropriate technical and organizational measures to protect your personal data, including:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Secure storage of digital images</li>
              <li>Restricted access to personal data</li>
              <li>Encryption of sensitive information</li>
              <li>Regular security assessments</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Changes to This Policy</h2>
            <p className="mb-4">
              We may update this policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Contact Us</h2>
            <p className="mb-4">
              If you have any questions about this policy or wish to exercise your data protection rights, please contact us at:
            </p>
            <p className="mb-2">
              <strong>Email:</strong> privacy@imagegallery.com
            </p>
            <p className="mb-2">
              <strong>Phone:</strong> +254 700 000000
            </p>
            <p>
              <strong>Address:</strong> P.O. Box 0000-00100, Nairobi, Kenya
            </p>
          </section>

          <div className="border-t border-gray-200 pt-6 mt-12">
            <p className="text-sm text-gray-500">
              This document was last updated on August 29, 2025. For more information about your rights under Kenyan data protection law, please visit the 
              <a href="https://www.odpc.go.ke/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                Office of the Data Protection Commissioner Kenya
              </a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndPrivacy;
