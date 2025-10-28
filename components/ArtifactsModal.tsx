"use client";

import { Artifact } from "@/types";
import { Download, File, FileText, Image as ImageIcon, Video, Music, X } from "lucide-react";
import { useState } from "react";

interface ArtifactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  artifacts: Artifact[];
}

type FilterType = "all" | "documents" | "images" | "code" | "links";

export default function ArtifactsModal({ isOpen, onClose, artifacts }: ArtifactsModalProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  if (!isOpen) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <ImageIcon size={20} className="text-blue-500" />;
    if (fileType.startsWith("video/")) return <Video size={20} className="text-purple-500" />;
    if (fileType.startsWith("audio/")) return <Music size={20} className="text-green-500" />;
    if (fileType.includes("text") || fileType.includes("python") || fileType.includes("javascript")) {
      return <FileText size={20} className="text-orange-500" />;
    }
    return <File size={20} className="text-gray-500" />;
  };

  const handleDownload = (artifact: Artifact) => {
    // Open the storage URL in a new tab to download
    window.open(artifact.storage_url, "_blank");
  };

  const getFileCategory = (fileType: string): FilterType => {
    // Check images/videos/audio first
    if (fileType.startsWith("image/")) return "images";
    if (fileType.startsWith("video/")) return "images";
    if (fileType.startsWith("audio/")) return "images";

    // Check documents before code (PowerPoint, Word, Excel, PDF, etc.)
    if (
      fileType.includes("pdf") ||
      fileType.includes("word") ||
      fileType.includes("document") ||
      fileType.includes("presentation") ||
      fileType.includes("spreadsheet") ||
      fileType.includes("powerpoint") ||
      fileType.includes("excel") ||
      fileType.includes("msword") ||
      fileType.includes("ms-excel") ||
      fileType.includes("ms-powerpoint") ||
      fileType.includes("officedocument") ||
      fileType.includes("opendocument")
    ) {
      return "documents";
    }

    // Check code files (text, scripts, etc.)
    if (
      fileType.includes("text/") ||
      fileType.includes("python") ||
      fileType.includes("javascript") ||
      fileType.includes("typescript") ||
      fileType.includes("json") ||
      fileType.includes("xml") ||
      fileType.includes("html") ||
      fileType.includes("css") ||
      fileType.includes("x-python") ||
      fileType.includes("x-javascript") ||
      fileType.includes("x-sh")
    ) {
      return "code";
    }

    return "documents"; // Default to documents
  };

  const filteredArtifacts = artifacts.filter((artifact) => {
    if (activeFilter === "all") return true;
    return getFileCategory(artifact.file_type) === activeFilter;
  });

  const filterChips: { label: string; value: FilterType }[] = [
    { label: "All", value: "all" },
    { label: "Documents", value: "documents" },
    { label: "Images", value: "images" },
    { label: "Code files", value: "code" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              All files in this task
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Filter Chips */}
          <div className="flex gap-2 px-6 pb-4">
            {filterChips.map((chip) => (
              <button
                key={chip.value}
                onClick={() => setActiveFilter(chip.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeFilter === chip.value
                    ? "bg-black text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredArtifacts && filteredArtifacts.length > 0 ? (
            <div className="space-y-3">
              {filteredArtifacts.map((artifact, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex-shrink-0">
                    {getFileIcon(artifact.file_type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {artifact.file_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatFileSize(artifact.file_size)} • Step {artifact.step_number}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(artifact)}
                    className="flex-shrink-0 p-2 hover:bg-gray-200 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Download file"
                  >
                    <Download size={18} className="text-gray-600" />
                  </button>
                </div>
              ))}
            </div>
          ) : activeFilter === "all" && artifacts.length === 0 ? (
            <div className="text-center py-12">
              <File size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No files available yet</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <File size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                No {activeFilter === "all" ? "" : activeFilter} files found
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

