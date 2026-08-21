import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';

export const SectionNameEditor = ({ initialName, defaultName, onSave }: { initialName: string, defaultName: string, onSave: (name: string) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialName);

  useEffect(() => {
    setValue(initialName);
  }, [initialName]);

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 w-48">
        <input 
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === 'Enter') {
              onSave(value);
              setIsEditing(false);
            } else if (e.key === 'Escape') {
              setValue(initialName);
              setIsEditing(false);
            }
          }}
          autoFocus
          placeholder={defaultName}
          className="bg-black/20 border border-white/20 rounded px-2 py-0.5 text-xs font-bold text-white outline-none placeholder:text-white/30 flex-1 min-w-0"
        />
        <button 
          onClick={() => {
            onSave(value);
            setIsEditing(false);
          }}
          className="bg-white/20 hover:bg-white/30 text-white rounded p-1 transition-colors shrink-0 flex items-center justify-center"
          title="확인"
        >
          <Check className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div 
      className="cursor-pointer text-xs font-bold text-white w-48 truncate flex items-center h-[22px]"
      onClick={() => {
        setValue(initialName);
        setIsEditing(true);
      }}
      title="클릭하여 이름 수정"
    >
      {initialName || <span className="text-white/30">{defaultName}</span>}
    </div>
  );
};
