import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getUnreadNotificationCountAPI } from "../service/notification.api";
import {
  getSocket,
  offNewMessageGlobal,
  offNewNotification,
  onNewMessageGlobal,
  onNewNotification,
} from "../socket/socket";
import { useAuth } from "./authContext";

const NotificationContext = createContext({
  contactBadgeCount: 0,
  setContactBadgeCount: (value) => { },
  chatBadgeCount: 0,
  setChatBadgeCount: (value) => { },
  notificationBadgeCount: 0,
  setNotificationBadgeCount: (value) => { },
  notifications: [],
  setNotifications: (value) => { },
  latestNotification: null,
  setLatestNotification: (value) => { },
});

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [contactBadgeCount, setContactBadgeCount] = useState(0);
  const [chatBadgeCount, setChatBadgeCount] = useState(0);
  const [notificationBadgeCount, setNotificationBadgeCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [latestNotification, setLatestNotification] = useState(null);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setNotificationBadgeCount(0);
      setLatestNotification(null);
      return;
    }

    const loadUnreadCount = async () => {
      try {
        const res = await getUnreadNotificationCountAPI();
        const count =
          res?.data?.unreadCount ?? res?.unreadCount ?? res?.data ?? 0;
        setNotificationBadgeCount(Number(count) || 0);
      } catch (error) {
        console.log("⚠️ loadUnreadCount error:", error?.message || error);
      }
    };

    loadUnreadCount();

    const handleNewNotification = (payload) => {
      const notification = payload?.data || payload;
      if (!notification) return;

      setNotifications((prev) => [notification, ...prev]);
      setNotificationBadgeCount((count) => count + 1);
      setLatestNotification(notification);
      console.log("🔥 New notification received:", notification);
    };

    const handleNewMessage = (payload) => {
      const message = payload?.data || payload;
      if (!message) return;

      setChatBadgeCount((count) => count + 1);
      console.log("🔥 New chat message received:", message);
    };

    let retryInterval = null;
    let attached = false;

    const attachListener = () => {
      const socket = getSocket();
      if (!socket) return false;

      onNewNotification(handleNewNotification);
      onNewMessageGlobal(handleNewMessage);
      attached = true;
      return true;
    };

    if (!attachListener()) {
      retryInterval = setInterval(() => {
        if (attachListener()) {
          clearInterval(retryInterval);
          retryInterval = null;
        }
      }, 300);
    }

    return () => {
      if (retryInterval) {
        clearInterval(retryInterval);
      }
      if (attached) {
        offNewNotification(handleNewNotification);
        offNewMessageGlobal(handleNewMessage);
      }
    };
  }, [user]);

  const value = useMemo(
    () => ({
      contactBadgeCount,
      setContactBadgeCount,
      chatBadgeCount,
      setChatBadgeCount,
      notificationBadgeCount,
      setNotificationBadgeCount,
      notifications,
      setNotifications,
      latestNotification,
      setLatestNotification,
    }),
    [contactBadgeCount, chatBadgeCount, latestNotification, notificationBadgeCount, notifications],
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
