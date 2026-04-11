const SystemMessage = ({ content }) => (
  <div className="flex justify-center my-4">
    <span className="bg-gray-100 text-gray-500 text-xs font-medium px-4 py-1.5 rounded-full shadow-sm">
      {content}
    </span>
  </div>
);

export default SystemMessage;
