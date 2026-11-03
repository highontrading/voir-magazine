import { Chrome } from '@/components/site/Chrome';
import { NotFoundBody } from '@/components/site/NotFoundBody';
import './(site)/site.css';

export default function RootNotFound() {
  return (
    <Chrome>
      <NotFoundBody />
    </Chrome>
  );
}
