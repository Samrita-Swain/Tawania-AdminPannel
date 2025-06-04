"use client";

import React, { useState, useEffect, createContext, useContext, useCallback, ReactNode } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, AlertCircle, Info, XCircle } from "lucide-react";
import { ClientOnly } from "@/components/client-only";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface NotificationProps {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

export function Notification({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose(id), 300); // Wait for animation to complete
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, id, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300); // Wait for animation to complete
  };

  const bgColor = {
    success: "bg-green-50",
    error: "bg-red-50",
    warning: "bg-yellow-50",
    info: "bg-blue-50",
  }[type];

  const textColor = {
    success: "text-green-800",
    error: "text-red-800",
    warning: "text-yellow-800",
    info: "text-blue-800",
  }[type];

  const borderColor = {
    success: "border-green-200",
    error: "border-red-200",
    warning: "border-yellow-200",
    info: "border-blue-200",
  }[type];

  const iconColor = {
    success: "text-green-500",
    error: "text-red-500",
    warning: "text-yellow-500",
    info: "text-blue-500",
  }[type];

  const Icon = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertCircle,
    info: Info,
  }[type];

  return (
    <div
      className={`transform transition-all duration-300 ease-in-out ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div
        className={`mb-4 w-full max-w-sm overflow-hidden rounded-lg border ${borderColor} ${bgColor} shadow-lg`}
      >
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Icon className={`h-5 w-5 ${iconColor}`} aria-hidden="true" />
            </div>
            <div className="ml-3 w-0 flex-1 pt-0.5">
              <p className={`text-sm font-medium ${textColor}`}>{title}</p>
              <p className={`mt-1 text-sm ${textColor}`}>{message}</p>
            </div>
            <div className="ml-4 flex flex-shrink-0">
              <button
                type="button"
                className={`inline-flex rounded-md ${bgColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                onClick={handleClose}
              >
                <span className="sr-only">Close</span>
                <XCircle className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface NotificationContainerProps {
  notifications: NotificationProps[];
  onClose: (id: string) => void;
}

export function NotificationContainer({
  notifications,
  onClose,
}: NotificationContainerProps) {
  // We're using ClientOnly so we know we're on the client
  return createPortal(
    <div className="fixed right-0 top-0 z-50 m-4 flex max-h-screen flex-col items-end space-y-4 overflow-y-auto">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          {...notification}
          onClose={onClose}
        />
      ))}
    </div>,
    document.body
  );
}

// Create a notification context

interface NotificationContextType {
  showNotification: (
    type: NotificationType,
    title: string,
    message: string,
    duration?: number
  ) => string;
  hideNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  // State for notifications
  const [notifications, setNotifications] = useState<NotificationProps[]>([]);

  // Function to hide a notification
  const hideNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  const showNotification = useCallback(
    (
      type: NotificationType,
      title: string,
      message: string,
      duration = 5000
    ) => {
      const id = Math.random().toString(36).substring(2, 9);

      setNotifications((prev) => [
        ...prev,
        { id, type, title, message, duration, onClose: hideNotification },
      ]);

      return id;
    },
    [hideNotification]
  );

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification }}>
      {children}
      <ClientOnly>
        <NotificationContainer
          notifications={notifications}
          onClose={hideNotification}
        />
      </ClientOnly>
    </NotificationContext.Provider>
  );
}
