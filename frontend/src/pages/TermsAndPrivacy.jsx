import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const TermsAndPrivacy = () => {
  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full bg-white rounded-2xl shadow-xl p-6 sm:p-8 lg:p-10"
        >
          <div className="text-center mb-12">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-block p-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl mb-6"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </motion.div>
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Terms of Service & Privacy Policy
            </h1>
            <p className="text-xl text-gray-600 font-medium">
              Last Updated: August 29, 2025
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            <motion.section 
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              className="mb-12 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-l-4 border-blue-500 shadow-sm"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Important Notice
              </h2>
              <p className="mb-0 text-blue-800 font-medium">
                Please read these terms carefully. By using our services, you agree to be bound by these terms and conditions.
              </p>
            </motion.section>

            {[
              {
                title: "Data Protection and Image Usage",
                content: (
                  <>
                    <p className="mb-4 text-gray-700">
                      This website operates in compliance with the Kenya Data Protection Act (2019) and the 2021 General Regulations. We are committed to protecting your personal data and privacy rights.
                    </p>
                    
                    <div className="ml-6 mt-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        1.1 Photography at Events
                      </h3>
                      <p className="mb-4 text-gray-700">
                        By attending events where we are providing photography services, you acknowledge that:
                      </p>
                      <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-700">
                        <li className="pl-2">Photography and filming will be taking place for event coverage</li>
                        <li className="pl-2">Images may be published in a private online gallery for viewing and purchase</li>
                        <li className="pl-2">You may be identifiable in photographs</li>
                      </ul>

                      <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        1.2 Lawful Basis for Processing
                      </h3>
                      <p className="mb-4 text-gray-700">
                        We process personal data (including images) based on:
                      </p>
                      <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-700">
                        <li className="pl-2"><strong>Legitimate Interests:</strong> For event coverage and making images available for purchase</li>
                        <li className="pl-2"><strong>Consent:</strong> For any marketing or promotional use of images</li>
                      </ul>
                    </div>
                  </>
                )
              },
              {
                title: "Your Rights",
                content: (
                  <>
                    <p className="mb-4 text-gray-700">
                      Under the Data Protection Act, you have the right to:
                    </p>
                    <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-700">
                      <li className="pl-2">Request access to your personal data</li>
                      <li className="pl-2">Request correction of your personal data</li>
                      <li className="pl-2">Object to processing of your personal data</li>
                      <li className="pl-2">Request erasure of your personal data</li>
                      <li className="pl-2">Request restriction of processing</li>
                      <li className="pl-2">Data portability (where applicable)</li>
                      <li className="pl-2">Withdraw consent at any time</li>
                    </ul>

                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 my-6">
                      <h3 className="font-semibold text-blue-800 text-lg mb-2 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Image Removal Requests
                      </h3>
                      <p className="text-blue-700">
                        If you wish to have an image removed from our gallery, please contact us at 
                        <a href="mailto:simomutu8@gmail.com" className="text-blue-600 hover:underline font-medium ml-1">simomutu8@gmail.com</a> 
                        with the image details. We will respond to all valid requests within 30 days.
                      </p>
                    </div>
                  </>
                )
              },
              {
                title: "Children's Privacy",
                content: (
                  <>
                    <p className="mb-4 text-gray-700">
                      We take special care with images of children:
                    </p>
                    <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-700">
                      <li className="pl-2">We will not knowingly photograph children under 13 without parental/guardian consent</li>
                      <li className="pl-2">Images of minors will only be used in accordance with parental consent</li>
                      <li className="pl-2">Parents/guardians may request removal of images of their children at any time</li>
                    </ul>
                  </>
                )
              },
              {
                title: "Image Licensing and Usage",
                content: (
                  <>
                    <div className="ml-6 mt-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">4.1 Copyright</h3>
                      <p className="mb-4 text-gray-700">
                        All photographs are protected by copyright. The copyright for all images remains the property of the photographer.
                      </p>

                      <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.2 Purchased Images</h3>
                      <p className="mb-4 text-gray-700">
                        When you purchase a digital image, you receive a non-exclusive, non-transferable license to:
                      </p>
                      <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-700">
                        <li className="pl-2">Use the image for personal, non-commercial purposes</li>
                        <li className="pl-2">Print and share the image with friends and family</li>
                        <li className="pl-2">Post the image on personal social media accounts</li>
                      </ul>

                      <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.3 Prohibited Uses</h3>
                      <p className="mb-4 text-gray-700">
                        You may not:
                      </p>
                      <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-700">
                        <li className="pl-2">Resell or redistribute the images</li>
                        <li className="pl-2">Use images for commercial purposes without additional licensing</li>
                        <li className="pl-2">Claim ownership of the images</li>
                        <li className="pl-2">Edit or alter the images beyond basic cropping</li>
                      </ul>
                    </div>
                  </>
                )
              },
              {
                title: "No Refund Policy",
                content: (
                  <p className="mb-4 text-gray-700">
                    Due to the digital nature of our products, all sales are final. We do not offer refunds or exchanges for purchased digital images. Please ensure you have selected the correct images before completing your purchase.
                  </p>
                )
              },
              {
                title: "Data Security",
                content: (
                  <>
                    <p className="mb-4 text-gray-700">
                      We implement appropriate technical and organizational measures to protect your personal data, including:
                    </p>
                    <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-700">
                      <li className="pl-2">Secure storage of digital images</li>
                      <li className="pl-2">Restricted access to personal data</li>
                      <li className="pl-2">Encryption of sensitive information</li>
                      <li className="pl-2">Regular security assessments</li>
                    </ul>
                  </>
                )
              },
              {
                title: "Changes to This Policy",
                content: (
                  <p className="mb-4 text-gray-700">
                    We may update this policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.
                  </p>
                )
              },
              {
                title: "Contact Us",
                content: (
                  <>
                    <p className="mb-4 text-gray-700">
                      If you have any questions about this policy or wish to exercise your data protection rights, please contact us at:
                    </p>
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <p className="mb-3 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <strong className="text-gray-800">Email:</strong> 
                        <a href="mailto:simomutu8@gmail.com" className="ml-2 text-blue-600 hover:underline">simomutu8@gmail.com</a>
                      </p>
                      <p className="mb-3 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <strong className="text-gray-800">Phone:</strong> 
                        <span className="ml-2">+254 742 582 849</span>
                      </p>
                      <p className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <strong className="text-gray-800">Address:</strong> 
                        <span className="ml-2">P.O. Box 0000-00100, Nairobi, Kenya</span>
                      </p>
                    </div>
                  </>
                )
              }
            ].map((section, index) => (
              <motion.section
                key={index}
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: index * 0.1 }}
                className="mb-12 p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">
                    {index + 1}
                  </span>
                  {section.title}
                </h2>
                {section.content}
              </motion.section>
            ))}

            <motion.div 
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              className="border-t border-gray-200 pt-8 mt-12 text-center"
            >
              <p className="text-sm text-gray-500">
                This document was last updated on August 29, 2025. For more information about your rights under Kenyan data protection law, please visit the 
                <a href="https://www.odpc.go.ke/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium ml-1">
                  Office of the Data Protection Commissioner Kenya
                </a>.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TermsAndPrivacy;