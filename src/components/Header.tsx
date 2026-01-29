
import ProfileMenu from './ProfileMenu';

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 header-glass px-4 py-3 flex items-center justify-between z-40">
      {/* Holographic edge highlight */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      <div className="flex items-center space-x-3">
        {/* Logo with glow effect */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full" />
          <img 
            src="/lovable-uploads/a1fcabab-f9bb-4a81-9b30-10d1aab93545.png" 
            alt="IDIA Life" 
            className="h-8 w-8 relative z-10"
          />
        </div>
        <h1 className="text-lg font-bold text-foreground text-glow">IDIA Life</h1>
      </div>
      <ProfileMenu />
    </header>
  );
};

export default Header;
