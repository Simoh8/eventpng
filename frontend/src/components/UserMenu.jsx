import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { 
  UserCircleIcon,
  Cog6ToothIcon,
  ShoppingCartIcon,
  BookmarkIcon,
  QuestionMarkCircleIcon,
  ArrowUpTrayIcon,
  ArrowRightOnRectangleIcon,
  PhotoIcon,
  TicketIcon
} from '@heroicons/react/24/outline';

const UserMenu = ({ user, onLogout }) => {
  const userNavigation = [
    { 
      name: 'My Tickets', 
      href: '/tickets/my-tickets', 
      icon: TicketIcon,
      description: 'View and manage your event tickets'
    },
    { 
      name: 'My Photos', 
      href: '/my-photos', 
      icon: PhotoIcon,
      description: 'View and download your purchased photos'
    },
    { 
      name: 'My Orders', 
      href: '/orders', 
      icon: ShoppingCartIcon,
      description: 'View your order history and receipts'
    },
    { 
      name: 'Saved Photos', 
      href: '/saved', 
      icon: BookmarkIcon,
      description: 'View your saved photos for later'
    },
    { 
      name: 'Account Settings', 
      href: '/settings', 
      icon: Cog6ToothIcon,
      description: 'Update your account information'
    },
    { 
      name: 'Help & Support', 
      href: '/support', 
      icon: QuestionMarkCircleIcon,
      description: 'Get help with your account or orders',
      divider: true
    },
    { 
      name: 'Sign out', 
      href: '#', 
      icon: ArrowRightOnRectangleIcon,
      onClick: onLogout,
      description: 'Sign out of your account to redirect to the right views or pages'
    },
  ];

  function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
  }

  return (
    <Menu as="div" className="relative">
      <div>
        <Menu.Button className="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
          <span className="sr-only">Open user menu</span>
          {user?.avatar ? (
            <img
              className="h-8 w-8 rounded-full"
              src={user.avatar}
              alt={user.name || 'User'}
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
              {user?.name ? (
                user.name.split(' ').map(n => n[0]).join('')
              ) : (
                <UserCircleIcon className="h-5 w-5" />
              )}
            </div>
          )}
        </Menu.Button>
      </div>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-10 mt-2 w-72 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="px-4 py-3">
            <p className="text-sm font-medium text-gray-900">{user?.full_name || user?.email || 'User'}</p>
            <p className="truncate text-sm text-gray-500">{user?.email || ''}</p>
          </div>
          
          <div className="py-1">
            {userNavigation.map((item) => (
              <Menu.Item key={item.name}>
                {({ active }) => (
                  <div>
                    {item.href === '#' ? (
                      <button
                        onClick={item.onClick}
                        className={classNames(
                          active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                          'group flex w-full items-center px-4 py-3 text-sm hover:bg-gray-50'
                        )}
                      >
                        <item.icon
                          className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                          aria-hidden="true"
                        />
                        <div className="flex-1 text-left">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-gray-500">{item.description}</div>
                        </div>
                      </button>
                    ) : (
                      <Link
                        to={item.href}
                        className={classNames(
                          active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                          'group flex items-center px-4 py-3 text-sm hover:bg-gray-50'
                        )}
                      >
                        <item.icon
                          className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                          aria-hidden="true"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-gray-500">{item.description}</div>
                        </div>
                      </Link>
                    )}
                    {item.divider && <div className="border-t border-gray-100 my-1" />}
                  </div>
                )}
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default UserMenu;
