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

export default function ProtectedRoute({ children }) {
  const { user } = useContext(AuthContext);
  
  // Nếu không có user, redirect về /login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Nếu có user, render children (trang được bảo vệ)
  return children;
}
