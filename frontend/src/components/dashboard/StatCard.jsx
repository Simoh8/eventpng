import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

const StatCard = (props) => {
  let { name, value, icon: Icon, to, change, changeType } = props;
  
  if (props.stat) {
    const { stat } = props;
    name = stat.name;
    value = stat.value;
    Icon = stat.icon;
    to = stat.to || stat.path || '#';
    change = stat.change;
    changeType = stat.changeType;
  }

  return (
    <Link 
      to={to}
      className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200 block"
    >
      <div className="p-5">
        <div className="flex items-center">
          {Icon && (
            <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
              <Icon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
          )}
          <div className={Icon ? "ml-5 w-0 flex-1" : "w-full"}>
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{name || 'Stat'}</dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">{value || '0'}</div>
                {change && (
                  <div className={`text-sm ${getChangeColor(changeType)}`}>
                    {change}
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 px-5 py-3">
        <div className="text-sm font-medium text-indigo-700 hover:text-indigo-900 flex items-center">
          View details <ArrowRightIcon className="ml-1 h-4 w-4" />
        </div>
      </div>
    </Link>
  );
};

const getChangeColor = (changeType) => {
  switch (changeType) {
    case 'positive':
      return 'text-green-600';
    case 'negative':
      return 'text-red-600';
    case 'neutral':
    default:
      return 'text-gray-500';
  }
};

export default StatCard;
