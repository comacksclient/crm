import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function Home() {
  const session = await auth();

  if (!session || !session.user) {
    redirect('/login');
  }

  const role = (session.user as any).role;

  if (role === 'ADMIN') {
    redirect('/dashboard/admin');
  } else if (role === 'MANAGER') {
    redirect('/dashboard/manager');
  } else {
    redirect('/queue');
  }
}
