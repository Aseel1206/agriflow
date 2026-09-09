import React from "react";

export default function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-300 py-10 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
      {message}
    </div>
  );
}
