import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { VendorSwitchDialog } from './components/VendorSwitchDialog';
import { InstallPrompt } from './components/InstallPrompt';
import { HomePage } from './pages/HomePage';
import { ProductPage } from './pages/ProductPage';
import { VendorPage } from './pages/VendorPage';
import { CartPage } from './pages/CartPage';
import { OrdersPage } from './pages/OrdersPage';
import { AccountPage } from './pages/AccountPage';
import { BusinessNewPage } from './pages/BusinessNewPage';
import { BusinessPage } from './pages/BusinessPage';
import { ItemNewPage } from './pages/ItemNewPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';

/** نرجع لأعلى الصفحة عند تغيير المسار — من غير الفلاتر عشان متقفزش مع كل فلتر */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/vendor/:id" element={<VendorPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/account" element={<AccountPage />} />
          {/* new قبل :id عشان متتقراش كـid لنشاط */}
          <Route path="/business/new" element={<BusinessNewPage />} />
          <Route path="/business/:id" element={<BusinessPage />} />
          <Route path="/business/:accountId/items/new" element={<ItemNewPage />} />
          <Route path="/auth/wasla/callback" element={<AuthCallbackPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
      <VendorSwitchDialog />
      <InstallPrompt />
    </div>
  );
}
