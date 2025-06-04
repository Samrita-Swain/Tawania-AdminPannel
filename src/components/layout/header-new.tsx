"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export function Header() {
  const { data: session } = useSession();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <header className="flex h-14 items-center gap-4 border-b border-gray-200 bg-gradient-to-r from-gray-900 to-black px-4 lg:px-6 text-white">
      <div className="flex flex-1 items-center justify-end gap-4">
        <button
          onClick={() => {
            setIsNotificationsOpen(!isNotificationsOpen);
            if (isProfileOpen) setIsProfileOpen(false);
          }}
          className="relative rounded-full p-1 hover:bg-white/10 text-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
            />
          </svg>
          <span className="absolute right-0 top-0 flex h-2 w-2 rounded-full bg-red-400"></span>
          {isNotificationsOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-80 rounded-lg border border-gray-700 bg-gray-800 shadow-lg text-white">
              <div className="p-2">
                <h3 className="mb-2 text-sm font-semibold">Notifications</h3>
                <div className="space-y-2">
                  <div className="rounded-md p-2 hover:bg-gray-700">
                    <p className="text-sm text-white">New transfer request from Main Store</p>
                    <p className="text-xs text-gray-800">2 minutes ago</p>
                  </div>
                  <div className="rounded-md p-2 hover:bg-gray-700">
                    <p className="text-sm text-white">Low stock alert: Smartphone X</p>
                    <p className="text-xs text-gray-800">1 hour ago</p>
                  </div>
                  <div className="rounded-md p-2 hover:bg-gray-700">
                    <p className="text-sm text-white">Audit #AUD-2023-001 completed</p>
                    <p className="text-xs text-gray-800">Yesterday</p>
                  </div>
                </div>
                <div className="mt-2 border-t border-gray-700 pt-2">
                  <Link
                    href="/notifications"
                    className="block text-center text-sm text-blue-400 hover:underline"
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            </div>
          )}
        </button>
        <div className="relative">
          <button
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              if (isNotificationsOpen) setIsNotificationsOpen(false);
            }}
            className="flex items-center gap-2 rounded-full p-1 hover:bg-white/10"
          >
            <span className="hidden text-sm font-medium md:block text-white">
              {session?.user?.name || "User"}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-medium uppercase text-white">
              {session?.user?.name?.[0] || "U"}
            </span>
          </button>
          {isProfileOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-64 rounded-lg border border-gray-700 bg-gray-800 shadow-lg text-white">
              <div className="p-2">
                <div className="mb-2 rounded-md p-2">
                  <p className="font-medium text-white">{session?.user?.name || "User"}</p>
                  <p className="text-sm text-gray-800">{session?.user?.email}</p>
                  <p className="mt-1 text-xs text-gray-800">
                    Role: {session?.user?.role || "User"}
                  </p>
                </div>
                <div className="border-t border-gray-700">
                  <Link
                    href="/profile"
                    className="block rounded-md p-2 text-sm hover:bg-gray-700"
                  >
                    Profile Settings
                  </Link>
                  <Link
                    href="/auth/logout"
                    className="block rounded-md p-2 text-sm text-red-400 hover:bg-gray-700"
                  >
                    Logout
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

