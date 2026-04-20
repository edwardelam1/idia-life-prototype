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
  Utensils,
  Coffee,
  ShoppingBag,
  Package,
  Store,
  X,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState<{ item: Item; quantity: number }[]>([]);
  const { toast } = useToast();

  const categories = ["All", "Restaurant", "Coffee Shop", "Retail", "Gym"];

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

  const handleSelectBusiness = (business: Business) => {
    setSelectedBusiness(business);
    fetchInventory(business.id);
  };

  const getBusinessIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "restaurant":
        return <Utensils className="h-6 w-6 text-orange-500" />;
      case "coffee shop":
        return <Coffee className="h-6 w-6 text-orange-500" />;
      default:
        return <Store className="h-6 w-6 text-teal-600" />;
    }
  };

  if (loading)
    return (
      <div className="p-8 animate-pulse flex gap-4">
        <div className="w-16 h-16 bg-muted rounded-2xl" />
        <div className="w-16 h-16 bg-muted rounded-2xl" />
      </div>
    );

  return (
    <div className="space-y-6 bg-white min-h-screen pb-20">
      {!selectedBusiness ? (
        <div className="space-y-6 animate-fade-in">
          {/* Marketplace Search */}
          <div className="px-4 pt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search Downtown Chicago..."
                className="pl-10 h-11 bg-muted/30 border-none rounded-xl text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* High-Density Scaling Container (Horizontal Scroll) */}
          <div className="space-y-3">
            <div className="px-4 flex justify-between items-center">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Nearby Enterprises
              </h2>
              <Badge variant="outline" className="text-[9px] border-teal-100 text-teal-700">
                {filteredBusinesses.length} Active
              </Badge>
            </div>

            <ScrollArea className="w-full whitespace-nowrap px-4">
              <div className="flex w-max space-x-5 pb-4">
                {filteredBusinesses.map((business) => (
                  <div
                    key={business.id}
                    className="flex flex-col items-center gap-2 group cursor-pointer active:scale-95 transition-transform"
                    onClick={() => handleSelectBusiness(business)}
                  >
                    {/* Square Icon (Company Logo Placeholder) */}
                    <div className="w-16 h-16 rounded-2xl bg-muted/40 border border-muted flex items-center justify-center overflow-hidden group-hover:border-teal-500 group-hover:bg-white transition-all shadow-sm">
                      {getBusinessIcon(business.business_type)}
                    </div>
                    <p className="text-[10px] font-bold text-foreground text-center max-w-[64px] truncate">
                      {business.name}
                    </p>
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          {/* Categories */}
          <div className="px-4 space-y-3">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Sovereign Categories
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {categories.slice(1).map((cat) => (
                <div
                  key={cat}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                    selectedCategory === cat
                      ? "bg-teal-600 text-white border-teal-600 shadow-md"
                      : "bg-white text-teal-800 border-teal-50"
                  }`}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? "All" : cat)}
                >
                  {cat}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Detailed Business Interface */
        <div className="animate-in slide-in-from-bottom duration-300">
          <div className="p-4 flex items-center justify-between sticky top-0 bg-white z-10 border-b border-muted">
            <Button variant="ghost" size="icon" onClick={() => setSelectedBusiness(null)}>
              <X className="h-5 w-5" />
            </Button>
            <h2 className="font-black text-sm uppercase tracking-tighter">{selectedBusiness.name}</h2>
            <div className="relative">
              <ShoppingCart className="h-5 w-5 text-teal-600" />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </div>
          </div>

          <div className="p-4 space-y-6">
            {/* Enterprise Business Card */}
            <Card className="bg-gradient-to-br from-teal-500 to-teal-700 text-white border-none rounded-[2rem] overflow-hidden shadow-xl">
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                    {getBusinessIcon(selectedBusiness.business_type)}
                  </div>
                  <Badge className="bg-orange-500 hover:bg-orange-600 border-none text-[9px]">IDIA VERIFIED</Badge>
                </div>
                <div>
                  <CardTitle className="text-2xl font-black leading-none mb-1">{selectedBusiness.name}</CardTitle>
                  <p className="text-[10px] uppercase font-bold text-teal-100 tracking-widest">
                    {selectedBusiness.business_type}
                  </p>
                </div>
                <div className="pt-2 border-t border-white/10 flex justify-between items-center text-[11px] font-medium opacity-90">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={12} /> {selectedBusiness.business_locations?.[0]?.address || "Downtown"}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Star size={12} className="fill-orange-400 text-orange-400" /> 4.9
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest">Live Inventory</h3>
                <span className="text-[9px] text-muted-foreground">1:1 Database Sync</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {businessItems.map((item) => (
                  <Card key={item.id} className="border-muted bg-muted/10 rounded-2xl overflow-hidden group">
                    <div className="aspect-square bg-muted/40 flex items-center justify-center relative">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="object-cover w-full h-full" />
                      ) : (
                        <Package size={24} className="text-muted-foreground/30" />
                      )}
                      <Button
                        size="sm"
                        className="absolute bottom-2 right-2 h-7 w-7 rounded-full bg-white text-teal-600 shadow-sm hover:bg-teal-600 hover:text-white border-none p-0"
                        onClick={() => addToCart(item)}
                      >
                        +
                      </Button>
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] font-black text-foreground truncate">{item.name}</p>
                      <p className="text-xs font-black text-teal-600">${item.price.toFixed(2)}</p>
                    </div>
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
