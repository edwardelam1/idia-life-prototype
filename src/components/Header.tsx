
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileMenu from './ProfileMenu';

const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-gray-200 px-2 py-2 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <img 
          src="/lovable-uploads/a1fcabab-f9bb-4a81-9b30-10d1aab93545.png" 
          alt="IDIA Life" 
          className="h-6 w-6"
        />
        <h1 className="text-lg font-bold text-gray-900">IDIA Life</h1>
      </div>
      <ProfileMenu />
    </header>
  );
};

export default Header;
