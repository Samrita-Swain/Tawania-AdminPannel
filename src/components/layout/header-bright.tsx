"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useSidebarStore } from "@/store/sidebar-store";

export function Header() {
  const { data: session } = useSession();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { isOpen, toggle } = useSidebarStore();

  return (
    <header className="flex h-14 items-center gap-2 sm:gap-4 border-b border-gray-200 bg-white px-2 sm:px-4 lg:px-6">
      <div className="flex items-center">
        {/* Logo visible only on mobile, positioned next to hamburger */}
        <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
          <Image
            src="/tawanialogo.jpg"
            alt="Tawania Smart Bazar"
            width={80}
            height={26}
            className="rounded-md ml-12"
          />
        </Link>
      </div>
      <div className="flex flex-1 items-center justify-end gap-2 sm:gap-4">
        <button
          onClick={() => {
            setIsNotificationsOpen(!isNotificationsOpen);
            if (isProfileOpen) setIsProfileOpen(false);
          }}
          className="relative rounded-full p-1 hover:bg-gray-100 text-gray-800"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-5 w-5 sm:h-6 sm:w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
            />
          </svg>
          <span className="absolute right-0 top-0 flex h-2 w-2 rounded-full bg-red-500"></span>
          {isNotificationsOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-72 sm:w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
              <div className="p-2">
                <h3 className="mb-2 text-sm font-semibold">Notifications</h3>
                <div className="space-y-2">
                  <div className="rounded-md p-2 hover:bg-gray-50">
                    <p className="text-sm">New transfer request from Main Store</p>
                    <p className="text-xs text-gray-800">2 minutes ago</p>
                  </div>
                  <div className="rounded-md p-2 hover:bg-gray-50">
                    <p className="text-sm">Low stock alert: Smartphone X</p>
                    <p className="text-xs text-gray-800">1 hour ago</p>
                  </div>
                  <div className="rounded-md p-2 hover:bg-gray-50">
                    <p className="text-sm">Audit #AUD-2023-001 completed</p>
                    <p className="text-xs text-gray-800">Yesterday</p>
                  </div>
                </div>
                <div className="mt-2 border-t border-gray-200 pt-2">
                  <Link
                    href="/notifications"
                    className="block text-center text-sm text-blue-600 hover:underline"
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
            className="flex items-center gap-1 sm:gap-2 rounded-full p-1 hover:bg-gray-100"
          >
            <span className="hidden text-sm font-medium sm:block text-gray-800">
              {session?.user?.name || "User"}
            </span>
            <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-xs sm:text-sm font-medium uppercase text-white">
              {session?.user?.name?.[0] || "U"}
            </span>
          </button>
          {isProfileOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-56 sm:w-64 rounded-lg border border-gray-200 bg-white shadow-lg">
              <div className="p-2">
                <div className="mb-2 rounded-md p-2">
                  <p className="font-medium text-sm sm:text-base">{session?.user?.name || "User"}</p>
                  <p className="text-xs sm:text-sm text-gray-800 truncate">{session?.user?.email}</p>
                  <p className="mt-1 text-xs text-gray-800">
                    Role: {session?.user?.role || "User"}
                  </p>
                </div>
                <div className="border-t border-gray-200">
                  <Link
                    href="/profile"
                    className="block rounded-md p-2 text-sm hover:bg-gray-50"
                  >
                    Profile Settings
                  </Link>
                  <Link
                    href="/auth/logout"
                    className="block rounded-md p-2 text-sm text-red-600 hover:bg-red-50"
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
