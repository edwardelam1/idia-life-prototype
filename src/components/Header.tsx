
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileMenu from './ProfileMenu';

const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 bg-background border-b border-border px-2 py-2 flex items-center justify-between z-40">
      <div className="flex items-center space-x-2">
        <img 
          src="/lovable-uploads/a1fcabab-f9bb-4a81-9b30-10d1aab93545.png" 
          alt="IDIA Life" 
          className="h-6 w-6"
        />
        <h1 className="text-lg font-bold text-foreground">IDIA Life</h1>
      </div>
      <ProfileMenu />
    </header>
  );
};

export default Header;
