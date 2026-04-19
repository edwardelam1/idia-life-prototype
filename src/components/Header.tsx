import { useNavigate } from "react-router-dom";
import polishedLogo from "@/assets/IDIA_Life_Logo_Polished.png";

const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 bg-background border-b border-border px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] flex items-center justify-between z-40">
      <div className="flex items-center space-x-2">
        <img src={polishedLogo} alt="IDIA Life" className="h-6 w-6" />
        <h1 className="text-lg font-bold text-foreground">IDIA Life</h1>
      </div>
      {/* ProfileMenu removed to restrict access to settings and profile details */}
    </header>
  );
};

export default Header;
