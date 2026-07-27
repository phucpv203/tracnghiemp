import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { Skeleton } from './ui';

export default function AdminProtectedRoute({ children }) {
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

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/trang-chu" replace />;
  return children;
}