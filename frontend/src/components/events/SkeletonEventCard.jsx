const SkeletonEventCard = () => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden h-full flex flex-col animate-pulse">
      <div className="h-48 bg-gray-200"></div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="space-y-2 mt-2">
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
        <div className="mt-4 flex justify-between items-center">
          <div className="h-6 bg-gray-200 rounded-full w-16"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    </div>
  );
  
  export default SkeletonEventCard;
  