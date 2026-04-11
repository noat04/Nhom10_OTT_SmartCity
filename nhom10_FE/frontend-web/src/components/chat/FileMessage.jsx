const FileMessage = ({ fileUrl, fileName, fileSize, isMine }) => (
  <div className={`flex items-center p-2.5 rounded-lg border ${isMine ? 'bg-blue-600 border-blue-400' : 'bg-gray-50 border-gray-200'}`}>
    {/* Icon File */}
    <div className={`p-2 rounded-full ${isMine ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>
    {/* Info File */}
    <div className="ml-3 flex-1 min-w-0 pr-4">
      <p className="text-sm font-medium truncate">{fileName || "document.pdf"}</p>
      <p className={`text-xs ${isMine ? 'text-blue-200' : 'text-gray-500'}`}>{fileSize || "1.2 MB"}</p>
    </div>
    {/* Download Button */}
    <a href={fileUrl} download target="_blank" rel="noreferrer" className={`shrink-0 p-1.5 rounded-full hover:bg-black/10 transition-colors`}>
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    </a>
  </div>
);

export default FileMessage;
