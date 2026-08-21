import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

export const LogAvatar = React.memo(({ img, theme, avatarSize, hideEmptyAvatars, cropData, excludedCropUrls = [] }: any) => {
  const [hasError, setHasError] = useState(false);
  
  // 현재 이미지가 제외 목록에 있는지 확인
  const isExcluded = excludedCropUrls.includes(img);

  return (
    <div style={{ 
      width: `${avatarSize}px`, height: `${avatarSize}px`, flexShrink: 0, 
      backgroundColor: hideEmptyAvatars ? 'transparent' : (theme === 'dark' ? '#242424' : '#f0f0f0'), 
      borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative'
    }}>
      {img && !hasError ? (
        <img 
          src={img} 
          alt="" 
          style={(cropData && !isExcluded) ? {
            position: 'absolute',
            maxWidth: 'none',
            maxHeight: 'none',
            width: `${100 / cropData.width * 100}%`,
            height: `${100 / cropData.height * 100}%`,
            left: `-${cropData.x / cropData.width * 100}%`,
            top: `-${cropData.y / cropData.height * 100}%`
          } : {
            width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top'
          }}
          onError={() => setHasError(true)}
          referrerPolicy="no-referrer"
        />
      ) : img && hasError ? (
        <div className="text-red-500/40">
          <ImageIcon className="w-4 h-4" />
        </div>
      ) : null}
    </div>
  );
});
