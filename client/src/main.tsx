import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ThemeProvider } from './context/ThemeContext';
import { CartProvider } from './context/CartContext';
import { StoreCartProvider } from './context/StoreCartContext';
import { AuthProvider } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import { SellerProvider } from './context/SellerContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ThemeProvider>
        <AuthProvider>
          <LocationProvider>
            <CartProvider>
              <StoreCartProvider>
                <SellerProvider>
                  <App />
                </SellerProvider>
              </StoreCartProvider>
            </CartProvider>
          </LocationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);

/*
 * service worker للتثبيت بس — مبيخزّنش حاجة (شوف public/sw.js).
 * في النسخة المنشورة بس: في التطوير كان هيقف بين Vite والمتصفح من غير فايدة.
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // الموقع بيشتغل عادي من غيره — بس إشعار التثبيت ممكن ميظهرش على متصفحات قديمة
    });
  });
}
