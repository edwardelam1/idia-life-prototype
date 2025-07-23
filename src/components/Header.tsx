
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileMenu from './ProfileMenu';

const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-[9999] bg-white shadow-sm border-b border-gray-200 backdrop-blur-sm bg-white/95">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-12">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img 
              src="/lovable-uploads/a1fcabab-f9bb-4a81-9b30-10d1aab93545.png" 
              alt="IDIA Life Logo" 
              className="w-6 h-6 rounded-lg"
            />
            <h1 className="text-lg font-bold text-gray-900">IDIA Life</h1>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <ProfileMenu />
          </div>

          {/* Mobile profile menu */}
          <div className="md:hidden">
            <ProfileMenu />
          </div>
        </div>

      </div>
    </header>
  );
};

export default Header;
