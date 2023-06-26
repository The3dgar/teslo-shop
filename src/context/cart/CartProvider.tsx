import { useEffect, useReducer } from 'react';
import Cookie from 'js-cookie';

import { CartContext, cartReducer } from './';
import { ICartProduct, ShippingAddress } from '@/interfaces';
import { Constans } from '@/utils';
import { COOKIE_ADDRESS_KEY, COOKIE_CART_KEY } from '@/utils/constans';

// todo: mover esto

export interface CartState {
  isLoaded: boolean;
  cart: ICartProduct[];
  numberOfItems: number;
  subTotal: number;
  taxRate: number;
  total: number;
  shippingAddress: ShippingAddress;
}

const defaultShippingAddress = {
  firstName: '',
  lastName: '',
  address: '',
  address2: '',
  zip: '',
  city: '',
  country: 'ARG',
  phone: '',
};

const CART_INITIAL_STATE: CartState = {
  isLoaded: false,
  cart: [],
  numberOfItems: 0,
  subTotal: 0,
  taxRate: 0,
  total: 0,
  shippingAddress: defaultShippingAddress,
};

interface Props {
  children: React.ReactNode;
}
export const CartProvider = ({ children }: Props) => {
  const [state, dispatch] = useReducer(cartReducer, CART_INITIAL_STATE);

  useEffect(() => {
    try {
      const cookieProducts = Cookie.get(COOKIE_CART_KEY)
        ? JSON.parse(Cookie.get(COOKIE_CART_KEY)!)
        : [];

      dispatch({ type: 'Cart loadCart from cookies', payload: cookieProducts });
    } catch (error) {
      dispatch({ type: 'Cart loadCart from cookies', payload: [] });
    }
  }, []);

  useEffect(() => {
    if (!Cookie.get(COOKIE_ADDRESS_KEY)) return;

    const shippingAddress = JSON.parse(Cookie.get(COOKIE_ADDRESS_KEY)!);

    dispatch({
      type: 'Cart loadAddress from cookies',
      payload: shippingAddress,
    });
  }, []);

  useEffect(() => {
    if (state.cart.length) {
      Cookie.set(COOKIE_CART_KEY, JSON.stringify(state.cart));
    }
  }, [state.cart]);

  useEffect(() => {
    const numberOfItems = state.cart.reduce(
      (prev, current) => current.quantity + prev,
      0
    );

    const subTotal = state.cart.reduce(
      (prev, current) => current.price * current.quantity + prev,
      0
    );

    const taxRate = subTotal * Constans.TAX_RATE;

    const orderSummary = {
      numberOfItems,
      subTotal,
      taxRate,
      total: subTotal + taxRate,
    };

    dispatch({ type: 'Cart updateOrderSummary', payload: orderSummary });
  }, [state.cart]);

  const addProduct = (product: ICartProduct) => {
    // verificar siexiste un producto con ese id
    const productsInCart = state.cart.some((p) => p._id === product._id);

    if (!productsInCart) {
      return dispatch({
        type: 'Cart updateProducts',
        payload: [...state.cart, product],
      });
    }

    // tiene la misma talla?
    const productInCartWithDifferentSize = state.cart.some(
      (p) => p._id === product._id && p.size === product.size
    );

    if (!productInCartWithDifferentSize) {
      return dispatch({
        type: 'Cart updateProducts',
        payload: [...state.cart, product],
      });
    }

    // es una talla que ya existe
    const updatedProducts = state.cart.map((p) => {
      if (p._id !== product._id) return p;
      if (p.size !== product.size) return p;

      // actualizar la cantidad
      p.quantity += product.quantity;
      return p;
    });

    dispatch({ type: 'Cart updateProducts', payload: updatedProducts });
  };

  const updateCartQuantity = (product: ICartProduct) => {
    dispatch({ type: 'Cart updateQuantity', payload: product });
  };

  const removeCartProduct = (product: ICartProduct) => {
    dispatch({ type: 'Cart removeProduct', payload: product });
  };

  const updateShippingAddress = (payload: ShippingAddress) => {
    Cookie.set(COOKIE_ADDRESS_KEY, JSON.stringify(payload));
    // todo: guardar en base de datos

    dispatch({ type: 'Cart updateAddress', payload });
  };

  return (
    <CartContext.Provider
      value={{
        ...state,
        addProduct,
        updateCartQuantity,
        removeCartProduct,
        updateShippingAddress,
      }}>
      {children}
    </CartContext.Provider>
  );
};
