"use client";

import { useState } from "react";
import { Share2, Link, Check, X, Facebook, Mail } from "lucide-react";

interface SocialShareButtonsProps {
  url: string;
  title: string;
  description?: string;
  image?: string;
  className?: string;
  variant?: "icons" | "buttons" | "dropdown";
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 0C5.372 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const SHARE_PLATFORMS = [
  {
    name: "Twitter",
    icon: TwitterIcon,
    getUrl: (url: string, title: string) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    color: "hover:bg-black hover:text-white",
    bgColor: "bg-black",
  },
  {
    name: "Facebook",
    icon: Facebook,
    getUrl: (url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    color: "hover:bg-[#1877F2] hover:text-white",
    bgColor: "bg-[#1877F2]",
  },
  {
    name: "Pinterest",
    icon: PinterestIcon,
    getUrl: (url: string, title: string, _description?: string, image?: string) =>
      `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(title)}${image ? `&media=${encodeURIComponent(image)}` : ""}`,
    color: "hover:bg-[#E60023] hover:text-white",
    bgColor: "bg-[#E60023]",
  },
  {
    name: "WhatsApp",
    icon: WhatsAppIcon,
    getUrl: (url: string, title: string) =>
      `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    color: "hover:bg-[#25D366] hover:text-white",
    bgColor: "bg-[#25D366]",
  },
  {
    name: "Email",
    icon: Mail,
    getUrl: (url: string, title: string, description?: string) =>
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${description || title}\n\n${url}`)}`,
    color: "hover:bg-gray-700 hover:text-white",
    bgColor: "bg-gray-700",
  },
];

export function SocialShareButtons({
  url,
  title,
  description,
  image,
  className = "",
  variant = "icons",
}: SocialShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = (getUrl: (url: string, title: string, desc?: string, img?: string) => string) => {
    const shareUrl = getUrl(url, title, description, image);
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=400");
    setIsDropdownOpen(false);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title,
          text: description || title,
          url,
        });
      } catch {
        // User cancelled or share failed
      }
    }
  };

  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  // Icons variant - simple row of icons
  if (variant === "icons") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {SHARE_PLATFORMS.map((platform) => (
          <button
            key={platform.name}
            onClick={() => handleShare(platform.getUrl)}
            className={`p-2 rounded-full border border-gray-200 text-gray-600 transition-colors ${platform.color}`}
            aria-label={`Share on ${platform.name}`}
          >
            <platform.icon className="h-4 w-4" />
          </button>
        ))}
        <button
          onClick={handleCopyLink}
          className={`p-2 rounded-full border transition-colors ${
            copied
              ? "border-green-500 bg-green-50 text-green-600"
              : "border-gray-200 text-gray-600 hover:bg-gray-100"
          }`}
          aria-label="Copy link"
        >
          {copied ? <Check className="h-4 w-4" /> : <Link className="h-4 w-4" />}
        </button>
      </div>
    );
  }

  // Buttons variant - larger buttons with labels
  if (variant === "buttons") {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        {SHARE_PLATFORMS.slice(0, 4).map((platform) => (
          <button
            key={platform.name}
            onClick={() => handleShare(platform.getUrl)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${platform.bgColor} text-white text-sm font-medium transition-opacity hover:opacity-90`}
          >
            <platform.icon className="h-4 w-4" />
            {platform.name}
          </button>
        ))}
        <button
          onClick={handleCopyLink}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            copied
              ? "bg-green-500 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          {copied ? <Check className="h-4 w-4" /> : <Link className="h-4 w-4" />}
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>
    );
  }

  // Dropdown variant - single share button with dropdown
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => {
          if (canNativeShare) {
            handleNativeShare();
          } else {
            setIsDropdownOpen(!isDropdownOpen);
          }
        }}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Share2 className="h-4 w-4" />
        <span className="text-sm font-medium">Share</span>
      </button>

      {isDropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsDropdownOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl bg-white shadow-lg border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Share via
            </div>
            {SHARE_PLATFORMS.map((platform) => (
              <button
                key={platform.name}
                onClick={() => handleShare(platform.getUrl)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <platform.icon className="h-5 w-5" />
                {platform.name}
              </button>
            ))}
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={() => {
                handleCopyLink();
                setTimeout(() => setIsDropdownOpen(false), 1000);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Link className="h-5 w-5" />
                  Copy Link
                </>
              )}
            </button>
            <button
              onClick={() => setIsDropdownOpen(false)}
              className="absolute right-2 top-2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
