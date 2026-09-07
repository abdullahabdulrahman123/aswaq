import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { VendorSwitchDialog } from './components/VendorSwitchDialog';
import { HomePage } from './pages/HomePage';
import { ProductPage } from './pages/ProductPage';
import { VendorPage } from './pages/VendorPage';
import { CartPage } from './pages/CartPage';
import { AccountPage } from './pages/AccountPage';
import { BusinessNewPage } from './pages/BusinessNewPage';
import { BusinessesPage } from './pages/BusinessesPage';
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
          <Route path="/account" element={<AccountPage />} />
          <Route path="/business/new" element={<BusinessNewPage />} />
          <Route path="/businesses" element={<BusinessesPage />} />
          <Route path="/auth/wasla/callback" element={<AuthCallbackPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
      <VendorSwitchDialog />
    </div>
  );
}
