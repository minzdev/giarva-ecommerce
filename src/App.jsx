import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import CustomerRoute from './components/CustomerRoute';

const Home = React.lazy(() => import('./pages/Home'));
const ProductDetail = React.lazy(() => import('./pages/ProductDetail'));
const Cart = React.lazy(() => import('./pages/Cart'));
const Checkout = React.lazy(() => import('./pages/Checkout'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Orders = React.lazy(() => import('./pages/Orders'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));

// Admin pages
const AdminLayout = React.lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const AdminOrders = React.lazy(() => import('./pages/admin/AdminOrders'));
const AdminProducts = React.lazy(() => import('./pages/admin/AdminProducts'));
const AdminUsers = React.lazy(() => import('./pages/admin/AdminUsers'));
const AdminReviews = React.lazy(() => import('./pages/admin/AdminReviews'));

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-6xl font-bold text-ocean-500 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-6">Halaman tidak ditemukan.</p>
      <a href="/" className="text-sm font-medium text-white bg-ocean-500 hover:bg-ocean-600 px-4 py-2 rounded-md transition-colors">
        Kembali ke Beranda
      </a>
    </div>
  );
}

// Hide navbar on admin pages
function AppContent() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <>
      {!isAdmin && <Navbar />}
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><LoadingSpinner size="lg" /></div>}>
        <Routes>
          {/* Public routes — admin will be redirected to /admin */}
          <Route path="/" element={<CustomerRoute><Home /></CustomerRoute>} />
          <Route path="/product/:id" element={<CustomerRoute><ProductDetail /></CustomerRoute>} />
          <Route path="/cart" element={<CustomerRoute><Cart /></CustomerRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<CustomerRoute><Register /></CustomerRoute>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected customer routes — admin will be redirected to /admin */}
          <Route path="/checkout" element={<CustomerRoute><ProtectedRoute><Checkout /></ProtectedRoute></CustomerRoute>} />
          <Route path="/profile" element={<CustomerRoute><ProtectedRoute><Profile /></ProtectedRoute></CustomerRoute>} />
          <Route path="/orders" element={<CustomerRoute><ProtectedRoute><Orders /></ProtectedRoute></CustomerRoute>} />

          {/* Admin routes */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="reviews" element={<AdminReviews />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <HelmetProvider>
            <ToastProvider>
              <AppContent />
            </ToastProvider>
          </HelmetProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
