import { Link } from 'react-router-dom';
import { HomeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

// Animation variants
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 10
    }
  }
};

const buttonHover = {
  scale: 1.05,
  transition: {
    type: 'spring',
    stiffness: 400,
    damping: 10
  }
};

const buttonTap = {
  scale: 0.98
};

export default function NotFoundPage() {
  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8"
      initial="hidden"
      animate="show"
      variants={container}
    >
      <motion.div 
        className="text-center max-w-2xl mx-auto"
        variants={container}
      >
        <motion.div 
          className="inline-flex items-center justify-center w-40 h-40 rounded-full bg-red-50 mb-6 mx-auto"
          variants={item}
        >
          <ExclamationTriangleIcon className="h-20 w-20 text-red-500" />
        </motion.div>
        
        <motion.h1 
          className="text-8xl font-bold text-gray-900 mb-2 bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-red-600"
          variants={item}
        >
          404
        </motion.h1>
        
        <motion.h2 
          className="text-3xl font-bold text-gray-900 mb-4"
          variants={item}
        >
          Oops! Page not found
        </motion.h2>
        
        <motion.p 
          className="text-lg text-gray-600 mb-8"
          variants={item}
        >
          The page you're looking for doesn't exist or has been moved.
        </motion.p>
        
        <motion.div 
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
          variants={item}
        >
          <motion.div whileHover={buttonHover} whileTap={buttonTap}>
            <Link
              to="/"
              className="flex items-center justify-center rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-3 text-base font-semibold text-white hover:text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <HomeIcon className="h-5 w-5 mr-2" />
              Go back home
            </Link>
          </motion.div>
          
          <motion.div 
            className="text-sm text-gray-500"
            variants={item}
          >
          </motion.div>
          

        </motion.div>
      </motion.div>
    </motion.div>
  );
}
