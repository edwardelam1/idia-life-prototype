import React, { useState, useEffect } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  Star,
  Clock,
  ShoppingCart,
  Camera,
  Sparkles,
  Search,
  Package,
  Store,
  X,
  ChevronRight,
  ImagePlus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

// Updated Business type to include the Hub logo output
type Business = Database["public"]["Tables"]["businesses"]["Row"] & {
  business_locations?: Database["public"]["Tables"]["business_locations"]["Row"][];
  logo_url?: string | null;
};

type Item = {
  id: string;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
  type: "menu" | "inventory";
};

const ShopScreen = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [businessItems, setBusinessItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState<{ item: Item; quantity: number }[]>([]);
  const { toast } = useToast();

  const categories = ["All", "Restaurant", "Retail", "Gym", "Automotive"];

  useEffect(() => {
    fetchMarketplaceData();
  }, []);

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const filtered = businesses.filter(
      (b) =>
        (b.name.toLowerCase().includes(query) || b.business_type.toLowerCase().includes(query)) &&
        (selectedCategory === "All" || b.business_type === selectedCategory),
    );
    setFilteredBusinesses(filtered);
  }, [searchQuery, selectedCategory, businesses]);

  const fetchMarketplaceData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("businesses").select("*, business_locations(*)").order("name");

      if (error) throw error;
      setBusinesses(data || []);
      setFilteredBusinesses(data || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async (businessId: string) => {
    // 1:1 Database Ratio: Fetching live menu and general inventory
    const [menuRes, invRes] = await Promise.all([
      supabase.from("menu_items").select("*").eq("business_id", businessId).eq("is_active", true),
      supabase.from("inventory_items").select("*").eq("business_id", businessId).eq("is_active", true),
    ]);

    const items: Item[] = [
      ...(menuRes.data || []).map((i) => ({
        id: i.id,
        name: i.name,
        price: i.base_price,
        description: i.description || "",
        image_url: i.image_url || "",
        type: "menu" as const,
      })),
      ...(invRes.data || []).map((i) => ({
        id: i.id,
        name: i.name,
        price: i.current_cost || 0,
        type: "inventory" as const,
      })),
    ];
    setBusinessItems(items);
  };

  const addToCart = (item: Item) => {
    setCart((prev) => [...prev, { item, quantity: 1 }]);
    toast({ title: "Live Order Updated", description: `${item.name} added to session.` });
  };

  if (loading)
    return (
      <div className="p-8 animate-pulse grid grid-cols-4 gap-4">
        <div className="aspect-square bg-muted rounded-2xl" />
      </div>
    );

  return (
    <div className="space-y-6 bg-white min-h-screen pb-20">
      {!selectedBusiness ? (
        <div className="animate-fade-in">
          {/* Marketplace Controls */}
          <div className="px-4 space-y-4 pt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search IDIA Marketplace..."
                className="pl-10 h-12 bg-white border-teal-100 shadow-sm rounded-2xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => (
                <Badge
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  className={`cursor-pointer px-4 py-1.5 whitespace-nowrap transition-all border-teal-50 ${
                    selectedCategory === cat ? "bg-teal-600 text-white" : "bg-white text-muted-foreground"
                  }`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </div>

          {/* High-Density Square Grid (4 Columns) */}
          <div className="px-4 mt-4 overflow-y-auto max-h-[480px] scrollbar-hide">
            <div className="grid grid-cols-4 gap-x-3 gap-y-6">
              {filteredBusinesses.map((business) => (
                <div
                  key={business.id}
                  className="flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                  onClick={() => {
                    setSelectedBusiness(business);
                    fetchInventory(business.id);
                  }}
                >
                  {/* Square Image Output from IDIA Hub */}
                  <div className="aspect-square w-full rounded-2xl bg-muted/20 border border-teal-50/50 flex items-center justify-center shadow-sm overflow-hidden bg-white">
                    {business.logo_url ? (
                      <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 opacity-20">
                        <ImagePlus size={16} className="text-teal-600" />
                        <span className="text-[6px] font-bold uppercase tracking-tighter">Hub Asset Pending</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] font-black text-foreground text-center truncate w-full px-0.5 uppercase tracking-tighter">
                    {business.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Expanded Business Detail View */
        <div className="animate-in slide-in-from-right duration-300">
          <div className="p-4 bg-white sticky top-0 z-10 border-b flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setSelectedBusiness(null)}>
              <X className="h-6 w-6" />
            </Button>
            <h2 className="font-black text-sm uppercase tracking-tighter text-teal-700">{selectedBusiness.name}</h2>
            <div className="relative">
              <ShoppingCart className="h-6 w-6 text-orange-500" />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-teal-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </div>
          </div>

          <div className="p-4 space-y-6">
            {/* Business Profile Card */}
            <div className="rounded-[2rem] bg-gradient-to-br from-teal-600 to-teal-800 p-6 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10 flex gap-4">
                {/* 1:1 Image Display from Hub */}
                <div className="w-20 h-20 bg-white rounded-3xl overflow-hidden shadow-inner flex items-center justify-center border-4 border-white/10 shrink-0">
                  {selectedBusiness.logo_url ? (
                    <img
                      src={selectedBusiness.logo_url}
                      alt={selectedBusiness.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Store size={32} className="text-teal-600 opacity-20" />
                  )}
                </div>
                <div className="flex flex-col justify-center space-y-1">
                  <h1 className="text-xl font-black uppercase tracking-tight">{selectedBusiness.name}</h1>
                  <Badge className="bg-orange-500 text-white border-none text-[9px] w-fit">IDIA ENTERPRISE</Badge>
                  <p className="text-[11px] opacity-80 flex items-center gap-1">
                    <MapPin size={10} /> {selectedBusiness.business_locations?.[0]?.address || "Sovereign Node"}
                  </p>
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-orange-400/20 rounded-full blur-3xl" />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Sovereign Inventory
                </h3>
                <Badge variant="outline" className="text-[8px] border-teal-100 text-teal-600 font-bold uppercase">
                  1:1 Real-time Sync
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {businessItems.map((item) => (
                  <Card
                    key={item.id}
                    className="overflow-hidden border-teal-50 bg-white shadow-sm rounded-2xl group hover:border-teal-200 transition-all"
                  >
                    <div className="aspect-square bg-muted/10 flex items-center justify-center relative">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="h-8 w-8 text-teal-600 opacity-10" />
                      )}
                      <Button
                        size="sm"
                        className="absolute bottom-2 right-2 h-8 w-8 p-0 rounded-full bg-orange-500 hover:bg-orange-600 shadow-md border-none"
                        onClick={() => addToCart(item)}
                      >
                        +
                      </Button>
                    </div>
                    <CardContent className="p-3">
                      <h4 className="font-bold text-[11px] line-clamp-1 uppercase text-foreground">{item.name}</h4>
                      <p className="text-sm font-black text-teal-700">${item.price.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopScreen;
