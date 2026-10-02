import { useEffect, useRef, type ComponentType } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { businessInPath } from './lib/businessRoutes';
import { Navbar } from './components/Navbar';
import { VendorSwitchDialog } from './components/VendorSwitchDialog';
import { InstallPrompt } from './components/InstallPrompt';
import { BottomNav } from './components/BottomNav';
import { IncomingToast } from './components/IncomingToast';
import { FollowOrderWorld } from './context/StoreCartContext';
import { lastSalesShop, useSales } from './context/SalesContext';
import { HomePage } from './pages/HomePage';
import { ProductPage } from './pages/ProductPage';
import { VendorPage } from './pages/VendorPage';
import { CartPage } from './pages/CartPage';
import { OrdersPage } from './pages/OrdersPage';
import { InvoicePage } from './pages/InvoicePage';
import { SavedInvoicePage } from './pages/SavedInvoicePage';
import { TasksPage } from './pages/TasksPage';
import { AccountPage } from './pages/AccountPage';
import { BusinessNewPage } from './pages/BusinessNewPage';
import { BusinessPage } from './pages/BusinessPage';
import { ItemFormPage } from './pages/ItemFormPage';
import { ItemsPage } from './pages/ItemsPage';
import { StoreItemsPage } from './pages/StoreItemsPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { StorePage } from './pages/StorePage';
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
 * «مبيعات» بقت أكورديون فوق أصناف المتجر (مكالمة ١ أكتوبر): لما رأس الفاتورة
 * يتفتح (المنيو، «تعديل العميل»، «فاتورة جديدة») والصفحة مش على متجر من متاجر
 * النشاط، بنروح لمتجر البيعة أو آخر متجر اتباع منه. على فاتورة متجر من متاجره
 * (/orders/:shopId) بنروح لأصناف المتجر ده نفسه. نشاط من غير متاجر ميبيعش —
 * بنوديه على بياناته يضيف متجر.
 *
 * التنقل كله من هنا: navigate قبل openDialog في نفس الدوسة كان بيوصل بعد ما
 * الأثر ده يشتغل (React Router بيعمله في transition)، فكان بيودّي على متجر تاني.
 */
function FollowSalesPanel() {
  const { dialog, closeDialog } = useSales();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const here = useRef(pathname);
  here.current = pathname;

  useEffect(() => {
    if (!dialog) return;
    const { business, editing } = dialog;
    const stores = business.premises.filter((p) => p.isStore).map((p) => p.id);
    const match = /^\/(store|orders)\/([^/]+)/.exec(here.current);
    const current = match ? decodeURIComponent(match[2]) : null;
    if (current && stores.includes(current)) {
      if (match![1] === 'orders') navigate(`/store/${current}`);
      return;
    }
    const target = [editing?.shopId, lastSalesShop(business.accountId)].find((id) => id && stores.includes(id)) ?? stores[0];
    if (target) {
      navigate(`/store/${target}`);
    } else {
      closeDialog();
      navigate(`/business/${business.accountId}`);
    }
    // بنحكم لما الأكورديون يتفتح بس — التنقل جوّاه (تغيير المتجر) مبيرجّعش
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog]);
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
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <FollowBusinessInUrl />
      <FollowOrderWorld />
      <FollowSalesPanel />
      <Navbar />
      {/* pb-12: الشريط اللي تحت ميغطّيش آخر الصفحة (للي داخل بحسابه بس) */}
      <main className={`flex-1 ${user ? 'pb-12' : ''} print:pb-0`}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/store/:storeId" element={<StorePage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/vendor/:id" element={<VendorPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:shopId" element={<InvoicePage />} />
          <Route path="/invoice/:orderId" element={<SavedInvoicePage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/account" element={<AccountPage />} />
          {/* new قبل :id عشان متتقراش كـid لنشاط */}
          <Route path="/business/new" element={<BusinessNewPage />} />
          <Route path="/business/:id" element={<PerBusiness page={BusinessPage} />} />
          <Route path="/business/:accountId/items" element={<PerBusiness page={ItemsPage} />} />
          <Route path="/business/:accountId/items/new" element={<PerBusiness page={ItemFormPage} />} />
          <Route path="/business/:accountId/items/:itemId/edit" element={<PerBusiness page={ItemFormPage} />} />
          <Route path="/business/:accountId/store-items" element={<PerBusiness page={StoreItemsPage} />} />
          <Route path="/business/:accountId/employees" element={<PerBusiness page={EmployeesPage} />} />
          {/* الطلبات الواردة بقت في «مهامي» (مكالمة ٣٠ سبتمبر) — اللينك القديم بيوديها */}
          <Route path="/business/:accountId/incoming" element={<Navigate to="/tasks" replace />} />
          <Route path="/auth/wasla/callback" element={<AuthCallbackPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
      <VendorSwitchDialog />
      <InstallPrompt />
      <IncomingToast />
      <BottomNav />
    </div>
  );
}
