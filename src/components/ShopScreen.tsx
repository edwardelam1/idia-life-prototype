import React, { useState, useEffect } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Star, Clock, ShoppingCart, Search, Package, X, ImagePlus, LayoutGrid } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type Business = Database["public"]["Tables"]["businesses"]["Row"] & {
  business_locations?: Database["public"]["Tables"]["business_locations"]["Row"][];
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
  const [cart, setCart] = useState<{ item: Item; quantity: number }[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchLiveMarketplace();
  }, []);

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const filtered = businesses.filter(
      (b) => b.name.toLowerCase().includes(query) || b.business_type?.toLowerCase().includes(query),
    );
    setFilteredBusinesses(filtered);
  }, [searchQuery, businesses]);

  const fetchLiveMarketplace = async () => {
    try {
      setLoading(true);
      // Fetching live data from the businesses ledger
      const { data, error } = await supabase.from("businesses").select("*, business_locations(*)").order("name");

      if (error) throw error;
      setBusinesses(data || []);
      setFilteredBusinesses(data || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async (businessId: string) => {
    // 1:1 Database Ratio Connection
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
    toast({ title: "Order Synced", description: `${item.name} added to live session.` });
  };

  // Technical Placeholder for pending assets
  const PendingAsset = ({ size = 16, label = "HUB ASSET PENDING" }: { size?: number; label?: string }) => (
    <div className="flex flex-col items-center justify-center gap-1.5 opacity-20 text-center p-2">
      <ImagePlus size={size} className="text-teal-600" />
      <span className="text-[6px] font-black uppercase tracking-tighter leading-none">{label}</span>
    </div>
  );

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
          <div className="px-4 space-y-4 pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search Live IDIA Nodes..."
                className="pl-10 h-12 bg-white border-teal-100 shadow-sm rounded-2xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* High-Density Grid (4x4 Viewport) */}
          <div className="px-4 mt-6 overflow-y-auto max-h-[480px] scrollbar-hide">
            {filteredBusinesses.length === 0 ? (
              <div className="py-20 text-center space-y-2 opacity-30">
                <LayoutGrid className="mx-auto w-12 h-12" />
                <p className="text-[10px] font-bold uppercase tracking-widest">No Active Enterprises in Range</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-x-3 gap-y-8">
                {filteredBusinesses.map((business) => (
                  <div
                    key={business.id}
                    className="flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform"
                    onClick={() => {
                      setSelectedBusiness(business);
                      fetchInventory(business.id);
                    }}
                  >
                    <div className="aspect-square w-full rounded-2xl bg-white border border-teal-50 flex items-center justify-center shadow-sm overflow-hidden transition-all hover:border-teal-300">
                      {business.logo_url ? (
                        <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
                      ) : (
                        <PendingAsset />
                      )}
                    </div>
                    <p className="text-[9px] font-black text-foreground text-center truncate w-full px-0.5 uppercase tracking-tighter">
                      {business.name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Detailed Business Card Interface */
        <div className="animate-in slide-in-from-right duration-300">
          <div className="p-4 bg-white sticky top-0 z-10 border-b flex items-center justify-between border-muted">
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
            {/* Enterprise Business Card */}
            <div className="rounded-[2rem] bg-gradient-to-br from-teal-600 to-teal-800 p-6 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10 flex gap-4">
                {/* 1:1 Logo Slot from Hub */}
                <div className="w-20 h-20 bg-white/10 rounded-3xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-white/20 backdrop-blur-md shrink-0">
                  {selectedBusiness.logo_url ? (
                    <img
                      src={selectedBusiness.logo_url}
                      alt={selectedBusiness.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <PendingAsset size={24} label="Awaiting Hub Asset" />
                  )}
                </div>
                <div className="flex flex-col justify-center space-y-1">
                  <h1 className="text-xl font-black uppercase tracking-tight">{selectedBusiness.name}</h1>
                  <Badge className="bg-orange-500 text-white border-none text-[8px] w-fit font-black tracking-widest px-2 py-0.5">
                    PLATFORM VERIFIED
                  </Badge>
                  <p className="text-[10px] opacity-80 flex items-center gap-1.5 pt-2">
                    <MapPin size={10} className="text-orange-300" />{" "}
                    {selectedBusiness.business_locations?.[0]?.address || "Sovereign Node"}
                  </p>
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-orange-400/20 rounded-full blur-3xl" />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Live Sync Inventory
                </h3>
                <Badge
                  variant="outline"
                  className="text-[8px] border-teal-100 text-teal-600 font-black tracking-widest uppercase bg-white"
                >
                  1:1 Ratio
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {businessItems.map((item) => (
                  <Card
                    key={item.id}
                    className="overflow-hidden border-teal-50 bg-white shadow-sm rounded-2xl transition-all active:scale-95"
                  >
                    <div className="aspect-square bg-muted/10 flex items-center justify-center relative">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={24} className="text-teal-600 opacity-5" />
                      )}
                      <Button
                        size="sm"
                        className="absolute bottom-2 right-2 h-8 w-8 p-0 rounded-full bg-orange-500 hover:bg-orange-600 shadow-lg border-none"
                        onClick={() => addToCart(item)}
                      >
                        +
                      </Button>
                    </div>
                    <CardContent className="p-3">
                      <h4 className="font-bold text-[10px] line-clamp-1 uppercase text-foreground">{item.name}</h4>
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
