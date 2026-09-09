"use client";

import React, { useState } from "react";

export default function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);

  return (
    <span className="relative inline-flex items-center ml-1">
      <button
        type="button"
        aria-label={text}
        onClick={() => setShow((s) => !s)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onBlur={() => setShow(false)}
        className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold leading-none text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
      >
        ?
      </button>
      {show && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg bg-gray-800 p-2 text-xs leading-snug text-white shadow-lg dark:bg-gray-700"
        >
          {text}
        </span>
      )}
    </span>
  );
}
