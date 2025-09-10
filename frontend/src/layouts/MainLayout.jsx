import { Fragment, useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import { 
  XMarkIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  ArrowRightIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import UserMenu from '../components/UserMenu';
import { useAuth } from '../context/AuthContext';
import BaseLayout from './BaseLayout';

export default function MainLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };
    
  // Navigation items - Focused on event photo browsing and purchases
  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Events', href: '/events' },
    ...(isAuthenticated ? [
      user?.is_photographer 
        ? { name: 'Dashboard', href: '/dashboard' }
        : { name: 'My Gallery', href: '/my-gallery' }
    ] : [
      { name: 'Pricing', href: '/pricing' },
      { name: 'FAQ', href: '/faq' },
      { name: 'Terms', href: '/terms' },
    ]),
  ];
  
  // Mobile navigation items
  const mobileNavigation = [
    ...navigation,
    ...(isAuthenticated 
      ? [
          ...(user?.is_photographer ? [{ name: 'Create Gallery', href: '/galleries/new' }] : []),
          { name: 'My Orders', href: '/orders' },
          { name: 'Account Settings', href: '/settings' },
          { name: 'Help & Support', href: '/support' },
        ]
      : [
          { name: 'Sign In', href: '/login' },
          { name: 'Create Account', href: '/register' },
          { name: 'Help & Support', href: '/support' },
        ]
    ),
  ];
  
  // Mobile menu button component
  const MobileMenuButton = () => (
    <button
      type="button"
      onClick={() => setMobileMenuOpen(true)}
      className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden"
    >
      <span className="sr-only">Open main menu</span>
      <svg
        className="block h-6 w-6"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Link to="/" className="flex items-center">
                  <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                    EventPNG
                  </span>
                </Link>
              </div>
              <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`px-3 py-2 text-sm font-medium ${
                      location.pathname === item.href
                        ? 'text-primary-600 border-b-2 border-primary-500'
                        : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Desktop auth buttons */}
            <div className="hidden lg:flex lg:items-center lg:space-x-4">
              {isAuthenticated ? (
                <>
                  {user?.is_photographer && (
                    <Link
                      to="/galleries/new"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <ArrowUpTrayIcon className="-ml-1 mr-2 h-5 w-5" />
                      Create Gallery
                    </Link>
                  )}
                  <UserMenu user={user} onLogout={handleLogout} />
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <span>Sign up</span>
                    <ArrowRightIcon className="ml-2 -mr-1 h-5 w-5" />
                  </Link>
                </>
              )}
            </div>
            
            {/* Mobile menu button */}
            <div className="lg:hidden">
              <MobileMenuButton />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <Transition.Root show={mobileMenuOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setMobileMenuOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
          </Transition.Child>

          <div className="fixed inset-0 z-40 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex w-full max-w-xs flex-1 flex-col bg-white pb-4 pt-5">
                <div className="absolute right-0 top-0 -mr-12 pt-2">
                  <button
                    type="button"
                    className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="sr-only">Close sidebar</span>
                    <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex flex-shrink-0 items-center px-4">
                  <span className="text-xl font-bold text-primary-600">EventPNG</span>
                </div>

                <div className="mt-5 h-0 flex-1 overflow-y-auto">
                  <nav className="space-y-1 px-2">
                    {mobileNavigation.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`group flex items-center rounded-md px-2 py-2 text-base font-medium ${
                          location.pathname === item.href
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </nav>

                  {isAuthenticated ? (
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <div className="flex items-center px-4">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                            {user?.name?.split(' ').map(n => n[0]).join('') || <UserCircleIcon className="h-6 w-6" />}
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-base font-medium text-gray-800">{user?.name}</div>
                          <div className="text-sm font-medium text-gray-500">{user?.email}</div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <button
                          onClick={() => {
                            handleLogout();
                            setMobileMenuOpen(false);
                          }}
                          className="flex w-full items-center rounded-md px-4 py-2 text-base font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        >
                          <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-500" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 px-4 space-y-4">
                      <Link
                        to="/login"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex w-full items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-primary-700"
                      >
                        Sign in
                      </Link>
                      <p className="mt-2 text-center text-sm text-gray-600">
                        Or{' '}
                        <Link
                          to="/register"
                          onClick={() => setMobileMenuOpen(false)}
                          className="font-medium text-primary-600 hover:text-primary-500"
                        >
                          create an account
                        </Link>
                      </p>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
            <div className="w-14 flex-shrink-0"></div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Main content */}
      <main className="py-10">
        <BaseLayout>
          <Outlet />
        </BaseLayout>
      </main>
    </div>
  );
}
