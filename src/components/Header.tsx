
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X, Wallet, TestTube } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProfileMenu from './ProfileMenu';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">IDIA Life</h1>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/pipeline-test')}
              className="flex items-center space-x-2"
            >
              <TestTube className="w-4 h-4" />
              <span>Test Pipeline</span>
            </Button>
            <ProfileMenu />
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            <ProfileMenu />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-3 border-t border-gray-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigate('/pipeline-test');
                setIsMenuOpen(false);
              }}
              className="w-full flex items-center justify-center space-x-2"
            >
              <TestTube className="w-4 h-4" />
              <span>Test Pipeline</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
