'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import {
  OperationalDataSurface,
  OperationalDesktopData,
  OperationalEmptyState,
  OperationalMobileDataCard,
  OperationalMobileDataList,
  OperationalMobileField,
} from '@/components/workspace/operational-primitives';
import { deriveDeliveryDistribution } from '@/modules/delivery/delivery-distribution';
import { deriveDeliveryReadiness } from '@/modules/delivery/delivery-readiness';

import {
  DistributionStatus,
  type DeliveryGuestRowClient,
  formatDeliveryTime,
} from './native-guest-delivery-center-shared';

function activityCopy(row: DeliveryGuestRowClient) {
  const truth = deriveDeliveryDistribution(row);
  const contactAt = formatDeliveryTime(truth.contactRecordedAt);
  if (contactAt) return `Dihubungi ${contactAt} · catatan owner`;
  const preparedAt = formatDeliveryTime(truth.initialHandoffPreparedAt);
  if (preparedAt) return `Disiapkan ${preparedAt} · belum dianggap terkirim`;
  return truth.nextStepLabel;
}

export function DeliveryDistributionData({
  allVisibleSelected,
  filteredRows,
  projectId,
  renderOverflow,
  renderRowActions,
  rows,
  selectedVisibleIds,
  toggleAllVisible,
  toggleSelected,
}: {
  allVisibleSelected: boolean;
  filteredRows: DeliveryGuestRowClient[];
  projectId: string;
  renderOverflow: (row: DeliveryGuestRowClient, view: 'desktop' | 'mobile') => ReactNode;
  renderRowActions: (row: DeliveryGuestRowClient, view: 'desktop' | 'mobile') => ReactNode;
  rows: DeliveryGuestRowClient[];
  selectedVisibleIds: string[];
  toggleAllVisible: () => void;
  toggleSelected: (guestId: string) => void;
}) {
  return (
    <OperationalDataSurface>
      {rows.length === 0 ? (
        <OperationalEmptyState
          action={
            <Link
              className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
              href={`/dashboard/${projectId}/guests`}
            >
              Kelola Tamu
            </Link>
          }
          description="Tambahkan dan rapikan data tamu sebelum menyiapkan Undangan Pribadi."
          title="Belum ada tamu yang disiapkan."
        />
      ) : filteredRows.length === 0 ? (
        <OperationalEmptyState
          description="Ubah pencarian atau filter untuk melihat status pembagian tamu lain."
          title="Tidak ada tamu yang sesuai."
        />
      ) : (
        <>
          <OperationalDesktopData label="Tabel pembagian manual Undangan Pribadi">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="bg-seraya-canvas text-seraya-text-muted text-xs font-semibold tracking-[0.06em] uppercase">
                <tr>
                  <th className="w-12 px-3 py-2.5">
                    <input
                      aria-label="Pilih semua tamu pada hasil aktif"
                      checked={allVisibleSelected}
                      className="accent-seraya-action-primary size-4"
                      onChange={toggleAllVisible}
                      type="checkbox"
                    />
                  </th>
                  <th className="px-3 py-2.5">Tamu</th>
                  <th className="px-3 py-2.5">WhatsApp</th>
                  <th className="px-3 py-2.5">Status pembagian</th>
                  <th className="px-3 py-2.5">Aktivitas owner</th>
                  <th className="px-3 py-2.5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-seraya-border-default bg-seraya-surface divide-y">
                {filteredRows.map((row) => (
                  <tr className="hover:bg-seraya-soft/45" key={row.guestId}>
                    <td className="px-3 py-3 align-top">
                      <input
                        aria-label={`Pilih ${row.displayName}`}
                        checked={selectedVisibleIds.includes(row.guestId)}
                        className="accent-seraya-action-primary size-4"
                        onChange={() => toggleSelected(row.guestId)}
                        type="checkbox"
                      />
                    </td>
                    <td className="px-3 py-3 align-top">
                      <p className="text-seraya-text-primary font-semibold">{row.displayName}</p>
                      {row.groupLabel ? (
                        <p className="text-seraya-text-muted mt-0.5 text-xs leading-5">
                          {row.groupLabel}
                        </p>
                      ) : null}
                    </td>
                    <td className="text-seraya-text-secondary px-3 py-3 align-top">
                      {row.maskedWhatsAppNumber ?? 'Belum ada nomor'}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <DistributionStatus row={row} />
                    </td>
                    <td className="text-seraya-text-secondary px-3 py-3 align-top text-xs leading-5">
                      {activityCopy(row)}
                    </td>
                    <td className="px-3 py-3 text-right align-top">
                      {renderRowActions(row, 'desktop')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </OperationalDesktopData>

          <OperationalMobileDataList label="Daftar pembagian manual Undangan Pribadi">
            {filteredRows.map((row) => (
              <OperationalMobileDataCard
                identity={
                  <div className="flex min-w-0 items-start gap-3">
                    <input
                      aria-label={`Pilih ${row.displayName}`}
                      checked={selectedVisibleIds.includes(row.guestId)}
                      className="accent-seraya-action-primary mt-1 size-4 shrink-0"
                      onChange={() => toggleSelected(row.guestId)}
                      type="checkbox"
                    />
                    <div className="min-w-0">
                      <p className="text-seraya-text-primary leading-5 font-semibold">
                        {row.displayName}
                      </p>
                      {row.groupLabel ? (
                        <p className="text-seraya-text-muted mt-0.5 text-xs leading-5">
                          {row.groupLabel}
                        </p>
                      ) : null}
                    </div>
                  </div>
                }
                key={row.guestId}
                status={
                  <div className="flex items-start gap-2">
                    <DistributionStatus row={row} showDetail={false} />
                    {deriveDeliveryReadiness(row).isReadyToDistribute
                      ? renderOverflow(row, 'mobile')
                      : null}
                  </div>
                }
              >
                <p className="text-seraya-text-muted mt-3 text-xs leading-5">
                  {activityCopy(row)}
                </p>
                <dl data-operational-mobile-fields>
                  <OperationalMobileField
                    label="WhatsApp"
                    value={row.maskedWhatsAppNumber ?? 'Belum ada'}
                  />
                  <OperationalMobileField
                    align="end"
                    label="RSVP"
                    value={row.rsvpStatus === 'pending' ? 'Belum merespons' : row.rsvpStatus === 'attending' ? 'Hadir' : 'Tidak hadir'}
                  />
                  <OperationalMobileField
                    label="Langkah berikutnya"
                    value={deriveDeliveryDistribution(row).nextStepLabel}
                  />
                </dl>
                <div className="border-seraya-border-default mt-3 border-t pt-3">
                  {renderRowActions(row, 'mobile')}
                </div>
              </OperationalMobileDataCard>
            ))}
          </OperationalMobileDataList>
        </>
      )}
    </OperationalDataSurface>
  );
}
