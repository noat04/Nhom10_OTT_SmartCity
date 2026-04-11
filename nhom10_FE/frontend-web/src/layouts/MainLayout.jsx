// src/layouts/MainLayout.jsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useMessage } from '../hooks/useMessage'; 
import IncomingCallModal from '../components/modals/IncomingCallModal';

const MainLayout = ({ children }) => {
  useMessage(); 
  const [incomingCall, setIncomingCall] = useState(null); 

  const handleAcceptCall = () => setIncomingCall(null);
  const handleDeclineCall = () => setIncomingCall(null);

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans text-gray-900">
      
      {/* QUAN TRỌNG: Chỉ để {children} ở đây, KHÔNG GỌI <Sidebar /> */}
      {children || <Outlet />}

      <IncomingCallModal 
        isOpen={!!incomingCall}
        callerName={incomingCall?.callerName}
        callerAvatar={incomingCall?.callerAvatar}
        isVideoCall={incomingCall?.isVideoCall}
        onAccept={handleAcceptCall}
        onDecline={handleDeclineCall}
      />
    </div>
  );
};

export default MainLayout;