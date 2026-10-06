import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addCartItem, fetchCart, removeCartItem, updateCartItem } from "../api/cart";
import { normalizeApiError } from "../api/client";

// Backend (apps/cart/services.py) remains the authority on totals - this
// hook never computes a price or subtotal itself, it only displays what
// Django returned (roadmap Phase 6: "Never trust totals calculated only
// in React").
export function useCart() {
  const queryClient = useQueryClient();

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: fetchCart,
  });

  function invalidate(data) {
    queryClient.setQueryData(["cart"], data);
  }

  const addItem = useMutation({
    mutationFn: addCartItem,
    onSuccess: (data) => {
      invalidate(data);
      toast.success(data.message ?? "Added to cart.");
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });

  const updateItem = useMutation({
    mutationFn: ({ itemId, quantity }) => updateCartItem(itemId, quantity),
    onSuccess: invalidate,
    onError: (error) => toast.error(normalizeApiError(error).message),
  });

  const removeItem = useMutation({
    mutationFn: removeCartItem,
    onSuccess: (data) => {
      invalidate(data);
      toast.success(data.message ?? "Item removed.");
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });

  return {
    cart: cartQuery.data,
    isLoading: cartQuery.isLoading,
    addItem: (productId, quantity) => addItem.mutate({ productId, quantity }),
    updateItem: (itemId, quantity) => updateItem.mutate({ itemId, quantity }),
    removeItem: (itemId) => removeItem.mutate(itemId),
  };
}
