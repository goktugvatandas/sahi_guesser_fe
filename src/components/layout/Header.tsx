import { AnimatePresence, motion } from "framer-motion";
import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  Car,
  HelpCircle,
  Home,
  Info,
  LogIn,
  LogOut,
  Menu,
  ShoppingBag,
  UserPlus,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { announcementApi } from "../../services/api";
import { socketService } from "../../services/socket";
import { useAnnouncementStore } from "../../store/announcementStore";
import { useGameStore } from "../../store/gameStore";
import { ScoreBoard } from "../ScoreBoard";
import { Timer } from "../Timer";

const AnimatedIcons = () => {
  const [currentIcon, setCurrentIcon] = React.useState(0);
  const icons = [
    { component: Home, key: "home" },
    { component: Car, key: "car" },
    { component: ShoppingBag, key: "letgo" },
    { component: HelpCircle, key: "help" },
  ];
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIcon((prev) => (prev + 1) % icons.length);
    }, 1500); // Switch every 2 seconds

    return () => clearInterval(interval);
  }, [icons.length]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={icons[currentIcon].key}
        initial={{ opacity: 0, scale: 0.2 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.2 }}
        transition={{ duration: 0.3 }}
      >
        {React.createElement(icons[currentIcon].component, {
          className: "text-yellow-100",
          size: 32,
        })}
      </motion.div>
    </AnimatePresence>
  );
};

interface HeaderProps {
  onOpenAuth: (type: "login" | "register") => void;
}

const getAnnouncementIcon = (type: "info" | "warning" | "error") => {
  switch (type) {
    case "warning":
      return <AlertTriangle className="text-yellow-500" size={20} />;
    case "error":
      return <AlertOctagon className="text-red-500" size={20} />;
    default:
      return <Info className="text-blue-500" size={20} />;
  }
};

const getAnnouncementColors = (type: "info" | "warning" | "error") => {
  switch (type) {
    case "warning":
      return {
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        hover: "hover:bg-yellow-100",
      };
    case "error":
      return {
        bg: "bg-red-50",
        border: "border-red-200",
        hover: "hover:bg-red-100",
      };
    default:
      return {
        bg: "bg-blue-50",
        border: "border-blue-200",
        hover: "hover:bg-blue-100",
      };
  }
};

export const Header: React.FC<HeaderProps> = ({ onOpenAuth }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { status, currentListing, roundStartTime, roundDuration, roomId } =
    useGameStore();
  const [timeLeft, setTimeLeft] = useState<number>(roundDuration);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const navigate = useNavigate();
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const { announcements, readAnnouncementIds, markAsRead, getUnreadCount } =
    useAnnouncementStore();

  useEffect(() => {
    let intervalId: number;

    if (currentListing && roundStartTime) {
      const roundEndTime = new Date(roundStartTime.getTime() + roundDuration);

      const updateTimer = () => {
        const now = new Date();
        const remaining = Math.max(0, roundEndTime.getTime() - now.getTime());

        setTimeLeft(Math.floor(remaining / 1000));

        if (remaining <= 0) {
          window.clearInterval(intervalId);
        }
      };

      // Update immediately and then every second
      updateTimer();
      intervalId = window.setInterval(updateTimer, 1000);
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [currentListing, roundStartTime, roundDuration]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const announcements = await announcementApi.getAll();
        useAnnouncementStore.getState().setAnnouncements(
          announcements.map((announcement) => ({
            id: announcement.id.toString(),
            title: announcement.title,
            content: announcement.content,
            type: announcement.type,
            createdAt: new Date(announcement.createdAt),
          }))
        );
      } catch (error) {
        console.error("Failed to fetch announcements:", error);
      }
    };

    fetchAnnouncements();
  }, []);

  const handleLeaveRoom = () => {
    if (roomId) {
      socketService.leaveRoom(roomId);
    }
    navigate("/");
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    window.location.reload();
  };

  const renderAnnouncementDropdown = () => (
    <div className="absolute top-full right-0 mt-2 bg-white shadow-lg rounded-lg py-2 w-96 max-h-[32rem] overflow-y-auto z-50">
      <div className="px-4 py-2 border-b border-gray-200">
        <h3 className="font-semibold text-gray-700">Announcements</h3>
      </div>
      {announcements.length > 0 ? (
        announcements.map((announcement) => {
          const colors = getAnnouncementColors(announcement.type);
          const isRead = readAnnouncementIds.includes(announcement.id);

          return (
            <div
              key={announcement.id}
              className={`p-4 border-b last:border-b-0 ${
                isRead ? "opacity-75" : ""
              } ${colors.bg} ${colors.border} transition-colors`}
            >
              <div className="flex items-start gap-3">
                {getAnnouncementIcon(announcement.type)}
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">
                    {announcement.title}
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {announcement.content}
                  </p>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-xs text-gray-500">
                      {new Date(announcement.createdAt).toLocaleDateString(
                        "tr-TR",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </span>
                    {!isRead && (
                      <button
                        onClick={() => markAsRead(announcement.id)}
                        className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="p-8 text-center text-gray-500">
          <Bell className="mx-auto mb-2 text-gray-400" size={24} />
          <p>No announcements yet</p>
        </div>
      )}
    </div>
  );

  return (
    <>
      <header className="bg-yellow-400 p-4 shadow-md relative">
        <div
          className="mx-auto flex items-center justify-between"
          style={{ maxWidth: "95rem" }}
        >
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => handleLeaveRoom()}
          >
            <div className="flex items-center gap-4">
              <AnimatedIcons />
            </div>
            <h1
              className={`${
                isMobile ? "text-xl" : "text-2xl"
              } font-bold text-white`}
              style={{
                textShadow: "0 0 3px rgba(255, 255, 255, 0.3)",
              }}
            >
              sahi kaca?
            </h1>
          </div>

          {isMobile ? (
            <div className="flex items-center gap-2">
              {currentListing && roundStartTime && status === "PLAYING" && (
                <div className="mr-2">
                  <Timer timeLeft={timeLeft} />
                </div>
              )}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="text-white"
              >
                <Menu size={24} />
              </button>
              {showMobileMenu && (
                <div className="absolute top-full right-0 mt-2 w-full bg-white shadow-lg rounded-b-lg p-4 z-50">
                  <div className="flex flex-col gap-4">
                    {user && <ScoreBoard totalScore={user.score} />}
                    {user && (
                      <div className="flex flex-col gap-2">
                        <div
                          className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-100 rounded"
                          onClick={() => setShowUserMenu(!showUserMenu)}
                        >
                          <span>
                            Hoşgeldin, <b>{user.username}</b>
                          </span>
                        </div>
                        {showUserMenu && (
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-red-500 p-2 hover:bg-gray-100 rounded"
                          >
                            <LogOut size={20} />
                            <span>Çıkış Yap</span>
                          </button>
                        )}
                      </div>
                    )}
                    {!isAuthenticated && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => onOpenAuth("login")}
                          className="flex items-center gap-2 bg-yellow-400 text-white px-4 py-2 rounded-lg"
                        >
                          <LogIn size={20} />
                          <span>Giriş</span>
                        </button>
                        <button
                          onClick={() => onOpenAuth("register")}
                          className="flex items-center gap-2 bg-yellow-400 text-white px-4 py-2 rounded-lg"
                        >
                          <UserPlus size={20} />
                          <span>Kayıt</span>
                        </button>
                      </div>
                    )}
                    <div className="relative">
                      <button
                        onClick={() => setShowAnnouncements(!showAnnouncements)}
                        className="relative p-2 hover:bg-yellow-500 rounded transition-colors"
                      >
                        <Bell className="text-white" size={24} />
                        {getUnreadCount() > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {getUnreadCount()}
                          </span>
                        )}
                      </button>
                      {showAnnouncements && renderAnnouncementDropdown()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4">
              {currentListing && roundStartTime && status === "PLAYING" && (
                <Timer timeLeft={timeLeft} />
              )}
              {user && <ScoreBoard totalScore={user.score} />}
              {user && (
                <div className="relative">
                  <div
                    className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-yellow-500 transition-colors"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                  >
                    <span className="text-white">
                      Hoşgeldin, <b>{user.username}</b>
                    </span>
                  </div>
                  {showUserMenu && (
                    <div className="absolute top-full right-0 mt-2 bg-white shadow-lg rounded-lg py-2 min-w-[200px] z-50">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 w-full text-left hover:bg-gray-100 text-red-500"
                      >
                        <LogOut size={20} />
                        <span>Çıkış Yap</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              {!isAuthenticated && (
                <div className="flex gap-2">
                  <button
                    onClick={() => onOpenAuth("login")}
                    className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <LogIn size={20} />
                    <span>Giriş</span>
                  </button>
                  <button
                    onClick={() => onOpenAuth("register")}
                    className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <UserPlus size={20} />
                    <span>Kayıt</span>
                  </button>
                </div>
              )}
              <div className="relative">
                <button
                  onClick={() => setShowAnnouncements(!showAnnouncements)}
                  className="relative p-2 hover:bg-yellow-500 rounded transition-colors"
                >
                  <Bell className="text-white" size={24} />
                  {getUnreadCount() > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {getUnreadCount()}
                    </span>
                  )}
                </button>
                {showAnnouncements && renderAnnouncementDropdown()}
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
};
