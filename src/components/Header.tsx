
import { User, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Header = () => {
  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img 
            src="/lovable-uploads/a1fcabab-f9bb-4a81-9b30-10d1aab93545.png" 
            alt="IDIA Life" 
            className="w-8 h-8 rounded-lg"
          />
          <div>
            <h1 className="text-lg font-bold text-gray-900">IDIA Life</h1>
            <p className="text-xs text-gray-500">Enterprise Edition</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Friend AI Assistant */}
          <Button 
            size="sm" 
            variant="outline" 
            className="rounded-full p-2 border-teal-200 text-teal-600 hover:bg-teal-50"
          >
            <MessageCircle className="w-4 h-4" />
          </Button>

          {/* Profile Button */}
          <Button 
            size="sm" 
            variant="outline" 
            className="rounded-full p-2 border-gray-200 hover:bg-gray-50"
          >
            <User className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
