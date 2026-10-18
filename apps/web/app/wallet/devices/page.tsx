import { serverGet } from '@/lib/server';
import type { Device } from '@/lib/types';
import { Devices } from './Devices';

export default async function DevicesPage() {
  return <Devices initial={await serverGet<Device[]>('/web/wallet/devices')} />;
}
