import { User } from '../types';
import { Navigate } from 'react-router-dom';
import { AdminPanel } from '../components/admin/AdminPanel';

interface AdminPageProps {
  user: User;
}

export function AdminPage({ user }: AdminPageProps) {
  if (!user.isAdmin) return <Navigate to="/" replace />;
  return <AdminPanel />;
}
