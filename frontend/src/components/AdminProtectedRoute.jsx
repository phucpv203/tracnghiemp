import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../App';

export default function AdminProtectedRoute({ children }) {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/trang-chu" replace />;
  return children;
}
