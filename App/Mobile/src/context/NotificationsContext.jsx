import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const NotificationsContext = createContext(null);

const MAX_ITEMS = 20;

export function NotificationsProvider({ children }) {
  const [items, setItems] = useState([]);
  const [unseenCount, setUnseenCount] = useState(0);

  const pushNotification = useCallback((entry) => {
    setItems(prev => [
      { id: `${entry.job_id}-${Date.now()}`, createdAt: new Date().toISOString(), ...entry },
      ...prev,
    ].slice(0, MAX_ITEMS));
    setUnseenCount(prev => prev + 1);
  }, []);

  const markAllSeen = useCallback(() => {
    setUnseenCount(0);
  }, []);

  const value = useMemo(
    () => ({ items, unseenCount, pushNotification, markAllSeen }),
    [items, unseenCount, pushNotification, markAllSeen]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications debe usarse dentro de NotificationsProvider');
  }
  return ctx;
}
