import React, { createContext, useContext, useMemo, useState } from "react";

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [contactBadgeCount, setContactBadgeCount] = useState(0);

  const value = useMemo(
    () => ({
      contactBadgeCount,
      setContactBadgeCount,
    }),
    [contactBadgeCount],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error("useNotification must be used inside NotificationProvider");
  }

  return context;
};
