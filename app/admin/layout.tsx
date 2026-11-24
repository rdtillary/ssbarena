import { AdminNav } from '@/components/AdminNav';

// Tab bar on every /admin page: Manage | User Data | Creator Partnerships.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminNav />
      {children}
    </>
  );
}
