import { TrusteesCard } from './TrusteesCard';
import { KeyholdersCard } from './KeyholdersCard';
import { BeyondCircleCard } from './BeyondCircleCard';
import { useContactsStats } from '../../hooks/useContactsStats';

/** Left column of the People page: trustees, keyholders, Beyond Circle. */
export function PeopleSidebar() {
  const { trustees, keyholders, notify_circle, contacts } = useContactsStats();
  return (
    <aside
      className="flex flex-col gap-5 lg:h-full lg:justify-between lg:gap-4"
      aria-label="People overview"
    >
      <TrusteesCard trustees={trustees} />
      <KeyholdersCard keyholders={keyholders} />
      <BeyondCircleCard count={notify_circle.total_recipients} total={contacts.total} />
    </aside>
  );
}
