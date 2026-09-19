import { useEffect, useRef, type ComponentType } from 'react';
import { Route, Routes, useLocation, useParams } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { businessInPath } from './lib/businessRoutes';
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
import { ItemFormPage } from './pages/ItemFormPage';
import { ItemsPage } from './pages/ItemsPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';

/** نرجع لأعلى الصفحة عند تغيير المسار — من غير الفلاتر عشان متقفزش مع كل فلتر */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/**
 * لو اتفتحت صفحة نشاط من أنشطة المستخدم (لينك، مفضلة، زرار الرجوع) وهو مختار
 * حساب تاني، الحساب بيتحوّل للنشاط ده — عشان الصفحة واللي فوق يفضلوا متطابقين.
 *
 * بيتحرك مع اللينك بس، مش مع الحساب: تغيير الحساب من المنيو بيغيّر اللينك
 * بنفسه، ولو كان بيتحرك مع الحساب كان هيرجّعه للنشاط القديم قبل ما اللينك يلحق.
 */
function FollowBusinessInUrl() {
  const { pathname } = useLocation();
  const { businesses, selectedBusiness, selectBusiness } = useAuth();
  const inUrl = businessInPath(pathname);
  const mine = inUrl !== null && businesses.some((b) => b.accountId === inUrl);
  const selected = selectedBusiness?.accountId ?? null;
  const latest = useRef({ selected, selectBusiness });

  // قبل اللي تحته — الـeffects بتشتغل بالترتيب
  useEffect(() => {
    latest.current = { selected, selectBusiness };
  });
  useEffect(() => {
    if (mine && latest.current.selected !== inUrl) latest.current.selectBusiness(inUrl);
  }, [inUrl, mine]);
  return null;
}

/**
 * صفحة نشاط بتبدأ من جديد لما النشاط اللي في اللينك يتغيّر (تغيير الحساب من
 * المنيو) — من غير كده كانت هتفضل شايلة حاجات القديم: أصنافه، أو صنف بيتكتب.
 */
function PerBusiness({ page: Page }: { page: ComponentType }) {
  const { id, accountId } = useParams();
  return <Page key={accountId ?? id} />;
}

export function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <FollowBusinessInUrl />
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
          <Route path="/business/:id" element={<PerBusiness page={BusinessPage} />} />
          <Route path="/business/:accountId/items" element={<PerBusiness page={ItemsPage} />} />
          <Route path="/business/:accountId/items/new" element={<PerBusiness page={ItemFormPage} />} />
          <Route path="/business/:accountId/items/:itemId/edit" element={<PerBusiness page={ItemFormPage} />} />
          <Route path="/auth/wasla/callback" element={<AuthCallbackPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
      <VendorSwitchDialog />
      <InstallPrompt />
    </div>
  );
}
