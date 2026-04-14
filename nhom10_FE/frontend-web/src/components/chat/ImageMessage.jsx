const ImageMessage = ({ url, onImageClick }) => (
  <div className="relative group cursor-pointer" onClick={() => onImageClick(url)}>
    <img 
      src={url} 
      alt="Sent media" 
      className="rounded-lg max-w-full h-auto max-h-64 object-cover transition-transform duration-200 group-hover:opacity-90"
    />
    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 rounded-lg">
      {/* Icon phóng to (Phục vụ cho Lightbox sau này) */}
      <svg className="w-8 h-8 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
      </svg>
    </div>
  </div>
);

export default ImageMessage;