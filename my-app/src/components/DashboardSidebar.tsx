import { FileText, Home, MessageSquare, Upload, User } from "lucide-react";
import { Button } from "./ui/button";
import Image from "next/image";

interface DashboardSidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  userName: string;
  userAvatar: string;
  rewardPoints?: number;
}

export function DashboardSidebar({
  activePage,
  onNavigate,
  userName,
  userAvatar,
  rewardPoints = 0
}: DashboardSidebarProps) {
  const navItems = [
    {
      icon: <Home className="w-5 h-5" />,
      label: "Home",
      value: "home"
    },
    {
      icon: <FileText className="w-5 h-5" />,
      label: "Read PDF",
      value: "readPDF"
    },
    {
      icon: <MessageSquare className="w-5 h-5" />,
      label: "Chat",
      value: "chat"
    },
    {
      icon: <Upload className="w-5 h-5" />,
      label: "Upload Files",
      value: "upload"
    },
    {
      icon: <User className="w-5 h-5" />,
      label: "Profile",
      value: "profile"
    }
  ];

  return (
    <div className="bg-white border-r border-gray-200 w-64 p-4 flex flex-col h-full">
      <div className="flex items-center mb-8">
        <Image
          src="/logo.svg"
          alt="Logo"
          width={32}
          height={32}
          className="mr-2"
        />
        <h1 className="text-xl font-bold text-[#2BAC3E]">DocumentAI</h1>
      </div>

      <div className="space-y-1">
        {navItems.map((item) => (
          <Button
            key={item.value}
            variant={activePage === item.value ? "default" : "ghost"}
            className={`w-full justify-start ${
              activePage === item.value 
                ? "bg-[#2BAC3E] hover:bg-[#1F8A2F] text-white" 
                : "text-gray-600"
            }`}
            onClick={() => onNavigate(item.value)}
          >
            {item.icon}
            <span className="ml-2">{item.label}</span>
          </Button>
        ))}
      </div>

      <div className="mt-auto pt-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {userAvatar ? (
              <Image
                src={userAvatar}
                alt={userName}
                width={40}
                height={40}
              />
            ) : (
              <User className="w-5 h-5 text-gray-500" />
            )}
          </div>
          <div className="ml-2">
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs text-gray-500">{rewardPoints} points</p>
          </div>
        </div>
      </div>
    </div>
  );
} 