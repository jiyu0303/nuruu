import React from 'react';

export const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: (val: boolean, e?: React.MouseEvent) => void }) => (
  <button
    onClick={(e) => onChange(!enabled, e)}
    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
      enabled ? 'bg-emerald-600' : 'bg-stone-200'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        enabled ? 'translate-x-4' : 'translate-x-0'
      }`}
    />
  </button>
);
