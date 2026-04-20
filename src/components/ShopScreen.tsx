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
  ChevronRight,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

// Updated Business type to include the new logo_url column
type Business = Database["public"]["Tables"]["businesses"]["Row"] & {
  business_locations?: Database["public"]["Tables"]["business_locations"]["Row"][];
  ar_experiences?: Database["public"]["Tables"]["ar_experiences"]["Row"][];
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

  const categories = ["All", "Restaurant", "Coffee Shop", "Electronics Store", "Gym", "Retail"];

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
      const { data, error } = await supabase
        .from("businesses")
        .select("*, business_locations(*), ar_experiences(*)")
        .order("name");

      if (error) throw error;
      setBusinesses(data || []);
      setFilteredBusinesses(data || []);
    } catch (error) {
      console.error("Error loading marketplace:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async (businessId: string) => {
    try {
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
    } catch (error) {
      console.error("Error fetching inventory:", error);
    }
  };

  const handleSelectBusiness = (business: Business) => {
    setSelectedBusiness(business);
    fetchInventory(business.id);
  };

  const addToCart = (item: Item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.item.id === item.id);
      if (existing) return prev.map((i) => (i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { item, quantity: 1 }];
    });
    toast({ title: "Added to Cart", description: `${item.name} added to your order.` });
  };

  const getFallbackIcon = (type: string) => {
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
      <div className="space-y-4 p-4">
        <div className="h-24 bg-muted animate-pulse rounded-xl" />
      </div>
    );

  return (
    <div className="space-y-6 pb-20 bg-white min-h-screen">
      {!selectedBusiness ? (
        <>
          {/* Marketplace Header */}
          <div className="px-4 space-y-4 pt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search IDIA Enterprises..."
                className="pl-10 h-12 bg-white/80 border-teal-100 shadow-sm rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => (
                <Badge
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  className={`cursor-pointer px-4 py-1.5 whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-white text-muted-foreground border-teal-50"
                  }`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </div>

          {/* High-Density Square Grid */}
          <div className="px-4 overflow-y-auto max-h-[460px] scrollbar-hide">
            <div className="grid grid-cols-4 gap-x-3 gap-y-6">
              {filteredBusinesses.map((business) => (
                <div
                  key={business.id}
                  className="flex flex-col items-center gap-1.5 cursor-pointer group active:scale-95 transition-transform"
                  onClick={() => handleSelectBusiness(business)}
                >
                  {/* Square Logo Container */}
                  <div className="aspect-square w-full rounded-2xl bg-white border border-teal-50 flex items-center justify-center shadow-sm overflow-hidden group-hover:border-teal-300 transition-all">
                    {business.logo_url ? (
                      <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
                    ) : (
                      getFallbackIcon(business.business_type)
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-foreground text-center truncate w-full px-0.5">
                    {business.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Detailed Business Interface / Live Inventory */
        <div className="animate-in slide-in-from-right duration-300">
          <div className="p-4 bg-white sticky top-0 z-10 border-b flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setSelectedBusiness(null)}>
              <X className="h-6 w-6" />
            </Button>
            <h2 className="font-bold text-lg">{selectedBusiness.name}</h2>
            <div className="relative">
              <ShoppingCart className="h-6 w-6 text-teal-600" />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {cart.reduce((a, b) => a + b.quantity, 0)}
                </span>
              )}
            </div>
          </div>

          <div className="p-4 space-y-6">
            {/* Enterprise Card featuring IDIA Hub Image */}
            <div className="rounded-3xl bg-gradient-to-br from-teal-500 to-teal-700 p-6 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-black">{selectedBusiness.name}</h1>
                    <p className="opacity-80 text-sm">{selectedBusiness.business_type}</p>
                  </div>
                  {/* Prominent Logo Display */}
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center overflow-hidden border border-white/20">
                    {selectedBusiness.logo_url ? (
                      <img
                        src={selectedBusiness.logo_url}
                        alt={selectedBusiness.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      getFallbackIcon(selectedBusiness.business_type)
                    )}
                  </div>
                </div>
                <div className="space-y-2 text-sm opacity-90 border-t border-white/10 pt-4">
                  <p className="flex items-center gap-2 font-medium">
                    <MapPin size={16} className="text-teal-200" /> {selectedBusiness.business_locations?.[0]?.address}
                  </p>
                  <p className="flex items-center gap-2 font-medium">
                    <Clock size={16} className="text-teal-200" /> Open • Database Synchronized
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">
                Live Inventory Grid
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {businessItems.map((item) => (
                  <Card
                    key={item.id}
                    className="overflow-hidden border-teal-50 group hover:border-teal-200 transition-all shadow-sm rounded-2xl"
                  >
                    <div className="aspect-square bg-muted flex items-center justify-center relative">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="h-8 w-8 text-muted-foreground/30" />
                      )}
                      <Button
                        size="sm"
                        variant="default"
                        className="absolute bottom-2 right-2 h-8 w-8 p-0 rounded-full bg-teal-600 hover:bg-teal-700 shadow-md"
                        onClick={() => addToCart(item)}
                      >
                        +
                      </Button>
                    </div>
                    <CardContent className="p-3 space-y-1">
                      <h4 className="font-bold text-xs line-clamp-1">{item.name}</h4>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-teal-700">${item.price.toFixed(2)}</span>
                        <Badge
                          variant="secondary"
                          className="text-[8px] h-4 bg-teal-50 text-teal-600 border-none uppercase"
                        >
                          {item.type}
                        </Badge>
                      </div>
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
