/**
 * ProtectedRoute - Component bảo vệ route
 * 
 * Nếu user chưa đăng nhập (không có trong AuthContext),
 * sẽ redirect về trang login.
 * 
 * Sử dụng cho các route cần đăng nhập như:
 * - /trang-chu
 * - /study/:courseId
 * - /exam/:courseId
 */
import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { Skeleton } from './ui';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);
  
  // Đang loading auth state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 dark:bg-slate-900">
        <div className="w-full max-w-md space-y-4 p-8">
          <Skeleton variant="title" />
          <Skeleton variant="text" count={3} />
        </div>
      </div>
    );
  }

  // Nếu không có user, redirect về /login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Nếu có user, render children (trang được bảo vệ)
  return children;
}