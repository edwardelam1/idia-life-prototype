import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

type Business = Database["public"]["Tables"]["businesses"]["Row"] & {
  business_locations?: Database["public"]["Tables"]["business_locations"]["Row"][];
  ar_experiences?: Database["public"]["Tables"]["ar_experiences"]["Row"][];
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
    toast({ title: "Added to Cart", description: `${item.name} added to your IDIA order.` });
  };

  const getBusinessIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "restaurant":
        return <Utensils className="h-6 w-6 text-orange-500" />;
      case "coffee shop":
        return <Coffee className="h-6 w-6 text-orange-500" />;
      case "electronics store":
        return <Package className="h-6 w-6 text-teal-500" />;
      case "gym":
        return <Sparkles className="h-6 w-6 text-teal-500" />;
      default:
        return <Store className="h-6 w-6 text-muted-foreground" />;
    }
  };

  if (loading)
    return (
      <div className="space-y-4 animate-pulse p-4">
        <div className="h-32 bg-muted rounded-xl" />
        <div className="h-32 bg-muted rounded-xl" />
      </div>
    );

  return (
    <div className="space-y-6 pb-20 bg-white min-h-screen">
      {/* Marketplace Header */}
      {!selectedBusiness ? (
        <>
          <div className="px-4 space-y-4 pt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search IDIA Enterprises..."
                className="pl-10 h-12 bg-white/80 backdrop-blur-sm border-teal-100 shadow-sm"
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
                      ? "bg-teal-600"
                      : "bg-white text-muted-foreground border-teal-50 hover:border-teal-200"
                  }`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </div>

          {/* Scalable Square Icon Grid: 4 tiles across, 4 tiles height visible */}
          <div className="px-4 overflow-y-auto max-h-[440px] scrollbar-hide">
            <div className="grid grid-cols-4 gap-x-3 gap-y-6">
              {filteredBusinesses.map((business) => (
                <div
                  key={business.id}
                  className="flex flex-col items-center gap-1.5 cursor-pointer group active:scale-95 transition-transform"
                  onClick={() => handleSelectBusiness(business)}
                >
                  <div className="aspect-square w-full rounded-2xl bg-white border border-teal-50 flex items-center justify-center shadow-sm group-hover:border-teal-200 transition-all overflow-hidden">
                    {getBusinessIcon(business.business_type)}
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
        /* Business Detail View / Business Card */
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
            <div className="rounded-3xl bg-gradient-to-br from-teal-500 to-teal-700 p-6 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-black">{selectedBusiness.name}</h1>
                    <p className="opacity-80 text-sm">{selectedBusiness.business_type}</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                    {getBusinessIcon(selectedBusiness.business_type)}
                  </div>
                </div>
                <div className="space-y-2 text-sm opacity-90">
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> {selectedBusiness.business_locations?.[0]?.address}
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Open • Until 9:00 PM
                  </p>
                </div>
                <div className="flex gap-4 pt-2">
                  <div className="text-center">
                    <p className="text-xs opacity-70">Loyalty</p>
                    <p className="font-bold">Platinum</p>
                  </div>
                  <div className="text-center border-l border-white/20 pl-4">
                    <p className="text-xs opacity-70">Rating</p>
                    <p className="font-bold">4.9/5</p>
                  </div>
                </div>
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            </div>

            <Tabs defaultValue="shop" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-teal-50/50">
                <TabsTrigger value="shop">Live Inventory</TabsTrigger>
                <TabsTrigger value="about">Info</TabsTrigger>
              </TabsList>

              <TabsContent value="shop" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  {businessItems.map((item) => (
                    <Card
                      key={item.id}
                      className="overflow-hidden border-teal-50 group hover:border-teal-200 transition-all"
                    >
                      <div className="h-24 bg-muted flex items-center justify-center">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="h-8 w-8 text-muted-foreground/30" />
                        )}
                      </div>
                      <CardContent className="p-3 space-y-2">
                        <div>
                          <h4 className="font-bold text-sm line-clamp-1">{item.name}</h4>
                          <p className="text-[10px] text-muted-foreground uppercase">{item.type}</p>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-black text-teal-700">${item.price.toFixed(2)}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0 border-teal-200 text-teal-700"
                            onClick={() => addToCart(item)}
                          >
                            +
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopScreen;
